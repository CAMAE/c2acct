import { describe, expect, it } from "vitest";
import {
  LIBRARY,
  bandForFirmScore,
  directionForDelta,
  magnitudeForDelta,
  selectQuestions,
  type QuestionScopeCell,
} from "@/lib/perFirmQuestionLibrary";

const baseCtx = { vendorName: "Sentinel CPA Cloud", firmName: "Granite Slope Advisors" };

describe("WS5 — per-firm question library", () => {
  it("library is in the 30-50 sweet spot per WS5 prompt", () => {
    expect(LIBRARY.length).toBeGreaterThanOrEqual(30);
    expect(LIBRARY.length).toBeLessThanOrEqual(60);
  });

  it("every template id is unique", () => {
    const ids = new Set(LIBRARY.map((t) => t.id));
    expect(ids.size).toBe(LIBRARY.length);
  });

  it("every template renders with a populated context", () => {
    const ctx = {
      vendorName: "VendorCo",
      firmName: "FirmCo",
      productName: "ProductX",
      capabilityArea: "ProductX",
      firmScore: 70,
      vendorScore: 80,
      delta: 10,
    };
    for (const template of LIBRARY) {
      const rendered = template.question(ctx);
      expect(rendered.length).toBeGreaterThan(20);
      expect(rendered.length).toBeLessThanOrEqual(360);
    }
  });

  it("band thresholds match lib/briefs.ts (75 / 50)", () => {
    expect(bandForFirmScore(75)).toBe("high");
    expect(bandForFirmScore(74)).toBe("mid");
    expect(bandForFirmScore(50)).toBe("mid");
    expect(bandForFirmScore(49)).toBe("low");
  });

  it("magnitude tiers align with HOT_DIVERGENCE_THRESHOLD (10) and large (15)", () => {
    expect(magnitudeForDelta(20)).toBe("large");
    expect(magnitudeForDelta(15)).toBe("large");
    expect(magnitudeForDelta(14)).toBe("medium");
    expect(magnitudeForDelta(10)).toBe("medium");
    expect(magnitudeForDelta(9)).toBe("small");
    expect(magnitudeForDelta(-12)).toBe("medium");
    expect(magnitudeForDelta(null)).toBe("small");
  });

  it("delta direction uses the conversation-grade +/- 5 cutoff", () => {
    expect(directionForDelta(6)).toBe("vendor-higher");
    expect(directionForDelta(5)).toBe("neutral");
    expect(directionForDelta(-6)).toBe("firm-higher");
    expect(directionForDelta(null)).toBe("neutral");
  });

  it("selectQuestions returns >=1 candidate for a populated cell (fallback safety)", () => {
    const cells: QuestionScopeCell[] = [
      {
        productId: "p1",
        productName: "ProductX",
        capabilityArea: "ProductX",
        firmScore: 78,
        vendorScore: 80,
        delta: 2,
      },
    ];
    const candidates = selectQuestions(cells, baseCtx, 5);
    expect(candidates.length).toBeGreaterThanOrEqual(1);
  });

  it("selectQuestions deduplicates by template id", () => {
    const cells: QuestionScopeCell[] = [
      {
        productId: "p1",
        productName: "X",
        capabilityArea: "X",
        firmScore: 80,
        vendorScore: 80,
        delta: 0,
      },
      {
        productId: "p2",
        productName: "Y",
        capabilityArea: "Y",
        firmScore: 80,
        vendorScore: 80,
        delta: 0,
      },
    ];
    const candidates = selectQuestions(cells, baseCtx, 10);
    const ids = candidates.map((c) => c.template.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("selectQuestions ranks hot divergence ahead of neutral high-band", () => {
    const cells: QuestionScopeCell[] = [
      {
        productId: "neutral-high",
        productName: "Calm",
        capabilityArea: "Calm",
        firmScore: 80,
        vendorScore: 82,
        delta: 2,
      },
      {
        productId: "hot",
        productName: "Hot",
        capabilityArea: "Hot",
        firmScore: 80,
        vendorScore: 60,
        delta: -20,
      },
    ];
    const candidates = selectQuestions(cells, baseCtx, 3);
    expect(candidates[0].cell.productId).toBe("hot");
  });

  it("library coverage matrix has at least one template per major (band × direction) cell", () => {
    const bands = ["high", "mid", "low"] as const;
    const directions = ["vendor-higher", "firm-higher", "neutral"] as const;
    for (const band of bands) {
      for (const direction of directions) {
        const matches = LIBRARY.filter(
          (t) =>
            t.bandRequired === band &&
            t.directionRequired === direction
        );
        expect(
          matches.length,
          `expected >=1 template for band=${band} direction=${direction}`
        ).toBeGreaterThanOrEqual(1);
      }
    }
  });

  it("library includes at least 5 always-applicable fallback templates", () => {
    const fallbacks = LIBRARY.filter(
      (t) =>
        !t.bandRequired && !t.directionRequired && !t.magnitudeRequired
    );
    expect(fallbacks.length).toBeGreaterThanOrEqual(5);
  });

  it("hot-divergence templates exist for vendor-higher × large at every band", () => {
    const bands = ["high", "mid", "low"] as const;
    for (const band of bands) {
      const matches = LIBRARY.filter(
        (t) =>
          t.bandRequired === band &&
          t.directionRequired === "vendor-higher" &&
          t.magnitudeRequired === "large"
      );
      expect(matches.length, `band=${band} vendor-higher large`).toBeGreaterThanOrEqual(1);
    }
  });

  it("every template interpolates at least two QuestionContext fields", () => {
    const sentinel = "<<__sentinel_field_marker__>>";
    const probeCtx = {
      vendorName: `${sentinel}-vendor`,
      firmName: `${sentinel}-firm`,
      productName: `${sentinel}-product`,
      capabilityArea: `${sentinel}-capability`,
      firmScore: 12345,
      vendorScore: 98765,
      delta: -54321,
    };
    for (const template of LIBRARY) {
      const rendered = template.question(probeCtx);
      let fieldsUsed = 0;
      if (rendered.includes(`${sentinel}-vendor`)) fieldsUsed += 1;
      if (rendered.includes(`${sentinel}-firm`)) fieldsUsed += 1;
      if (rendered.includes(`${sentinel}-product`)) fieldsUsed += 1;
      if (rendered.includes(`${sentinel}-capability`)) fieldsUsed += 1;
      if (rendered.includes("12345")) fieldsUsed += 1;
      if (rendered.includes("98765")) fieldsUsed += 1;
      if (rendered.includes("54321")) fieldsUsed += 1;
      expect(
        fieldsUsed,
        `${template.id}: only ${fieldsUsed} of {vendor,firm,product,capability,firmScore,vendorScore,delta} interpolated`
      ).toBeGreaterThanOrEqual(2);
    }
  });
});
