import { describe, expect, it } from "vitest";
import { ordinal } from "@/lib/ordinal";

/**
 * FIX-1 (Block-16 closing sweep) — the shared ordinal formatter. Covers the
 * teens exception (11th/12th/13th) and the 1/2/3 vs 21/22/23 boundary that a
 * naive `${n}th` breaks on.
 */
describe("ordinal", () => {
  it("formats the base cases", () => {
    expect(ordinal(1)).toBe("1st");
    expect(ordinal(2)).toBe("2nd");
    expect(ordinal(3)).toBe("3rd");
    expect(ordinal(4)).toBe("4th");
  });

  it("formats the teens as th (11th/12th/13th)", () => {
    expect(ordinal(11)).toBe("11th");
    expect(ordinal(12)).toBe("12th");
    expect(ordinal(13)).toBe("13th");
  });

  it("formats the 21/22/23 boundary", () => {
    expect(ordinal(21)).toBe("21st");
    expect(ordinal(22)).toBe("22nd");
    expect(ordinal(23)).toBe("23rd");
  });

  it("handles larger + zero values", () => {
    expect(ordinal(48)).toBe("48th");
    expect(ordinal(83)).toBe("83rd");
    expect(ordinal(100)).toBe("100th");
    expect(ordinal(111)).toBe("111th");
    expect(ordinal(0)).toBe("0th");
  });
});
