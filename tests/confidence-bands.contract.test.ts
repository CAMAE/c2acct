import { describe, expect, it } from "vitest";
import {
  CONFIDENCE_SAMPLE_THRESHOLDS,
  confidenceBandForSampleSize,
} from "@/lib/confidenceBands";

/**
 * Confidence bands are ONE shared definition (2026-07-09 audit, CLASS 3). This
 * locks the unified thresholds so no engine can quietly reintroduce its own.
 */
describe("confidenceBandForSampleSize (unified)", () => {
  it("uses the single shared threshold set (thin 3 / emerging 6)", () => {
    expect(CONFIDENCE_SAMPLE_THRESHOLDS).toEqual({ thin: 3, emerging: 6 });
  });

  it("maps sample counts to bands at the shared boundaries", () => {
    expect(confidenceBandForSampleSize(0)).toBe("no_signal");
    expect(confidenceBandForSampleSize(1)).toBe("sample_thin");
    expect(confidenceBandForSampleSize(2)).toBe("sample_thin");
    expect(confidenceBandForSampleSize(3)).toBe("emerging");
    expect(confidenceBandForSampleSize(5)).toBe("emerging");
    expect(confidenceBandForSampleSize(6)).toBe("grounded");
    expect(confidenceBandForSampleSize(100)).toBe("grounded");
  });

  it("never returns grounded below the emerging threshold", () => {
    for (let n = 0; n < CONFIDENCE_SAMPLE_THRESHOLDS.emerging; n += 1) {
      expect(confidenceBandForSampleSize(n)).not.toBe("grounded");
    }
  });
});
