import { decideSignatureSend, ledgerKey, type StalenessLedgerEntry } from "@/lib/notifications/staleness/ledger";
import type { StalenessAudience, StalenessDraft } from "@/lib/notifications/staleness/plan";

/**
 * 16b slice 2 — generators (2) review-expiry, (3) score-change, (4) cohort
 * movement. PURE planners over gathered facts, all funnelling through the same
 * signature-based send-ledger (fires only when the signature changes; nag
 * hard-stop applies) and the shared StalenessDraft shape (so the weekly digest
 * can collapse across generators). Governance rails hold: no guilt, state the
 * consequence, counts-only for cohort movement (never identities), every draft
 * aiGenerated.
 */

/** Month 10 of a 12-month census window — the pre-expiry warning threshold. */
export const ENTERING_EXPIRY_DAYS = 300;

export type GeneratorFactBase = {
  recipientUserId: string;
  companyId: string;
  companyName: string;
  audience: StalenessAudience;
  acknowledgedSinceLast: boolean;
  ledger: StalenessLedgerEntry | null;
};

// ── (2) review-expiry ────────────────────────────────────────────────────────
export type ReviewExpiryFact = GeneratorFactBase & {
  /** Count of the entity's product reviews entering the refresh window (month 10+). */
  reviewsEnteringExpiry: number;
};

export function planReviewExpiry(facts: ReviewExpiryFact[], nowMs: number): StalenessDraft[] {
  const nowIso = new Date(nowMs).toISOString();
  const drafts: StalenessDraft[] = [];
  for (const f of facts) {
    // Constant signature while any reviews are in the window: fire once, stay
    // quiet, and reset when the batch clears (count → 0 → null signature).
    const signature = f.reviewsEnteringExpiry > 0 ? "expiring" : null;
    const decision = decideSignatureSend({ signature, entry: f.ledger, acknowledgedSinceLast: f.acknowledgedSinceLast, nowIso });
    if (!decision.send) continue;
    const n = f.reviewsEnteringExpiry;
    drafts.push({
      recipientUserId: f.recipientUserId,
      audience: f.audience,
      generator: "review",
      kind: `AUTO_${f.audience.toUpperCase()}_REVIEW_EXPIRY`,
      title: n === 1 ? "A product review is nearing its refresh window" : "Product reviews are nearing their refresh window",
      body:
        `${n} of your product ${n === 1 ? "review is" : "reviews are"} past month 10 of the 12-month window. ` +
        `After 12 months a review stops counting toward benchmarks, so refreshing keeps that evidence live.`,
      ctaLabel: f.audience === "firm" ? "Review your products" : "Refresh product evidence",
      ctaHref: f.audience === "firm" ? "/firm/product-assessments" : "/vendor/product-assessment",
      sourceType: "Company",
      sourceId: f.companyId,
      aiGenerated: true,
      ledgerItemKey: ledgerKey(`review:${f.audience}`, f.companyId, f.recipientUserId),
      nextEntry: decision.nextEntry,
    });
  }
  return drafts;
}

// ── (3) score-change ─────────────────────────────────────────────────────────
export type ScoreChangeFact = GeneratorFactBase & {
  /** The newest submission's id + resulting index, or null if none/no change. */
  latestSubmissionId: string | null;
  newScore: number | null;
  priorScore: number | null;
};

export function planScoreChange(facts: ScoreChangeFact[], nowMs: number): StalenessDraft[] {
  const nowIso = new Date(nowMs).toISOString();
  const drafts: StalenessDraft[] = [];
  for (const f of facts) {
    // Fire once per new submission that actually moved the score. Signature ties
    // to the submission id, so a re-run is silent and only a genuinely new
    // submission speaks again.
    const moved = f.latestSubmissionId != null && f.newScore != null && f.newScore !== f.priorScore;
    const signature = moved ? `sub:${f.latestSubmissionId}` : null;
    const decision = decideSignatureSend({ signature, entry: f.ledger, acknowledgedSinceLast: f.acknowledgedSinceLast, nowIso });
    if (!decision.send) continue;
    const delta = (f.newScore as number) - (f.priorScore ?? (f.newScore as number));
    const dir = delta > 0 ? "up" : delta < 0 ? "down" : "unchanged";
    drafts.push({
      recipientUserId: f.recipientUserId,
      audience: f.audience,
      generator: "score",
      kind: `AUTO_${f.audience.toUpperCase()}_SCORE_CHANGE`,
      title: "Your alignment index updated",
      body:
        dir === "unchanged"
          ? `Your latest submission is in. Your alignment index held at ${f.newScore}.`
          : `Your latest submission is in. Your alignment index moved ${dir} to ${f.newScore} (${delta > 0 ? "+" : ""}${delta}).`,
      ctaLabel: "See what changed",
      ctaHref: f.audience === "firm" ? "/firm/insights" : "/vendor/product-insight",
      sourceType: "Company",
      sourceId: f.companyId,
      aiGenerated: true,
      ledgerItemKey: ledgerKey(`score:${f.audience}`, f.companyId, f.recipientUserId),
      nextEntry: decision.nextEntry,
    });
  }
  return drafts;
}

// ── (4) cohort movement ──────────────────────────────────────────────────────
export type CohortMovementFact = GeneratorFactBase & {
  /** Quarter key, e.g. "2026-Q3". */
  quarterKey: string;
  /** Count of OTHER firms in the cohort that re-assessed this quarter (counts only). */
  peersReassessed: number;
};

export function planCohortMovement(facts: CohortMovementFact[], nowMs: number): StalenessDraft[] {
  const nowIso = new Date(nowMs).toISOString();
  const drafts: StalenessDraft[] = [];
  for (const f of facts) {
    // Signature = quarter + count, so it fires when the count first crosses > 0
    // and again if more peers move within the quarter, then resets next quarter.
    const signature = f.peersReassessed > 0 ? `${f.quarterKey}:${f.peersReassessed}` : null;
    const decision = decideSignatureSend({ signature, entry: f.ledger, acknowledgedSinceLast: f.acknowledgedSinceLast, nowIso });
    if (!decision.send) continue;
    const n = f.peersReassessed;
    drafts.push({
      recipientUserId: f.recipientUserId,
      audience: f.audience,
      generator: "cohort",
      // Counts only — Pro-safe. Never names the peers (identities are Elite/never).
      kind: `AUTO_${f.audience.toUpperCase()}_COHORT_MOVEMENT`,
      title: n === 1 ? "A peer in your cohort re-assessed" : "Peers in your cohort re-assessed",
      body:
        `${n} ${n === 1 ? "firm" : "firms"} in your benchmark cohort re-assessed this quarter. ` +
        `Benchmarks are relative, so your position can shift as peers refresh — your own numbers are unchanged.`,
      ctaLabel: "See your peer position",
      ctaHref: f.audience === "firm" ? "/firm/insights" : "/vendor/alignment-insights",
      sourceType: "Company",
      sourceId: f.companyId,
      aiGenerated: true,
      ledgerItemKey: ledgerKey(`cohort:${f.audience}`, f.companyId, f.recipientUserId),
      nextEntry: decision.nextEntry,
    });
  }
  return drafts;
}
