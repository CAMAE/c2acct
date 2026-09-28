import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { sharesUtility, slotFitDelta, splitCandidatesForSlot, SANDBOX_LANE_LABELS } from "@/lib/sandboxLanes";
import type { ProductFitDimensionScore } from "@/lib/productFitDimensions";

/**
 * Sandbox utility lanes (Cam's rulings):
 *  - a candidate enters the fits-slot lane ("Firm-reviewed alternatives for this slot",
 *    box 3f item J) iff it shares ≥1 utilityKey with the
 *    lifted piece;
 *  - rank within lane by slot-fit delta over the SHARED (both-have-signal)
 *    dimensions;
 *  - no overlap → whole-firm lane only;
 *  - never hide candidates (whole-firm always = every candidate).
 */

function dims(pairs: Array<[string, number | null]>): ProductFitDimensionScore[] {
  return pairs.map(([key, score]) => ({
    key: key as ProductFitDimensionScore["key"],
    title: key,
    score,
    sampleSize: score === null ? 0 : 3,
  }));
}

describe("sharesUtility", () => {
  it("is true iff at least one utilityKey overlaps", () => {
    expect(sharesUtility(["a", "b"], ["b", "c"])).toBe(true);
    expect(sharesUtility(["a"], ["x", "y"])).toBe(false);
    expect(sharesUtility([], ["a"])).toBe(false);
  });
});

describe("slotFitDelta", () => {
  it("compares only the dimensions both products carry signal on", () => {
    const piece = { dimensionScores: dims([["workflow-fit", 60], ["reporting-visibility", 50], ["adoption-ease", null]]) };
    const cand = { dimensionScores: dims([["workflow-fit", 80], ["reporting-visibility", 60], ["adoption-ease", 90]]) };
    // shared-signal dims: workflow-fit (60→80), reporting-visibility (50→60) → mean cand 70, mean piece 55 → +15
    expect(slotFitDelta(piece, cand)).toBe(15);
  });

  it("returns null when there is no shared-signal dimension", () => {
    const piece = { dimensionScores: dims([["workflow-fit", 60]]) };
    const cand = { dimensionScores: dims([["adoption-ease", 80]]) };
    expect(slotFitDelta(piece, cand)).toBeNull();
  });
});

describe("splitCandidatesForSlot", () => {
  const lifted = { utilityKeys: ["u1", "u2"], dimensionScores: dims([["workflow-fit", 50]]) };
  const c1 = { productId: "c1", utilityKeys: ["u2"], dimensionScores: dims([["workflow-fit", 70]]) }; // shares, +20
  const c2 = { productId: "c2", utilityKeys: ["u9"], dimensionScores: dims([["workflow-fit", 90]]) }; // no overlap
  const c3 = { productId: "c3", utilityKeys: ["u1"], dimensionScores: dims([["workflow-fit", 60]]) }; // shares, +10

  it("fits-slot lane = utility-overlapping only, ranked by slot-fit delta desc", () => {
    const { fitsSlot } = splitCandidatesForSlot(lifted, [c1, c2, c3]);
    expect(fitsSlot.map((c) => c.productId)).toEqual(["c1", "c3"]); // c2 excluded (no overlap), c1(+20) before c3(+10)
    expect(fitsSlot[0]!.slotFitDelta).toBe(20);
  });

  it("whole-firm lane keeps EVERY candidate (never hidden)", () => {
    const { wholeFirm } = splitCandidatesForSlot(lifted, [c1, c2, c3]);
    expect(wholeFirm.map((c) => c.productId)).toEqual(["c1", "c2", "c3"]);
  });

  it("no overlap at all → empty fits-slot lane, full whole-firm lane", () => {
    const isolated = { utilityKeys: ["zzz"], dimensionScores: dims([["workflow-fit", 50]]) };
    const { fitsSlot, wholeFirm } = splitCandidatesForSlot(isolated, [c1, c2, c3]);
    expect(fitsSlot).toHaveLength(0);
    expect(wholeFirm).toHaveLength(3);
  });
});

describe("lane labels (box 3f item J, Cam 9/28)", () => {
  it("read as common sense, verbatim from the box", () => {
    expect(SANDBOX_LANE_LABELS.fitsSlot).toBe("Firm-reviewed alternatives for this slot");
    expect(SANDBOX_LANE_LABELS.wholeFirm).toBe("Every product on your board");
    expect(SANDBOX_LANE_LABELS.unreviewed).toBe("Not yet firm-reviewed (vendor self-reported)");
  });

  it("are the strings the board renders (no other lane wording)", () => {
    const client = readFileSync(path.join(process.cwd(), "app/components/firm/AlignmentBoardClient.tsx"), "utf8");
    expect(client).toContain("SANDBOX_LANE_LABELS.fitsSlot");
    expect(client).toContain("SANDBOX_LANE_LABELS.wholeFirm");
    expect(client).toContain("SANDBOX_LANE_LABELS.unreviewed");
    expect(client).not.toMatch(/Fits this slot ·|Whole firm ·|shares a job with/);
  });
});
