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

export type VendorProductScoreChange = {
  subjectId: string;
  subjectLabel: string;
  latestSubmissionId: string;
  newScore: number;
  priorScore: number;
};

/**
 * (3) score-change, vendor side (C2 — Mythos ruling). PER-PRODUCT singles, not a
 * synthetic vendor index (A3: every displayed number must be some reader's — the
 * mean-of-products index is nowhere else in the product). For each of the
 * vendor's products with >=2 ProductMaturitySnapshot rounds, emit a change from
 * newest vs second-newest, keyed by the newest snapshot id. Products with <2
 * rounds are honest-empty (no fact). The digest law batches multiple products.
 */
export function vendorProductScoreChanges(
  snaps: Array<{ id: string; productId: string; score: number; computedAt: Date }>,
  productNameById: Map<string, string>
): VendorProductScoreChange[] {
  const byProduct = new Map<string, { id: string; score: number; computedAt: Date }[]>();
  for (const s of snaps) {
    const arr = byProduct.get(s.productId) ?? [];
    arr.push({ id: s.id, score: s.score, computedAt: s.computedAt });
    byProduct.set(s.productId, arr);
  }
  const changes: VendorProductScoreChange[] = [];
  for (const [productId, rows] of byProduct) {
    rows.sort((a, b) => b.computedAt.getTime() - a.computedAt.getTime());
    if (rows.length < 2) continue; // honest-empty until a product has a prior round
    changes.push({
      subjectId: productId,
      subjectLabel: productNameById.get(productId) ?? "A product",
      latestSubmissionId: rows[0].id,
      newScore: Math.round(rows[0].score),
      priorScore: Math.round(rows[1].score),
    });
  }
  return changes;
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

    // (3) score-change: the firm's alignment-index snapshot delta (one subject),
    // or — for a vendor — one PER-PRODUCT subject from its product-maturity
    // snapshots (C2, Mythos ruling: per-product singles, not a synthetic index).
    // Both feed the SAME generator on the SAME governed spine; the digest batches
    // a vendor's multiple product changes.
    type ScoreSubject = {
      subjectId: string | null;
      subjectLabel: string | null;
      latestSubmissionId: string | null;
      newScore: number | null;
      priorScore: number | null;
    };
    const scoreSubjects: ScoreSubject[] = [];
    if (audience === "firm") {
      const snaps = await prisma.firmMaturitySnapshot.findMany({
        where: { companyId: company.id },
        orderBy: { computedAt: "desc" },
        take: 2,
        select: { id: true, score: true },
      });
      if (snaps[0]) {
        scoreSubjects.push({
          subjectId: null,
          subjectLabel: null,
          latestSubmissionId: snaps[0].id,
          newScore: Math.round(snaps[0].score),
          priorScore: snaps[1] ? Math.round(snaps[1].score) : null,
        });
      }
    } else {
      const vendorProducts = await prisma.product.findMany({
        where: { companyId: company.id, active: true },
        select: { id: true, name: true },
      });
      const productIds = vendorProducts.map((p) => p.id);
      if (productIds.length > 0) {
        const snaps = await prisma.productMaturitySnapshot.findMany({
          where: { productId: { in: productIds } },
          orderBy: { computedAt: "desc" },
          select: { id: true, productId: true, score: true, computedAt: true },
        });
        const nameById = new Map(vendorProducts.map((p) => [p.id, p.name]));
        for (const change of vendorProductScoreChanges(snaps, nameById)) {
          scoreSubjects.push(change);
        }
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
      for (const subj of scoreSubjects) {
        const subjectNs = subj.subjectId ? `:${subj.subjectId}` : "";
        scoreFacts.push({
          ...commonBase,
          latestSubmissionId: subj.latestSubmissionId,
          newScore: subj.newScore,
          priorScore: subj.priorScore,
          subjectId: subj.subjectId,
          subjectLabel: subj.subjectLabel,
          acknowledgedSinceLast: ackFor(notes, [`AUTO_${auu}_SCORE_CHANGE`, digestPrefix]),
          ledger: await readLedgerEntry(itemKey(`score:${audience}${subjectNs}`, company.id, user.id)),
        });
      }
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
