/**
 * Benchmark minimum-n suppression (Governance Phase 2, A2/B10).
 *
 * The compensation-survey "safe harbor" rule, adopted verbatim: a cross-firm /
 * peer benchmark cut is NOT PUBLISHED — it is SUPPRESSED, not merely labelled —
 * when either guard fails:
 *
 *   1. Too few contributors: distinct contributors < MIN_CONTRIBUTORS (5).
 *   2. Single-contributor dominance: any one contributor supplies more than
 *      MAX_CONTRIBUTOR_SHARE (25%) of the cut's weight.
 *
 * This is STRICTER than `lib/confidenceBands.ts`, which only *labels* thin data.
 * Suppression removes the number and renders an "insufficient peer data" state.
 * The two compose: a cut that survives suppression may still carry a thin/emerging
 * confidence band.
 *
 * `weights` is the per-contributor weight — the number of independent data points
 * each distinct contributor supplied to the cut (usually 1 for one-firm-one-vote
 * aggregates; >1 for response-count aggregates where a single firm can answer many
 * questions). Equal-weight cuts with n≥5 always clear the dominance rule
 * (1/5 = 0.20 ≤ 0.25), so the safe harbor holds by construction.
 *
 * See docs/elite-sprint/AGGREGATION-METHODOLOGY.md §5.
 */

/** Minimum distinct contributors before a benchmark cut may be published. */
export const MIN_CONTRIBUTORS = 5;

/** No single contributor may exceed this share of a cut's weight. */
export const MAX_CONTRIBUTOR_SHARE = 0.25;

export type BenchmarkSuppressionReason =
  | "insufficient_contributors"
  | "contributor_dominance";

export type BenchmarkSuppression = {
  /** True when the cut must NOT be published (render the insufficient-data state). */
  suppressed: boolean;
  /** Why it was suppressed (null when published). Contributors takes precedence. */
  reason: BenchmarkSuppressionReason | null;
  /** Distinct contributors feeding the cut. */
  contributorCount: number;
  /** Largest single-contributor share of the cut's weight (0–1). */
  maxContributorShare: number;
};

/** User-facing copy for a suppressed benchmark cut. */
export const INSUFFICIENT_PEER_DATA_COPY =
  "Insufficient peer data — this benchmark needs at least " +
  `${MIN_CONTRIBUTORS} contributing firms, with no single firm dominating, ` +
  "before we publish it.";

/** Short label variant for chips/eyebrows. */
export const INSUFFICIENT_PEER_DATA_LABEL = "Insufficient peer data";

/**
 * Evaluate a benchmark cut from its per-contributor weights.
 *
 * @param weights one entry per DISTINCT contributor, each the count of data
 *   points that contributor supplied. Zero/negative entries are ignored. Pass an
 *   array of 1s for one-firm-one-vote cuts.
 */
export function evaluateBenchmarkSuppression(weights: readonly number[]): BenchmarkSuppression {
  const positive = weights.filter((w) => w > 0);
  const contributorCount = positive.length;
  const total = positive.reduce((sum, w) => sum + w, 0);
  const maxContributorShare = total > 0 ? Math.max(...positive) / total : 0;

  if (contributorCount < MIN_CONTRIBUTORS) {
    return {
      suppressed: true,
      reason: "insufficient_contributors",
      contributorCount,
      maxContributorShare,
    };
  }
  if (maxContributorShare > MAX_CONTRIBUTOR_SHARE) {
    return {
      suppressed: true,
      reason: "contributor_dominance",
      contributorCount,
      maxContributorShare,
    };
  }
  return { suppressed: false, reason: null, contributorCount, maxContributorShare };
}

/**
 * Convenience for one-firm-one-vote cuts where only the distinct-contributor
 * count is known (each contributor weighted equally). The dominance rule reduces
 * to the count rule here, so this is exactly `evaluateBenchmarkSuppression` over
 * `n` ones.
 */
export function evaluateBenchmarkSuppressionByCount(contributorCount: number): BenchmarkSuppression {
  return evaluateBenchmarkSuppression(Array.from({ length: Math.max(0, contributorCount) }, () => 1));
}
