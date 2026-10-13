import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { formatDelta } from "@/lib/formatDelta";
import { fitTierLabel } from "@/lib/fitHeat";

/**
 * box-c (R65, item 3): the vendor Fit Card rendered Vandenberg CPAs at Fit #9 with
 * a tier word and no delta value. Cause: a firm whose alignment is thin carries a
 * null alignmentDelta; fitTierLabel(null) still returns a tier word ("Pending")
 * while formatDelta(null) rendered the empty marker. The card now renders an
 * explicit 0 for a null delta and the value otherwise; the tier word is unchanged.
 */
const ROOT = path.resolve(__dirname, "..");

describe("vendor Fit Card delta (box-c item 3)", () => {
  it("a zero delta renders 0", () => {
    expect(formatDelta(0)).toBe("0");
    expect(fitTierLabel(0)).toBe("Good fit");
  });
  it("a null delta renders an explicit 0 next to its pending tier word", () => {
    const delta: number | null = null;
    expect(formatDelta(delta ?? 0)).toBe("0");
    expect(fitTierLabel(delta)).toBe("Pending");
  });
  it("the card never passes a nullable delta straight to the formatter", () => {
    const source = readFileSync(path.join(ROOT, "app/components/vendor/VendorBattleCardClient.tsx"), "utf8");
    expect(source).not.toMatch(/formatDelta\((detail|firm|row)\.alignmentDelta\)/);
    expect(source).toMatch(/formatDelta\(detail\.alignmentDelta \?\? 0\)/);
  });
});
