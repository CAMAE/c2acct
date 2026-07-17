import { CompanyType } from "@prisma/client";
import prisma from "@/lib/prisma";
import { isStalenessAlertsEnabled } from "@/lib/patAssistant/flags";
import { createNotification } from "@/lib/notifications/store";
import {
  planStaleness,
  type StalenessAudience,
  type StalenessTarget,
} from "@/lib/notifications/staleness/plan";
import { ledgerKey, readLedgerEntry, writeLedgerEntry } from "@/lib/notifications/staleness/ledgerStore";

/**
 * 16b — staleness sweep runner. The single entry point the scheduled agent
 * calls: gate on the flag, gather DB facts under a per-run query budget (E8),
 * run the pure planner, then write through the B1 notification store while
 * persisting the send-ledger. Deterministic — no LLM. Hard no-op when the flag
 * is off (no DB reads, no writes).
 *
 * Idempotency is doubly guarded: the send-ledger suppresses a same-state re-run
 * in the planner, and the store's (recipient, source, kind) unique index rejects
 * a duplicate at write time. The ledger is only advanced when a row is actually
 * created, so a mid-run failure re-tries cleanly on the next sweep.
 */

/** E8 (Mythos rider 2): bound the companies scanned per run. */
export const MAX_COMPANIES_PER_RUN = 250;

export type StalenessSweepSummary = {
  enabled: boolean;
  companiesScanned: number;
  evaluated: number;
  fired: number;
  created: number;
  suppressed: number;
};

const NOOP_SUMMARY: StalenessSweepSummary = {
  enabled: false,
  companiesScanned: 0,
  evaluated: 0,
  fired: 0,
  created: 0,
  suppressed: 0,
};

/** State-independent ledger item key: one entry per (recipient, company assessment). */
function itemKey(audience: StalenessAudience, companyId: string, recipientUserId: string): string {
  return ledgerKey(`staleness:${audience}`, companyId, recipientUserId);
}

async function gatherStalenessTargets(
  nowMs: number
): Promise<{ targets: StalenessTarget[]; companiesScanned: number }> {
  void nowMs;
  const companies = await prisma.company.findMany({
    where: { type: { in: [CompanyType.FIRM, CompanyType.VENDOR] } },
    select: { id: true, name: true, type: true },
    orderBy: { createdAt: "asc" },
    take: MAX_COMPANIES_PER_RUN,
  });

  const targets: StalenessTarget[] = [];
  for (const company of companies) {
    const audience: StalenessAudience = company.type === CompanyType.VENDOR ? "vendor" : "firm";

    const newest = await prisma.surveySubmission.findFirst({
      where: { companyId: company.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    // Never assessed → no evidence to age; skip entirely (absence ≠ staleness).
    if (!newest) continue;
    const newestSubmissionMs = newest.createdAt.getTime();

    const users = await prisma.user.findMany({
      where: { companyId: company.id },
      select: { id: true },
    });
    const kindPrefix = `AUTO_${audience.toUpperCase()}_STALENESS_`;

    for (const user of users) {
      const ledger = await readLedgerEntry(itemKey(audience, company.id, user.id));
      const prior = await prisma.notification.findFirst({
        where: {
          recipientUserId: user.id,
          sourceType: "Company",
          sourceId: company.id,
          kind: { startsWith: kindPrefix },
        },
        orderBy: { createdAt: "desc" },
        select: { readAt: true },
      });
      targets.push({
        recipientUserId: user.id,
        companyId: company.id,
        companyName: company.name,
        audience,
        newestSubmissionMs,
        acknowledgedSinceLast: Boolean(prior && prior.readAt),
        ledger,
      });
    }
  }

  return { targets, companiesScanned: companies.length };
}

export async function runStalenessSweep(nowMs: number = Date.now()): Promise<StalenessSweepSummary> {
  if (!isStalenessAlertsEnabled()) {
    return NOOP_SUMMARY;
  }

  const { targets, companiesScanned } = await gatherStalenessTargets(nowMs);
  const plan = planStaleness(targets, nowMs);

  let created = 0;
  for (const draft of plan.drafts) {
    const result = await createNotification({
      recipientUserId: draft.recipientUserId,
      audience: draft.audience,
      kind: draft.kind,
      title: draft.title,
      body: draft.body,
      ctaLabel: draft.ctaLabel,
      ctaHref: draft.ctaHref,
      sourceType: draft.sourceType,
      sourceId: draft.sourceId,
      actorUserId: null,
      aiGenerated: true,
    });
    if (result.created) {
      created += 1;
      // Advance the ledger only after a real send — a failed/duplicate write
      // leaves the ledger untouched so the next run retries cleanly.
      await writeLedgerEntry(itemKey(draft.audience, draft.sourceId, draft.recipientUserId), draft.nextEntry);
    }
  }

  return {
    enabled: true,
    companiesScanned,
    evaluated: plan.evaluated,
    fired: plan.fired,
    created,
    suppressed: plan.suppressed,
  };
}
