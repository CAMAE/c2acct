import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Alignment Board data layer (Block D). Deps mocked at the module boundary — no
 * DB, no engines. Proves the pure recompute math and that getAlignmentBoardData
 * splits stack (firm-reviewed) vs candidates (not reviewed), scopes queries to
 * the firm, and derives the board baseline from real scores.
 */

vi.mock("@/lib/prisma", () => ({
  default: { company: { findMany: vi.fn(), findUnique: vi.fn() } },
}));
vi.mock("@/lib/adminBriefingEngine", () => ({ getAdminCompanyBriefing: vi.fn() }));
vi.mock("@/lib/vendorProductInsightEngine", () => ({
  getVendorProductInsightCatalog: vi.fn(),
  getFirmProductFitDimensionsByProduct: vi.fn(),
}));

import prisma from "@/lib/prisma";
import { getAdminCompanyBriefing } from "@/lib/adminBriefingEngine";
import {
  getFirmProductFitDimensionsByProduct,
  getVendorProductInsightCatalog,
} from "@/lib/vendorProductInsightEngine";
import { getAlignmentBoardData, recomputeProjectedAlignment } from "@/lib/alignmentBoard";
import { PRODUCT_FIT_DIMENSIONS } from "@/lib/productFitDimensions";

const findMany = vi.mocked(prisma.company.findMany);
const findUnique = vi.mocked(prisma.company.findUnique);
const briefing = vi.mocked(getAdminCompanyBriefing);
const vendorCatalog = vi.mocked(getVendorProductInsightCatalog);
const firmDimensions = vi.mocked(getFirmProductFitDimensionsByProduct);

function dimensionScores(scores?: Partial<Record<string, number>>) {
  return PRODUCT_FIT_DIMENSIONS.map((dimension) => ({
    key: dimension.key,
    title: dimension.title,
    score: scores?.[dimension.key] ?? null,
    sampleSize: scores?.[dimension.key] != null ? 3 : 0,
  }));
}

function snapshot(id: string, name: string, opts: { firmAvg?: number | null; vendor?: number | null } = {}) {
  return {
    product: { id, name, category: "Practice management", summary: null, utilityKeys: [], utilityLabels: ["Practice management"], utilityScopeLabel: "" },
    vendorAssessmentStatus: { completed: true, latestSubmittedAt: null, statusLabel: "", reason: "" },
    vendorSelfReported: { latestScore: opts.vendor ?? 70, submittedAt: null, sectionEvidence: [], dimensionEvidence: dimensionScores({ workflow: opts.vendor ?? 70 }) },
    firmReviewed: { assessmentCount: 5, averageScore: opts.firmAvg ?? 66, latestSubmittedAt: null, utilityEvidence: [], dimensionEvidence: dimensionScores({ workflow: opts.firmAvg ?? 66 }) },
    divergence: { points: 4, label: "Aligned" },
    latestUpdatedAt: null,
    confidenceBand: "grounded" as const,
    confidenceLabel: "Grounded",
    confidenceSummary: "",
    combinedCurrentPatReadout: "",
    confidenceCaveats: [],
    insightRecords: [],
  };
}

describe("recomputeProjectedAlignment", () => {
  it("means the non-null scores, rounded", () => {
    expect(recomputeProjectedAlignment([80, 60, 70])).toBe(70);
    expect(recomputeProjectedAlignment([80, null, 61])).toBe(71); // (80+61)/2 = 70.5 -> 71
  });
  it("returns null when no scores are known", () => {
    expect(recomputeProjectedAlignment([])).toBeNull();
    expect(recomputeProjectedAlignment([null, null])).toBeNull();
  });
});

describe("getAlignmentBoardData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findMany.mockResolvedValue([{ id: "vendorA", name: "Northwind Systems" }] as never);
    firmDimensions.mockResolvedValue(new Map() as never);
    // resolveCompanyBoundary(firmCompanyId) — the viewing firm is real.
    findUnique.mockResolvedValue({ dataBoundary: "PRODUCTION" } as never);
  });

  it("returns null when the firm has no briefing (caller 404s)", async () => {
    briefing.mockResolvedValue(null as never);
    expect(await getAlignmentBoardData("firm1")).toBeNull();
  });

  it("splits reviewed products into the stack and the rest into candidates, scoped to the firm", async () => {
    briefing.mockResolvedValue({
      company: { name: "Demo Firm" },
      executiveSummary: { canonicalFirmScore: 64, confidenceLabel: "Building" },
      productLayer: {
        reviewedProductCount: 1,
        products: [{ productId: "p1", productName: "P1", vendorName: "Northwind Systems", canonicalFirmReviewScore: 72 }],
      },
      firmLayer: {
        moduleHeatmap: [
          { key: "firm_alignment_operating_model_v1", title: "Operating Model", canonicalScore: 70 },
          { key: "firm_alignment_governance_v1", title: "Governance", canonicalScore: 55 },
        ],
      },
    } as never);
    vendorCatalog.mockResolvedValue([
      snapshot("p1", "Practice Pro"),
      snapshot("p2", "Ledger Plus", { firmAvg: 58 }),
      snapshot("p3", "Automate X", { firmAvg: 88 }),
    ] as never);

    const data = await getAlignmentBoardData("firm1");
    expect(data).not.toBeNull();
    expect(data!.firmName).toBe("Demo Firm");
    // stack = firm-reviewed (p1 has canonicalFirmReviewScore 72)
    expect(data!.stack.map((s) => s.productId)).toEqual(["p1"]);
    expect(data!.stack[0].scoreVsFirm).toBe(72);
    expect(data!.stack[0].vendorName).toBe("Northwind Systems");
    // candidates = the rest, ranked by projected score desc (winner p3 first) + fitRank
    expect(data!.candidates.map((c) => c.productId)).toEqual(["p3", "p2"]);
    expect(data!.candidates[0].projectedScore).toBe(88);
    expect(data!.candidates.map((c) => c.fitRank)).toEqual([1, 2]);
    // board baseline = mean of stack scores (just p1 here)
    expect(data!.currentAlignment).toBe(72);
    // P0 radar axes = the five product-fit dimensions, canonical order
    expect(data!.dimensionAxes.map((axis) => axis.key)).toEqual(
      PRODUCT_FIT_DIMENSIONS.map((dimension) => dimension.key)
    );
    // candidate carries a projected per-dimension shape + its evidence basis
    const winner = data!.candidates.find((c) => c.productId === "p3");
    expect(winner?.dimensionScores).toHaveLength(5);
    expect(winner?.evidenceBasis).toBe("firm_reviewed"); // firmReviewed had signal
  });

  it("fills each stack piece's per-dimension shape from THIS firm's own review", async () => {
    briefing.mockResolvedValue({
      company: { name: "Demo Firm" },
      executiveSummary: { canonicalFirmScore: 72, confidenceLabel: "Building" },
      productLayer: {
        reviewedProductCount: 1,
        products: [{ productId: "p1", productName: "P1", vendorName: "Northwind Systems", canonicalFirmReviewScore: 72 }],
      },
      firmLayer: { moduleHeatmap: [] },
    } as never);
    vendorCatalog.mockResolvedValue([snapshot("p1", "Practice Pro")] as never);
    firmDimensions.mockResolvedValue(
      new Map([["p1", dimensionScores({ workflow: 80, value: 60 })]]) as never
    );

    const data = await getAlignmentBoardData("firm1");
    // this-firm dimension fetch is scoped to the shown stack products
    expect(firmDimensions).toHaveBeenCalledWith("firm1", [{ id: "p1", utilityKeys: [] }]);
    const piece = data!.stack.find((s) => s.productId === "p1");
    const workflow = piece?.dimensionScores.find((d) => d.key === "workflow");
    expect(workflow?.score).toBe(80);
  });

  it("scopes the candidate vendor pool to the viewing firm's boundary (real → no demo vendors)", async () => {
    // Real (PRODUCTION) firm.
    findUnique.mockResolvedValue({ dataBoundary: "PRODUCTION" } as never);
    briefing.mockResolvedValue({
      company: { name: "Real Firm" },
      executiveSummary: { canonicalFirmScore: 60, confidenceLabel: "Building" },
      productLayer: { reviewedProductCount: 0, products: [] },
      firmLayer: { moduleHeatmap: [] },
    } as never);
    vendorCatalog.mockResolvedValue([] as never);

    await getAlignmentBoardData("firm1");

    // Data-integrity wall: the vendor pool query excludes demo vendors.
    expect(findMany).toHaveBeenCalledWith({
      where: { type: "VENDOR", dataBoundary: { in: ["PRODUCTION", "PILOT"] } },
      select: { id: true, name: true },
    });
  });

  it("a DEMO firm's board draws from the DEMO vendor pool (demo stays visible to demo)", async () => {
    findUnique.mockResolvedValue({ dataBoundary: "DEMO" } as never);
    briefing.mockResolvedValue({
      company: { name: "Demo Firm" },
      executiveSummary: { canonicalFirmScore: 60, confidenceLabel: "Building" },
      productLayer: { reviewedProductCount: 0, products: [] },
      firmLayer: { moduleHeatmap: [] },
    } as never);
    vendorCatalog.mockResolvedValue([] as never);

    await getAlignmentBoardData("demo-firm");

    expect(findMany).toHaveBeenCalledWith({
      where: { type: "VENDOR", dataBoundary: { in: ["DEMO"] } },
      select: { id: true, name: true },
    });
  });
});
