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
  planCohortMovement,
  ENTERING_EXPIRY_DAYS,
  type ReviewExpiryFact,
  type ScoreChangeFact,
  type CohortMovementFact,
} from "@/lib/notifications/staleness/generators";
import { collapseToDigest } from "@/lib/notifications/staleness/digest";
import { readLedgerEntry, writeLedgerEntry } from "@/lib/notifications/staleness/ledgerStore";
import { ledgerKey } from "@/lib/notifications/staleness/ledger";
import { firmCohortKeyForBoundary, vendorCohortKeyForBoundary } from "@/lib/benchmarks";
import { quarterKeyFor } from "@/lib/benchmarkArtifact";

/**
 * 16b — staleness sweep runner. Gate on the flag, gather DB facts under a
 * per-run query budget (E8), run the pure generators, collapse a recipient's
 * fired drafts into at most one weekly digest, then write through the B1 store
 * while advancing each item's send-ledger. Deterministic — no LLM. Hard no-op
 * when the flag is off.
 *
 * Wired generators: (1) own-module Aging/Stale, (2) product-review month-10,
 * (3) score-change (firm alignment-index snapshot delta), (4) cohort movement
 * (counts-only peers-reassessed-this-quarter, never identities — slice 2b/C1).
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

/**
 * (4) cohort movement is COUNTS-ONLY, never identities: how many OTHER companies
 * in the recipient's cohort re-assessed this quarter = the cohort's this-quarter
 * count minus the recipient's own company, floored at 0.
 */
export function peersReassessedInCohort(cohortReassessedThisQuarter: number, selfReassessed: boolean): number {
  return Math.max(0, cohortReassessedThisQuarter - (selfReassessed ? 1 : 0));
}

/**
 * (3) score-change, vendor side (C2). Vendors have no firm-level maturity
 * snapshot — only per-product ProductMaturitySnapshot rows. The honest vendor
 * "index over time" is the mean of each product's NEWEST snapshot vs the mean of
 * each product's SECOND-newest. Fires only when at least one product carries a
 * prior round (else priorScore is null → no delta → silent). latestId is a
 * stable signature so a re-run is quiet until a genuinely newer round lands.
 */
export function vendorIndexFromProductSnapshots(
  snaps: Array<{ productId: string; score: number; computedAt: Date }>
): { latestSubmissionId: string | null; newScore: number | null; priorScore: number | null } {
  const byProduct = new Map<string, { score: number; computedAt: Date }[]>();
  for (const s of snaps) {
    const arr = byProduct.get(s.productId) ?? [];
    arr.push({ score: s.score, computedAt: s.computedAt });
    byProduct.set(s.productId, arr);
  }
  const newests: number[] = [];
  const priors: number[] = [];
  let latestMs = -Infinity;
  for (const rows of byProduct.values()) {
    rows.sort((a, b) => b.computedAt.getTime() - a.computedAt.getTime());
    if (rows[0]) {
      newests.push(rows[0].score);
      latestMs = Math.max(latestMs, rows[0].computedAt.getTime());
    }
    if (rows[1]) priors.push(rows[1].score);
  }
  if (newests.length === 0) return { latestSubmissionId: null, newScore: null, priorScore: null };
  const mean = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) / xs.length);
  return {
    latestSubmissionId: `vendor-index:${new Date(latestMs).toISOString()}`,
    newScore: mean(newests),
    priorScore: priors.length > 0 ? mean(priors) : null,
  };
}

/**
 * Did the recipient acknowledge this generator's most recent alert? `notes` is
 * createdAt-desc, so the FIRST note matching any of the prefixes is the most
 * recent relevant alert. C3 (digest-ack refinement): a generator's alert may go
 * out either as its own single OR collapsed into a weekly digest — so reading the
 * digest that carried it counts as acknowledgment (else the nag hard-stop keeps
 * counting a generator the recipient already saw in a digest). Pass the
 * generator prefix AND the digest prefix.
 */
export function ackFor(
  notes: Array<{ kind: string; readAt: Date | null }>,
  prefixes: string[]
): boolean {
  const latest = notes.find((n) => prefixes.some((p) => n.kind.startsWith(p)));
  return Boolean(latest && latest.readAt);
}

type Gathered = {
  moduleTargets: StalenessTarget[];
  reviewFacts: ReviewExpiryFact[];
  scoreFacts: ScoreChangeFact[];
  cohortFacts: CohortMovementFact[];
  companiesScanned: number;
};

/** Per-recipient cohort stub, finalized after the whole cohort's count is known. */
type CohortStub = {
  recipientUserId: string;
  companyId: string;
  companyName: string;
  audience: StalenessAudience;
  cohortKey: string;
  selfReassessed: boolean;
  acknowledgedSinceLast: boolean;
  ledger: Awaited<ReturnType<typeof readLedgerEntry>>;
};

async function gather(nowMs: number): Promise<Gathered> {
  const productModules = await prisma.surveyModule.findMany({
    where: { key: { in: [FIRM_PRODUCT_MODULE_KEY, VENDOR_PRODUCT_MODULE_KEY] } },
    select: { id: true, key: true },
  });
  const productModuleIdByKey = new Map(productModules.map((m) => [m.key, m.id]));

  const companies = await prisma.company.findMany({
    where: { type: { in: [CompanyType.FIRM, CompanyType.VENDOR] } },
    select: { id: true, name: true, type: true, dataBoundary: true },
    orderBy: { createdAt: "asc" },
    take: MAX_COMPANIES_PER_RUN,
  });

  const moduleTargets: StalenessTarget[] = [];
  const reviewFacts: ReviewExpiryFact[] = [];
  const scoreFacts: ScoreChangeFact[] = [];
  const enteringExpiryBefore = new Date(nowMs - ENTERING_EXPIRY_DAYS * 86_400_000);
  const notExpiredAfter = new Date(nowMs - 365 * 86_400_000);

  // (4) cohort movement — counts-only, NEVER identities. A company "re-assessed
  // this quarter" if its newest submission lands in the current calendar quarter.
  // Cohort = coarse demo/real pool per company type (firmCohortKeyForBoundary).
  const now = new Date(nowMs);
  const quarterStartMs = Date.UTC(now.getUTCFullYear(), Math.floor(now.getUTCMonth() / 3) * 3, 1);
  const quarterKey = quarterKeyFor(now);
  const cohortReassessedCount = new Map<string, number>();
  const cohortStubs: CohortStub[] = [];

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

    // (3) score-change: the firm's alignment-index snapshot delta, or — for a
    // vendor — its product-maturity index (mean of products' newest vs prior
    // snapshot; C2). Both feed the SAME generator on the SAME governed spine.
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
    } else {
      const vendorProducts = await prisma.product.findMany({
        where: { companyId: company.id, active: true },
        select: { id: true },
      });
      const productIds = vendorProducts.map((p) => p.id);
      if (productIds.length > 0) {
        const snaps = await prisma.productMaturitySnapshot.findMany({
          where: { productId: { in: productIds } },
          orderBy: { computedAt: "desc" },
          select: { productId: true, score: true, computedAt: true },
        });
        const idx = vendorIndexFromProductSnapshots(snaps);
        latestSubmissionId = idx.latestSubmissionId;
        newScore = idx.newScore;
        priorScore = idx.priorScore;
      }
    }

    // (4) cohort membership + this-quarter reassessment (counts only).
    const cohortKey =
      audience === "vendor"
        ? vendorCohortKeyForBoundary(company.dataBoundary)
        : firmCohortKeyForBoundary(company.dataBoundary);
    const selfReassessed = newestSubmissionMs >= quarterStartMs && newestSubmissionMs <= nowMs;
    if (selfReassessed) {
      cohortReassessedCount.set(cohortKey, (cohortReassessedCount.get(cohortKey) ?? 0) + 1);
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
      // C3: a read weekly digest acknowledges every generator it collapsed.
      const digestPrefix = `AUTO_${auu}_DIGEST_`;
      const commonBase = {
        recipientUserId: user.id,
        companyId: company.id,
        companyName: company.name,
        audience,
      };

      moduleTargets.push({
        ...commonBase,
        newestSubmissionMs,
        acknowledgedSinceLast: ackFor(notes, [`AUTO_${auu}_STALENESS_`, digestPrefix]),
        ledger: await readLedgerEntry(itemKey(`staleness:${audience}`, company.id, user.id)),
      });
      reviewFacts.push({
        ...commonBase,
        reviewsEnteringExpiry,
        acknowledgedSinceLast: ackFor(notes, [`AUTO_${auu}_REVIEW_EXPIRY`, digestPrefix]),
        ledger: await readLedgerEntry(itemKey(`review:${audience}`, company.id, user.id)),
      });
      scoreFacts.push({
        ...commonBase,
        latestSubmissionId,
        newScore,
        priorScore,
        acknowledgedSinceLast: ackFor(notes, [`AUTO_${auu}_SCORE_CHANGE`, digestPrefix]),
        ledger: await readLedgerEntry(itemKey(`score:${audience}`, company.id, user.id)),
      });
      cohortStubs.push({
        ...commonBase,
        cohortKey,
        selfReassessed,
        acknowledgedSinceLast: ackFor(notes, [`AUTO_${auu}_COHORT_MOVEMENT`, digestPrefix]),
        ledger: await readLedgerEntry(itemKey(`cohort:${audience}`, company.id, user.id)),
      });
    }
  }

  // Finalize cohort facts now the whole cohort's reassessment count is known:
  // peers = cohort total this quarter minus the recipient's own company (counts only).
  const cohortFacts: CohortMovementFact[] = cohortStubs.map((stub) => ({
    recipientUserId: stub.recipientUserId,
    companyId: stub.companyId,
    companyName: stub.companyName,
    audience: stub.audience,
    quarterKey,
    peersReassessed: peersReassessedInCohort(
      cohortReassessedCount.get(stub.cohortKey) ?? 0,
      stub.selfReassessed
    ),
    acknowledgedSinceLast: stub.acknowledgedSinceLast,
    ledger: stub.ledger,
  }));

  return { moduleTargets, reviewFacts, scoreFacts, cohortFacts, companiesScanned: companies.length };
}

export async function runStalenessSweep(nowMs: number = Date.now()): Promise<StalenessSweepSummary> {
  if (!isStalenessAlertsEnabled()) {
    return NOOP_SUMMARY;
  }

  const { moduleTargets, reviewFacts, scoreFacts, cohortFacts, companiesScanned } = await gather(nowMs);

  const drafts: StalenessDraft[] = [
    ...planStaleness(moduleTargets, nowMs).drafts,
    ...planReviewExpiry(reviewFacts, nowMs),
    ...planScoreChange(scoreFacts, nowMs),
    ...planCohortMovement(cohortFacts, nowMs),
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
