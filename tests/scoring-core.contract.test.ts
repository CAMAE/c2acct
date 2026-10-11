import { describe, expect, it } from "vitest";
import {
  ALIGNMENT_INDEX_MIN_MODULES,
  DISPLAY_TIER_MIN_N,
  RANK_MIN_N,
  alignmentIndex,
  alignmentIndexLabel,
  alignmentIndexState,
  displayTierFor,
  percentileRank,
  rankFromTop,
  rankShownFor,
} from "@/lib/assessmentCore";
import { applyFreshnessToBand, resolveConfidence } from "@/lib/confidenceBands";
import { readFreshness } from "@/lib/freshness";
import { leverDestination, leverPhrase, positionPhrase, rowsForTier } from "@/lib/eliteInsightsV2";

/**
 * scoring-core (R63): the one scoring module's rules as the methodology page
 * states them. Display tiers by n (ruling 13), rank at 10 (ruling 27), the
 * three-module index floor (ruling 15), the Stale step (ruling 19) at days 364,
 * 365 and 366, and the lever wording (walk leftover 7b).
 */

describe("display tiers by n (ruling 13) and the rank gate (ruling 27)", () => {
  it("under 5 nothing; 5 to 9 median; 10 to 29 quartiles; 30 and up percentile", () => {
    expect(DISPLAY_TIER_MIN_N).toEqual({ median: 5, quartiles: 10, percentile: 30 });
    expect([0, 4, 5, 9, 10, 29, 30, 106].map(displayTierFor)).toEqual([
      "none", "none", "median", "median", "quartiles", "quartiles", "percentile", "percentile",
    ]);
  });

  it("exact rank only at 10 or more", () => {
    expect(RANK_MIN_N).toBe(10);
    expect([5, 9, 10, 30].map(rankShownFor)).toEqual([false, false, true, true]);
  });

  it("rankFromTop and percentileRank are the stored-run definitions", () => {
    expect(percentileRank([10, 20, 30, 40, 50], 30)).toBe(60);
    expect(rankFromTop(100, 13)).toBe(1);
    expect(rankFromTop(8, 13)).toBe(13);
    expect(rankFromTop(54, 13)).toBe(7);
    expect(rankFromTop(50, 0)).toBe(0);
  });

  it("rowsForTier withholds what the tier does not allow", () => {
    const row = { key: "m", label: "M", p25: 50, p50: 60, p75: 70, p90: 80, score: 66, percentile: 61 };
    expect(rowsForTier([row], "percentile")[0]).toEqual(row);
    expect(rowsForTier([row], "quartiles")[0]).toEqual({ ...row, percentile: null });
    expect(rowsForTier([row], "median")[0]).toEqual({ ...row, percentile: null, p25: null, p75: null, p90: null });
  });

  it("positionPhrase names the percentile, the quartile word, or the side of the median", () => {
    expect(positionPhrase({ tier: "percentile", percentile: 72, score: 68, peerMedian: 65 })).toBe("72nd percentile");
    expect(positionPhrase({ tier: "quartiles", percentile: 72, score: 68, peerMedian: 65 })).toBe("upper middle");
    expect(positionPhrase({ tier: "quartiles", percentile: 80, score: 68, peerMedian: 65 })).toBe("top quartile");
    expect(positionPhrase({ tier: "median", percentile: 72, score: 68, peerMedian: 65 })).toBe("at or above the peer median (65)");
    expect(positionPhrase({ tier: "median", percentile: 30, score: 50, peerMedian: 65 })).toBe("below the peer median (65)");
  });
});

describe("the alignment index needs three final modules (ruling 15)", () => {
  it("equal weight, rounded once; Partial under the floor", () => {
    expect(ALIGNMENT_INDEX_MIN_MODULES).toBe(3);
    expect(alignmentIndex([81, 74, 53, 74, 60])).toBe(68);
    expect(alignmentIndex([81, 74, 53])).toBe(69);
    expect(alignmentIndex([81, 74])).toBeNull();
    expect(alignmentIndex([81, null, 53])).toBeNull();
    expect(alignmentIndexState([81, 74])).toEqual({ kind: "partial", index: null, scoredCount: 2 });
    expect(alignmentIndexLabel(alignmentIndexState([81, 74]), 5)).toBe("Partial (2 of 5 modules scored)");
    expect(alignmentIndexLabel(alignmentIndexState([null, null]), 5)).toBe("not scored yet");
    expect(alignmentIndexLabel(alignmentIndexState([81, 74, 53]), 5)).toBe("69");
  });
});

describe("Stale lowers the confidence label one step (ruling 19): clock test at days 364, 365, 366", () => {
  const now = new Date("2026-10-11T12:00:00.000Z");
  const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000);

  it("day 364 is Aging and leaves Grounded alone; days 365 and 366 are Stale and read Early signal", () => {
    expect(readFreshness(daysAgo(364), now)?.state).toBe("aging");
    expect(readFreshness(daysAgo(365), now)?.state).toBe("stale");
    expect(readFreshness(daysAgo(366), now)?.state).toBe("stale");
    expect(resolveConfidence({ n: 6, freshness: readFreshness(daysAgo(364), now)?.state })).toEqual({ band: "grounded", label: "Grounded", loweredByStale: false });
    expect(resolveConfidence({ n: 6, freshness: readFreshness(daysAgo(365), now)?.state })).toEqual({ band: "emerging", label: "Early signal", loweredByStale: true });
    expect(resolveConfidence({ n: 6, freshness: readFreshness(daysAgo(366), now)?.state })).toEqual({ band: "emerging", label: "Early signal", loweredByStale: true });
  });

  it("Early signal and No signal have no lower step; Fresh and Aging change nothing", () => {
    expect(applyFreshnessToBand("emerging", "stale")).toBe("emerging");
    expect(applyFreshnessToBand("sample_thin", "stale")).toBe("sample_thin");
    expect(applyFreshnessToBand("no_signal", "stale")).toBe("no_signal");
    expect(applyFreshnessToBand("grounded", "fresh")).toBe("grounded");
    expect(applyFreshnessToBand("grounded", "aging")).toBe("grounded");
    expect(applyFreshnessToBand("grounded", null)).toBe("grounded");
    expect(resolveConfidence({ n: 3, freshness: "stale" }).label).toBe("Early signal");
  });
});

describe("the lever names where the move lands (walk leftover 7b)", () => {
  const reading = { p50: 60, p75: 70, p90: 80 };
  it("destination from the stored distribution", () => {
    expect(leverDestination(82, reading)).toBe("top decile");
    expect(leverDestination(71, reading)).toBe("top quartile");
    expect(leverDestination(61, reading)).toBe("peer median");
    expect(leverDestination(50, reading)).toBeNull();
  });
  it("keeps you in the top decile instead of from the 90th to about the 90th", () => {
    expect(leverPhrase({ fromPercentile: 90, reaches: "top decile" })).toBe("keeps you in the top decile");
    expect(leverPhrase({ fromPercentile: 80, reaches: "top quartile" })).toBe("keeps you in the top quartile");
    expect(leverPhrase({ fromPercentile: 48, reaches: "top quartile" })).toBe("lifts you into the top quartile");
    expect(leverPhrase({ fromPercentile: 40, reaches: "peer median" })).toBe("lifts you above the peer median");
    expect(leverPhrase({ fromPercentile: 55, reaches: "peer median" })).toBe("keeps you above the peer median");
    expect(leverPhrase({ fromPercentile: 20, reaches: null })).toBe("narrows your gap to the peer top quartile");
  });
});
