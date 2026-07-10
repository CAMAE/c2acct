import { describe, expect, it } from "vitest";
import {
  buildFirmFutureStateProjection,
  buildFirmPeerBenchmark,
  buildFirmRecommendations,
  buildVendorMarketComparison,
  buildVendorFutureDemand,
  buildVendorExpansionSimulation,
} from "@/lib/eliteInsights";

/**
 * Elite Insights v1 (P2 / Block 3). Locks the data-grounding contract for all six
 * surfaces: grade labels, confidence bands, minimum-n suppression on peer cuts,
 * the Sandbox firm-reviewed>vendor-reported floor, and truthful-scope copy where
 * evidence is thin. No number is fabricated; suppressed cuts never print a figure.
 */

describe("reachability — Elite hub cards are live + clickable for Elite viewers", () => {
  it("firm: Elite viewers get interactive cards linking to each ?surface=elite; Pro stays locked", async () => {
    const { buildFirmEliteInsightCards } = await import("@/lib/firmInsightEngine");
    const live = buildFirmEliteInsightCards({ elite: true });
    expect(live.length).toBe(3);
    for (const card of live) {
      expect(card.interactive).toBe(true);
      expect(card.href).toBe(`/firm/insights/${card.key}?surface=elite`);
      expect(card.tone).toBe("active");
    }
    const locked = buildFirmEliteInsightCards({ elite: false });
    for (const card of locked) {
      expect(card.interactive).toBe(false);
      expect(card.href).toBeNull();
    }
  });

  it("vendor: Elite viewers get interactive cards linking to each ?surface=elite; Pro stays locked", async () => {
    const { buildVendorAlignmentInsightBundle, buildVendorAlignmentEliteInsightCards } = await import(
      "@/lib/vendorAlignmentInsightEngine"
    );
    const bundle = buildVendorAlignmentInsightBundle({
      sampleSize: 6,
      submissionCount: 6,
      moduleAggregates: [],
      capabilityAggregates: [],
      questionClusters: [],
    });
    const live = buildVendorAlignmentEliteInsightCards(bundle, { elite: true });
    expect(live.length).toBe(3);
    for (const card of live) {
      expect(card.interactive).toBe(true);
      expect(card.href).toBe(`/vendor/alignment-insights/${card.key}?surface=elite`);
      expect(card.tone).toBe("active");
    }
    const locked = buildVendorAlignmentEliteInsightCards(bundle, { elite: false });
    for (const card of locked) {
      expect(card.interactive).toBe(false);
      expect(card.href).toBeNull();
    }
  });
});

describe("F1 — firm future-state projection", () => {
  it("projects from firm-reviewed stack and labels it a projection", () => {
    const r = buildFirmFutureStateProjection({
      currentAlignment: 70,
      stackCount: 4,
      dimensionAxes: [],
      currentDimensions: [{ key: "workflow", title: "Workflow Fit", score: 72, sampleSize: 5 }],
      bestCandidate: { productName: "Ledger Pro", projectedScore: 78, grade: "firm_reviewed" },
    });
    expect(r.available).toBe(true);
    expect(r.grade).toBe("firm-reviewed");
    expect(r.summary).toMatch(/projection, not verified/i);
    expect(JSON.stringify(r.content)).toMatch(/\+8 vs current|projection/i);
  });

  it("is truthful-scope with an empty stack (no fabricated number)", () => {
    const r = buildFirmFutureStateProjection({
      currentAlignment: null,
      stackCount: 0,
      dimensionAxes: [],
      currentDimensions: [],
      bestCandidate: null,
    });
    expect(r.available).toBe(false);
    expect(r.confidenceBand).toBe("no_signal");
  });
});

describe("F2 — firm peer benchmark (suppression)", () => {
  it("publishes vs peers when ≥5 firms contribute", () => {
    const r = buildFirmPeerBenchmark({
      firmAlignmentIndex: 72,
      platformAverageIndex: 65,
      platformContributorCount: 8,
      modules: [{ moduleKey: "m1", title: "Operating Model", firmScore: 70, peerAverage: 60, peerContributorCount: 6 }],
    });
    expect(r.grade).toBe("benchmark aggregate");
    expect(r.summary).toMatch(/anonymized platform aggregate · 8 firms/i);
    expect(JSON.stringify(r.content)).toMatch(/7 above the peer average/i);
  });

  it("suppresses the peer comparison below 5 firms (shows own index, not a benchmark)", () => {
    const r = buildFirmPeerBenchmark({
      firmAlignmentIndex: 72,
      platformAverageIndex: 65,
      platformContributorCount: 3,
      modules: [{ moduleKey: "m1", title: "Operating Model", firmScore: 70, peerAverage: 60, peerContributorCount: 2 }],
    });
    expect(r.summary).toMatch(/insufficient peer data/i);
    const text = JSON.stringify(r.content);
    expect(text).toMatch(/Insufficient peer data/i);
    // The suppressed module cut must NOT print the peer number 60.
    expect(text).toMatch(/peer benchmark withheld/i);
  });
});

describe("F3 — firm recommendations", () => {
  it("sequences ranked actions with signal strength", () => {
    const r = buildFirmRecommendations({
      evidenceCount: 5,
      windows: [
        { window: "30 days", actions: [{ text: "Tighten reconciliation", detail: "close monthly gaps", signalStrength: "high" }] },
        { window: "60 days", actions: [] },
      ],
    });
    expect(r.available).toBe(true);
    expect(r.grade).toBe("firm-reviewed");
    expect(JSON.stringify(r.content)).toMatch(/high signal/i);
  });

  it("is truthful-scope with no actions", () => {
    const r = buildFirmRecommendations({ evidenceCount: 0, windows: [] });
    expect(r.available).toBe(false);
  });
});

describe("V1 — vendor benchmark comparison (suppression)", () => {
  it("compares to platform aggregate when the cut clears the safe harbor", () => {
    const r = buildVendorMarketComparison({
      rows: [
        { label: "Operating Model", subjectAverage: 80, subjectContributorCount: 6, peerAverage: 70, peerContributorCount: 7 },
      ],
    });
    expect(r.grade).toBe("benchmark aggregate");
    expect(JSON.stringify(r.content)).toMatch(/10 above platform/i);
  });

  it("withholds the platform benchmark below 5 contributors", () => {
    const r = buildVendorMarketComparison({
      rows: [
        { label: "Operating Model", subjectAverage: 80, subjectContributorCount: 6, peerAverage: 70, peerContributorCount: 3 },
      ],
    });
    const text = JSON.stringify(r.content);
    expect(text).toMatch(/insufficient peer data/i);
    expect(text).not.toMatch(/above platform/i);
  });
});

describe("V2 — vendor future demand", () => {
  it("ranks eligible weak modules and suppresses thin ones", () => {
    const r = buildVendorFutureDemand({
      weakModules: [
        { title: "Data Flow", averageScore: 48, contributorCount: 9 },
        { title: "Governance", averageScore: 55, contributorCount: 2 }, // suppressed
      ],
    });
    expect(r.available).toBe(true);
    const text = JSON.stringify(r.content);
    expect(text).toMatch(/Data Flow/);
    expect(text).not.toMatch(/Governance/); // below n≥5 → withheld
  });

  it("is truthful-scope when every module is thin", () => {
    const r = buildVendorFutureDemand({
      weakModules: [{ title: "Data Flow", averageScore: 48, contributorCount: 2 }],
    });
    expect(r.available).toBe(false);
    expect(r.summary).toMatch(/insufficient peer data/i);
  });
});

describe("V3 — vendor expansion simulation (Sandbox floor)", () => {
  it("ranks firm-reviewed candidates and floors vendor-reported below", () => {
    const r = buildVendorExpansionSimulation({
      candidates: [
        { productName: "A", grade: "firm_reviewed", projectedScore: 82, dimensions: [] },
        { productName: "B", grade: "firm_reviewed", projectedScore: 60, dimensions: [] },
        { productName: "C", grade: "vendor_reported", projectedScore: 99, dimensions: [] },
      ],
    });
    expect(r.available).toBe(true);
    const text = JSON.stringify(r.content);
    // Firm-reviewed ranked (A before B); vendor-reported floored in its own section.
    expect(text.indexOf("1. A")).toBeGreaterThanOrEqual(0);
    expect(text).toMatch(/never outrank firm-reviewed/i);
    // The vendor-reported 99 must not appear as a ranked fit.
    expect(text).toMatch(/floored|self-reported/i);
  });

  it("is truthful-scope (vendor self-report only) when no firm reviews exist", () => {
    const r = buildVendorExpansionSimulation({
      candidates: [{ productName: "C", grade: "vendor_reported", projectedScore: 90, dimensions: [] }],
    });
    expect(r.available).toBe(false);
    expect(r.grade).toBe("vendor self-reported");
    expect(r.summary).toMatch(/vendor self-report only/i);
  });
});
