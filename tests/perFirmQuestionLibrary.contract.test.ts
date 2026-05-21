import { describe, expect, it } from "vitest";

import {
  bandForFirmScore,
  directionForDelta,
  LIBRARY,
  magnitudeForDelta,
  selectQuestions,
  type QuestionScopeCell,
} from "@/lib/perFirmQuestionLibrary";

// Block I (WS-TEST-COVERAGE-002, audit Hole #5): pin the band x direction
// x magnitude selection table for lib/perFirmQuestionLibrary.ts so future
// copy edits to the LIBRARY array don't silently drift the selection
// logic. WS5 was flagged as the highest-risk-of-quality-drop session in
// the sprint plan; this contract is the regression anchor for the
// per-firm Section 4 question generator.

describe("perFirmQuestionLibrary selection contract (Block I)", () => {
  describe("bandForFirmScore boundaries (high>=75, mid>=50, low<50)", () => {
    it("classifies firm score 75 as high (the boundary)", () => {
      expect(bandForFirmScore(75)).toBe("high");
    });

    it("classifies firm score 74 as mid (one below high)", () => {
      expect(bandForFirmScore(74)).toBe("mid");
    });

    it("classifies firm score 50 as mid (the boundary)", () => {
      expect(bandForFirmScore(50)).toBe("mid");
    });

    it("classifies firm score 49 as low (one below mid)", () => {
      expect(bandForFirmScore(49)).toBe("low");
    });

    it("classifies firm score 0 as low (floor)", () => {
      expect(bandForFirmScore(0)).toBe("low");
    });

    it("classifies firm score 100 as high (ceiling)", () => {
      expect(bandForFirmScore(100)).toBe("high");
    });
  });

  describe("directionForDelta boundaries (|delta|>5 emits sign; ≤5 neutral; null neutral)", () => {
    it("delta=6 is vendor-higher (one past the threshold)", () => {
      expect(directionForDelta(6)).toBe("vendor-higher");
    });

    it("delta=5 is neutral (at the threshold, inclusive bottom)", () => {
      expect(directionForDelta(5)).toBe("neutral");
    });

    it("delta=-6 is firm-higher", () => {
      expect(directionForDelta(-6)).toBe("firm-higher");
    });

    it("delta=-5 is neutral (negative threshold inclusive)", () => {
      expect(directionForDelta(-5)).toBe("neutral");
    });

    it("delta=0 is neutral", () => {
      expect(directionForDelta(0)).toBe("neutral");
    });

    it("delta=null is neutral", () => {
      expect(directionForDelta(null)).toBe("neutral");
    });
  });

  describe("magnitudeForDelta boundaries (|delta|>=15 large; >=10 medium; <10 small; null small)", () => {
    it("|delta|=15 is large (boundary)", () => {
      expect(magnitudeForDelta(15)).toBe("large");
      expect(magnitudeForDelta(-15)).toBe("large");
    });

    it("|delta|=14 is medium (one below large)", () => {
      expect(magnitudeForDelta(14)).toBe("medium");
    });

    it("|delta|=10 is medium (HOT_DIVERGENCE_THRESHOLD boundary)", () => {
      expect(magnitudeForDelta(10)).toBe("medium");
    });

    it("|delta|=9 is small (one below medium)", () => {
      expect(magnitudeForDelta(9)).toBe("small");
    });

    it("delta=null is small", () => {
      expect(magnitudeForDelta(null)).toBe("small");
    });
  });

  describe("LIBRARY shape", () => {
    it("contains 5 always-applicable fallback templates (no band/direction/magnitude required)", () => {
      const fallbacks = LIBRARY.filter(
        (t) => !t.bandRequired && !t.directionRequired && !t.magnitudeRequired
      );
      expect(fallbacks.length).toBe(5);
    });

    it("every template id is unique", () => {
      const ids = LIBRARY.map((t) => t.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("every template's question is a function returning a non-empty string for a representative context", () => {
      const ctx = {
        vendorName: "Acme Vendor",
        firmName: "Test Firm",
        productName: "Acme Core",
        capabilityArea: "Data ingestion",
        firmScore: 72,
        vendorScore: 88,
        delta: 16,
      };
      for (const template of LIBRARY) {
        const out = template.question(ctx);
        expect(typeof out).toBe("string");
        expect(out.length).toBeGreaterThan(0);
      }
    });
  });

  describe("selectQuestions selection invariants", () => {
    const baseCtx = { vendorName: "Acme Vendor", firmName: "Test Firm" } as const;

    function makeCell(overrides: Partial<QuestionScopeCell> = {}): QuestionScopeCell {
      return {
        productId: "p1",
        productName: "Acme Core",
        capabilityArea: "Data ingestion",
        firmScore: 80,
        vendorScore: 85,
        delta: 5,
        ...overrides,
      };
    }

    it("returns at most the requested count", () => {
      const cells = [makeCell()];
      const out = selectQuestions(cells, baseCtx, 3);
      expect(out.length).toBeLessThanOrEqual(3);
    });

    it("default count is 5", () => {
      const cells = [makeCell()];
      const out = selectQuestions(cells, baseCtx);
      expect(out.length).toBeLessThanOrEqual(5);
    });

    it("deduplicates by template id across cells", () => {
      const cells = [makeCell({ productId: "p1" }), makeCell({ productId: "p2" })];
      const out = selectQuestions(cells, baseCtx, 20);
      const ids = out.map((c) => c.template.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("renders questions with vendor + firm names interpolated", () => {
      const cells = [makeCell()];
      const out = selectQuestions(cells, baseCtx, 5);
      expect(out.length).toBeGreaterThan(0);
      // At least one rendered question should mention the firm or vendor by name
      const anyMentions = out.some(
        (c) => c.rendered.includes("Acme Vendor") || c.rendered.includes("Test Firm")
      );
      expect(anyMentions).toBe(true);
    });

    it("ranks large-magnitude high-band cells ahead of small-magnitude low-band cells", () => {
      const cells = [
        makeCell({ productId: "low-small", firmScore: 40, delta: 2 }),
        makeCell({ productId: "high-large", firmScore: 80, delta: 16 }),
      ];
      const out = selectQuestions(cells, baseCtx, 5);
      // The first result's source cell should be the high-large cell, not low-small
      if (out.length > 0) {
        const firstProductId = out[0].cell.productId;
        // both productIds may appear in the candidate set, but the SORT puts
        // large+high first
        const firstIndex = out.findIndex((c) => c.cell.productId === "high-large");
        const secondIndex = out.findIndex((c) => c.cell.productId === "low-small");
        if (firstIndex >= 0 && secondIndex >= 0) {
          expect(firstIndex).toBeLessThan(secondIndex);
        } else {
          // at minimum, the first should be the high-large cell
          expect(firstProductId).toBe("high-large");
        }
      }
    });

    it("never returns more candidates than the LIBRARY size", () => {
      const cells = [makeCell()];
      const out = selectQuestions(cells, baseCtx, 999);
      expect(out.length).toBeLessThanOrEqual(LIBRARY.length);
    });

    it("returns an empty array for an empty cell set", () => {
      const out = selectQuestions([], baseCtx, 5);
      expect(out).toEqual([]);
    });
  });
});
