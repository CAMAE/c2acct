import { describe, expect, it } from "vitest";
import { formatDelta, formatScoreValue, roundHundredths } from "@/lib/formatDelta";

/**
 * Contract (Redlines R2): the shared delta formatter kills float leaks and
 * NEVER renders a number with more than two decimal places.
 */

const AT_MOST_TWO_DECIMALS = /^[+-]?\d+(\.\d{1,2})?$/;

describe("formatDelta", () => {
  it("kills the exact leak values from the review", () => {
    expect(formatDelta(-15.100000000000001)).toBe("-15.10");
    expect(formatDelta(7.799999999999997)).toBe("+7.80");
  });

  it("renders whole values without decimals, fractional with exactly two", () => {
    expect(formatDelta(15)).toBe("+15");
    expect(formatDelta(-3)).toBe("-3");
    expect(formatDelta(7.8)).toBe("+7.80");
    expect(formatDelta(-15.1)).toBe("-15.10");
  });

  it("treats exact zero as unsigned", () => {
    expect(formatDelta(0)).toBe("0");
    expect(formatDelta(-0)).toBe("0");
  });

  it("honors the sign option and empty fallback", () => {
    expect(formatDelta(12.5, { sign: false })).toBe("12.50");
    expect(formatDelta(null)).toBe("—");
    expect(formatDelta(undefined)).toBe("—");
    expect(formatDelta(Number.NaN)).toBe("—");
    expect(formatDelta(null, { empty: "n/a" })).toBe("n/a");
  });

  it("formatScoreValue is the unsigned variant", () => {
    expect(formatScoreValue(66)).toBe("66");
    expect(formatScoreValue(72.499999)).toBe("72.50");
    expect(formatScoreValue(null)).toBe("—");
  });

  it("NEVER emits more than two decimal places across nasty inputs", () => {
    const nasty = [
      -15.100000000000001, 7.799999999999997, 0.1 + 0.2, 1 / 3, -2 / 3,
      100 / 7, 66.006, 66.004, -0.005, 12.345678, 999.999,
    ];
    for (const value of nasty) {
      const out = formatDelta(value);
      expect(out).toMatch(AT_MOST_TWO_DECIMALS);
      const unsigned = formatScoreValue(value);
      expect(unsigned).toMatch(AT_MOST_TWO_DECIMALS);
    }
  });

  it("roundHundredths collapses binary noise", () => {
    expect(roundHundredths(-15.100000000000001)).toBe(-15.1);
    expect(roundHundredths(7.799999999999997)).toBe(7.8);
  });
});
