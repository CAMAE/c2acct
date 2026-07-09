import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Evidence-lineage policy contract (P2-pre). Locks the launch-critical rules for
 * the Sales Card product strength and the Sandbox candidate rail:
 *  1. Firm-reviewed evidence is PRIMARY whenever it exists.
 *  2. A metric that uses vendor self-report (alone/blended) is graded so the UI
 *     labels it; the strength number never silently blends self-report in.
 *  3. Sandbox: vendor-reported candidates never enter the ranked rail (floor) —
 *     they live in a separate "not yet firm-reviewed" list.
 * Deps mocked at the module boundary — no DB, no engines.
 */

vi.mock("@/lib/prisma", () => ({
  default: { company: { findMany: vi.fn(), findUnique: vi.fn() } },
}));
vi.mock("@/lib/adminBriefingEngine", () => ({ getAdminCompanyBriefing: vi.fn() }));
vi.mock("@/lib/tenancy", () => ({ getVendorScopedFirms: vi.fn() }));
vi.mock("@/lib/vendorProductInsightEngine", () => ({
  getVendorProductInsightCatalog: vi.fn(),
  getFirmProductFitDimensionsByProduct: vi.fn(),
}));

import prisma from "@/lib/prisma";
import { getAdminCompanyBriefing } from "@/lib/adminBriefingEngine";
import { getVendorScopedFirms } from "@/lib/tenancy";
import {
  getFirmProductFitDimensionsByProduct,
  getVendorProductInsightCatalog,
} from "@/lib/vendorProductInsightEngine";
import { getVendorSalesCardData } from "@/lib/salesCard";
import { getAlignmentBoardData } from "@/lib/alignmentBoard";
import { PRODUCT_FIT_DIMENSIONS } from "@/lib/productFitDimensions";

const findMany = vi.mocked(prisma.company.findMany);
const findUnique = vi.mocked(prisma.company.findUnique);
const briefing = vi.mocked(getAdminCompanyBriefing);
const scopedFirms = vi.mocked(getVendorScopedFirms);
const catalog = vi.mocked(getVendorProductInsightCatalog);
const firmDims = vi.mocked(getFirmProductFitDimensionsByProduct);

/** Minimal snapshot: firmAvg set => firm-reviewed; firmAvg null => self-report only. */
function snap(id: string, opts: { firmAvg: number | null; vendor: number | null }) {
  const dims = PRODUCT_FIT_DIMENSIONS.map((d) => ({ key: d.key, title: d.title, score: 70, sampleSize: 3 }));
  return {
    product: { id, name: id.toUpperCase(), category: "PM", summary: null, utilityKeys: [], utilityLabels: ["PM"], utilityScopeLabel: "" },
    vendorAssessmentStatus: { completed: true, latestSubmittedAt: null, statusLabel: "", reason: "" },
    vendorSelfReported: { latestScore: opts.vendor, submittedAt: null, sectionEvidence: [], dimensionEvidence: dims },
    firmReviewed: { assessmentCount: opts.firmAvg === null ? 0 : 5, averageScore: opts.firmAvg, latestSubmittedAt: null, utilityEvidence: [], dimensionEvidence: dims },
    divergence: { points: 0, label: "" },
    latestUpdatedAt: null,
    confidenceBand: "grounded" as const,
    confidenceLabel: "Grounded",
    confidenceSummary: "",
    combinedCurrentPatReadout: "",
    confidenceCaveats: [],
    insightRecords: [],
  };
}

describe("Sales Card product-strength evidence grade (policy)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findUnique.mockResolvedValue({ name: "Vendor Co" } as never);
    scopedFirms.mockResolvedValue(["firm1"] as never);
    briefing.mockResolvedValue({
      company: { name: "Firm One" },
      executiveSummary: { canonicalFirmScore: 50, confidenceLabel: "Building" },
      firmLayer: { averageScore: 50, completedModuleCount: 5, moduleHeatmap: [] },
    } as never);
  });

  it("firm_reviewed grade + firm-reviewed-only mean when every product has firm reviews", async () => {
    catalog.mockResolvedValue([snap("p1", { firmAvg: 80, vendor: 40 }), snap("p2", { firmAvg: 60, vendor: 90 })] as never);
    const data = await getVendorSalesCardData("vendorA");
    expect(data!.vendorStrengthGrade).toBe("firm_reviewed");
    expect(data!.vendorStrength).toBe(70); // mean(80,60) — never the self-report 40/90
    expect(data!.firmReviewedProductCount).toBe(2);
    expect(data!.selfReportedOnlyProductCount).toBe(0);
  });

  it("firm-reviewed is PRIMARY: self-report-only products are excluded, not blended in", async () => {
    // p1 firm-reviewed 80; p2 self-report-only 20. Blending would drag it to 50.
    catalog.mockResolvedValue([snap("p1", { firmAvg: 80, vendor: 95 }), snap("p2", { firmAvg: null, vendor: 20 })] as never);
    const data = await getVendorSalesCardData("vendorA");
    expect(data!.vendorStrength).toBe(80); // firm-reviewed only, NOT (80+20)/2
    expect(data!.vendorStrengthGrade).toBe("firm_reviewed");
    expect(data!.firmReviewedProductCount).toBe(1);
    expect(data!.selfReportedOnlyProductCount).toBe(1); // disclosed, not silently dropped
  });

  it("vendor_reported grade only when NO product has a firm review", async () => {
    catalog.mockResolvedValue([snap("p1", { firmAvg: null, vendor: 75 }), snap("p2", { firmAvg: null, vendor: 65 })] as never);
    const data = await getVendorSalesCardData("vendorA");
    expect(data!.vendorStrengthGrade).toBe("vendor_reported");
    expect(data!.vendorStrength).toBe(70); // mean(75,65) self-report
    expect(data!.firmReviewedProductCount).toBe(0);
  });
});

describe("Sandbox candidate rail policy (floor + grade)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findMany.mockResolvedValue([{ id: "vendorA", name: "Vendor Co" }] as never);
    firmDims.mockResolvedValue(new Map() as never);
    briefing.mockResolvedValue({
      company: { name: "Stack Firm" },
      executiveSummary: { canonicalFirmScore: 60, confidenceLabel: "Building" },
      productLayer: {
        reviewedProductCount: 1,
        // p0 is this firm's reviewed stack piece; p1..p3 are candidates.
        products: [{ productId: "p0", productName: "P0", vendorName: "Vendor Co", canonicalFirmReviewScore: 60 }],
      },
      firmLayer: { moduleHeatmap: [] },
    } as never);
  });

  it("vendor-reported candidate never enters the ranked rail even with the highest projection", async () => {
    catalog.mockResolvedValue([
      snap("p0", { firmAvg: 60, vendor: 60 }), // stack (firm-reviewed of this firm)
      snap("p1", { firmAvg: 70, vendor: 50 }), // firm-reviewed candidate
      snap("p2", { firmAvg: null, vendor: 99 }), // self-report-only, HIGHEST projection
    ] as never);
    const data = await getAlignmentBoardData("firm1");
    // ranked rail is firm-reviewed only; p2 must NOT be there despite 99
    expect(data!.candidates.map((c) => c.productId)).toEqual(["p1"]);
    expect(data!.candidates.every((c) => c.grade === "firm_reviewed")).toBe(true);
    // p2 is floored into the separate not-yet-reviewed section
    expect(data!.unreviewedCandidates.map((c) => c.productId)).toEqual(["p2"]);
    expect(data!.unreviewedCandidates.every((c) => c.grade === "vendor_reported")).toBe(true);
  });

  it("all-firm-reviewed candidates => empty not-yet-reviewed section", async () => {
    catalog.mockResolvedValue([
      snap("p0", { firmAvg: 60, vendor: 60 }),
      snap("p1", { firmAvg: 72, vendor: 50 }),
      snap("p2", { firmAvg: 55, vendor: 50 }),
    ] as never);
    const data = await getAlignmentBoardData("firm1");
    expect(data!.candidates.map((c) => c.productId)).toEqual(["p1", "p2"]);
    expect(data!.unreviewedCandidates).toEqual([]);
  });
});
