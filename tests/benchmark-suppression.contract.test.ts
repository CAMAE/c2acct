import { describe, expect, it } from "vitest";
import {
  evaluateBenchmarkSuppression,
  evaluateBenchmarkSuppressionByCount,
  MIN_CONTRIBUTORS,
  MAX_CONTRIBUTOR_SHARE,
} from "@/lib/benchmarkSuppression";

/**
 * Governance Phase 2 (A2/B10) — benchmark suppression safe harbor. Locks the
 * two guards: n≥5 distinct contributors AND no single contributor >25% share.
 * Suppress (remove the number), not just label.
 */

describe("benchmark suppression — minimum-n safe harbor", () => {
  it("suppresses fewer than 5 contributors (insufficient_contributors)", () => {
    for (let n = 0; n < MIN_CONTRIBUTORS; n += 1) {
      const result = evaluateBenchmarkSuppressionByCount(n);
      expect(result.suppressed).toBe(true);
      expect(result.reason).toBe("insufficient_contributors");
      expect(result.contributorCount).toBe(n);
    }
  });

  it("publishes exactly 5 equal contributors (one-firm-one-vote clears both guards)", () => {
    const result = evaluateBenchmarkSuppressionByCount(MIN_CONTRIBUTORS);
    expect(result.suppressed).toBe(false);
    expect(result.reason).toBeNull();
    expect(result.contributorCount).toBe(5);
    // 1/5 = 0.20 ≤ 0.25 — equal-weight cuts of n≥5 always clear dominance.
    expect(result.maxContributorShare).toBeCloseTo(0.2, 5);
    expect(result.maxContributorShare).toBeLessThanOrEqual(MAX_CONTRIBUTOR_SHARE);
  });

  it("suppresses on single-contributor dominance even with enough contributors", () => {
    // 6 contributors but one supplies 10 of 14 data points (71%).
    const result = evaluateBenchmarkSuppression([10, 1, 1, 1, 1, 0]);
    expect(result.contributorCount).toBe(5); // the 0-weight contributor drops out
    // Only 5 positive contributors AND dominance — contributor count is checked
    // first, but the dominance case is exercised below with n≥5.
    const dominant = evaluateBenchmarkSuppression([10, 1, 1, 1, 1, 1]);
    expect(dominant.contributorCount).toBe(6);
    expect(dominant.suppressed).toBe(true);
    expect(dominant.reason).toBe("contributor_dominance");
    expect(dominant.maxContributorShare).toBeGreaterThan(MAX_CONTRIBUTOR_SHARE);
  });

  it("publishes a well-distributed cut with enough contributors", () => {
    const result = evaluateBenchmarkSuppression([3, 3, 2, 2, 2, 2]); // max share 3/14 ≈ 0.214
    expect(result.suppressed).toBe(false);
    expect(result.reason).toBeNull();
    expect(result.maxContributorShare).toBeLessThanOrEqual(MAX_CONTRIBUTOR_SHARE);
  });

  it("count rule takes precedence over dominance when both fail", () => {
    // 3 contributors, one dominant — reports the count reason (harder floor).
    const result = evaluateBenchmarkSuppression([10, 1, 1]);
    expect(result.suppressed).toBe(true);
    expect(result.reason).toBe("insufficient_contributors");
  });

  it("ignores zero/negative weights when counting contributors", () => {
    const result = evaluateBenchmarkSuppression([1, 1, 1, 1, 1, 0, -2]);
    expect(result.contributorCount).toBe(5);
    expect(result.suppressed).toBe(false);
  });

  it("empty cut is suppressed with zero share (no divide-by-zero)", () => {
    const result = evaluateBenchmarkSuppression([]);
    expect(result.suppressed).toBe(true);
    expect(result.reason).toBe("insufficient_contributors");
    expect(result.maxContributorShare).toBe(0);
  });
});

describe("vendor alignment bundle wires the suppression decision from distinct-firm sampleSize", () => {
  it("suppresses below 5 contributing firms; publishes at 6", async () => {
    const { buildVendorAlignmentInsightBundle } = await import("@/lib/vendorAlignmentInsightEngine");
    const base = { submissionCount: 0, moduleAggregates: [], capabilityAggregates: [], questionClusters: [] };

    const thin = buildVendorAlignmentInsightBundle({ ...base, sampleSize: 3 });
    expect(thin.benchmarkSuppression.suppressed).toBe(true);
    expect(thin.benchmarkSuppression.reason).toBe("insufficient_contributors");

    const grounded = buildVendorAlignmentInsightBundle({ ...base, sampleSize: 6 });
    expect(grounded.benchmarkSuppression.suppressed).toBe(false);
  });
});
