import { CompanyType } from "@prisma/client";
import prisma from "@/lib/prisma";
import { FIRM_PRODUCT_MODULE_KEY } from "@/lib/firmPat";
import { VENDOR_PRODUCT_MODULE_KEY } from "@/lib/vendorPat";
import { isStalenessAlertsEnabled } from "@/lib/patAssistant/flags";
import { createNotification } from "@/lib/notifications/store";
import {
  planStaleness,
  type StalenessAudience,
  type StalenessDraft,
  type StalenessTarget,
} from "@/lib/notifications/staleness/plan";
import {
  planReviewExpiry,
  planScoreChange,
  ENTERING_EXPIRY_DAYS,
  type ReviewExpiryFact,
  type ScoreChangeFact,
} from "@/lib/notifications/staleness/generators";
import { collapseToDigest } from "@/lib/notifications/staleness/digest";
import { readLedgerEntry, writeLedgerEntry } from "@/lib/notifications/staleness/ledgerStore";
import { ledgerKey } from "@/lib/notifications/staleness/ledger";

/**
 * 16b — staleness sweep runner. Gate on the flag, gather DB facts under a
 * per-run query budget (E8), run the pure generators, collapse a recipient's
 * fired drafts into at most one weekly digest, then write through the B1 store
 * while advancing each item's send-ledger. Deterministic — no LLM. Hard no-op
 * when the flag is off.
 *
 * Wired generators: (1) own-module Aging/Stale, (2) product-review month-10,
 * (3) score-change (firm alignment-index snapshot delta). Generator (4) cohort
 * movement is built + unit-tested; its gather (cohort-peer resolution) lands in
 * slice 2b.
 */
export const MAX_COMPANIES_PER_RUN = 250;

export type StalenessSweepSummary = {
  enabled: boolean;
  companiesScanned: number;
  evaluated: number;
  fired: number;
  dispatched: number;
  created: number;
};

const NOOP_SUMMARY: StalenessSweepSummary = {
  enabled: false,
  companiesScanned: 0,
  evaluated: 0,
  fired: 0,
  dispatched: 0,
  created: 0,
};

function itemKey(namespace: string, companyId: string, recipientUserId: string): string {
  return ledgerKey(namespace, companyId, recipientUserId);
}

/** Did the recipient read the latest notification whose kind starts with prefix? */
function ackFor(
  notes: Array<{ kind: string; readAt: Date | null }>,
  prefix: string
): boolean {
  const latest = notes.find((n) => n.kind.startsWith(prefix));
  return Boolean(latest && latest.readAt);
}

type Gathered = {
  moduleTargets: StalenessTarget[];
  reviewFacts: ReviewExpiryFact[];
  scoreFacts: ScoreChangeFact[];
  companiesScanned: number;
};

async function gather(nowMs: number): Promise<Gathered> {
  const productModules = await prisma.surveyModule.findMany({
    where: { key: { in: [FIRM_PRODUCT_MODULE_KEY, VENDOR_PRODUCT_MODULE_KEY] } },
    select: { id: true, key: true },
  });
  const productModuleIdByKey = new Map(productModules.map((m) => [m.key, m.id]));

  const companies = await prisma.company.findMany({
    where: { type: { in: [CompanyType.FIRM, CompanyType.VENDOR] } },
    select: { id: true, name: true, type: true },
    orderBy: { createdAt: "asc" },
    take: MAX_COMPANIES_PER_RUN,
  });

  const moduleTargets: StalenessTarget[] = [];
  const reviewFacts: ReviewExpiryFact[] = [];
  const scoreFacts: ScoreChangeFact[] = [];
  const enteringExpiryBefore = new Date(nowMs - ENTERING_EXPIRY_DAYS * 86_400_000);
  const notExpiredAfter = new Date(nowMs - 365 * 86_400_000);

  for (const company of companies) {
    const audience: StalenessAudience = company.type === CompanyType.VENDOR ? "vendor" : "firm";

    const newest = await prisma.surveySubmission.findFirst({
      where: { companyId: company.id },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    });
    if (!newest) continue; // never assessed — nothing ages
    const newestSubmissionMs = newest.createdAt.getTime();

    // (2) product reviews entering the refresh window [month 10, 12 months).
    const productModuleId = productModuleIdByKey.get(
      audience === "vendor" ? VENDOR_PRODUCT_MODULE_KEY : FIRM_PRODUCT_MODULE_KEY
    );
    let reviewsEnteringExpiry = 0;
    if (productModuleId) {
      reviewsEnteringExpiry = await prisma.surveySubmission.count({
        where: {
          companyId: company.id,
          moduleId: productModuleId,
          createdAt: { lte: enteringExpiryBefore, gt: notExpiredAfter },
        },
      });
    }

    // (3) score-change: the two newest alignment-index snapshots (firm only —
    // the maturity snapshot IS the index over time). Vendors: slice 2b.
    let latestSubmissionId: string | null = null;
    let newScore: number | null = null;
    let priorScore: number | null = null;
    if (audience === "firm") {
      const snaps = await prisma.firmMaturitySnapshot.findMany({
        where: { companyId: company.id },
        orderBy: { computedAt: "desc" },
        take: 2,
        select: { id: true, score: true },
      });
      if (snaps[0]) {
        latestSubmissionId = snaps[0].id;
        newScore = Math.round(snaps[0].score);
        priorScore = snaps[1] ? Math.round(snaps[1].score) : null;
      }
    }

    const users = await prisma.user.findMany({
      where: { companyId: company.id },
      select: { id: true },
    });

    for (const user of users) {
      const notes = await prisma.notification.findMany({
        where: {
          recipientUserId: user.id,
          kind: { startsWith: `AUTO_${audience.toUpperCase()}_` },
        },
        orderBy: { createdAt: "desc" },
        take: 12,
        select: { kind: true, readAt: true },
      });
      const auu = audience.toUpperCase();
      const commonBase = {
        recipientUserId: user.id,
        companyId: company.id,
        companyName: company.name,
        audience,
      };

      moduleTargets.push({
        ...commonBase,
        newestSubmissionMs,
        acknowledgedSinceLast: ackFor(notes, `AUTO_${auu}_STALENESS_`),
        ledger: await readLedgerEntry(itemKey(`staleness:${audience}`, company.id, user.id)),
      });
      reviewFacts.push({
        ...commonBase,
        reviewsEnteringExpiry,
        acknowledgedSinceLast: ackFor(notes, `AUTO_${auu}_REVIEW_EXPIRY`),
        ledger: await readLedgerEntry(itemKey(`review:${audience}`, company.id, user.id)),
      });
      scoreFacts.push({
        ...commonBase,
        latestSubmissionId,
        newScore,
        priorScore,
        acknowledgedSinceLast: ackFor(notes, `AUTO_${auu}_SCORE_CHANGE`),
        ledger: await readLedgerEntry(itemKey(`score:${audience}`, company.id, user.id)),
      });
    }
  }

  return { moduleTargets, reviewFacts, scoreFacts, companiesScanned: companies.length };
}

export async function runStalenessSweep(nowMs: number = Date.now()): Promise<StalenessSweepSummary> {
  if (!isStalenessAlertsEnabled()) {
    return NOOP_SUMMARY;
  }

  const { moduleTargets, reviewFacts, scoreFacts, companiesScanned } = await gather(nowMs);

  const drafts: StalenessDraft[] = [
    ...planStaleness(moduleTargets, nowMs).drafts,
    ...planReviewExpiry(reviewFacts, nowMs),
    ...planScoreChange(scoreFacts, nowMs),
  ];

  const dispatch = collapseToDigest(drafts, nowMs);

  let created = 0;
  for (const item of dispatch) {
    const result = await createNotification({
      recipientUserId: item.recipientUserId,
      audience: item.audience,
      kind: item.kind,
      title: item.title,
      body: item.body,
      ctaLabel: item.ctaLabel,
      ctaHref: item.ctaHref,
      sourceType: item.sourceType,
      sourceId: item.sourceId,
      actorUserId: null,
      aiGenerated: true,
    });
    if (result.created) {
      created += 1;
      // Advance every collapsed item's ledger only after the row is written.
      for (const write of item.ledgerWrites) {
        await writeLedgerEntry(write.key, write.entry);
      }
    }
  }

  return {
    enabled: true,
    companiesScanned,
    evaluated: moduleTargets.length,
    fired: drafts.length,
    dispatched: dispatch.length,
    created,
  };
}
