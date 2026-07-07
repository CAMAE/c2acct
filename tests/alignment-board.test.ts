import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Alignment Board data layer (Block D). Deps mocked at the module boundary — no
 * DB, no engines. Proves the pure recompute math and that getAlignmentBoardData
 * splits stack (firm-reviewed) vs candidates (not reviewed), scopes queries to
 * the firm, and derives the board baseline from real scores.
 */

vi.mock("@/lib/prisma", () => ({
  default: { company: { findMany: vi.fn() } },
}));
vi.mock("@/lib/adminBriefingEngine", () => ({ getAdminCompanyBriefing: vi.fn() }));
vi.mock("@/lib/tenancy", () => ({ getFirmScopedVendors: vi.fn() }));
vi.mock("@/lib/vendorProductInsightEngine", () => ({ getVendorProductInsightCatalog: vi.fn() }));

import prisma from "@/lib/prisma";
import { getAdminCompanyBriefing } from "@/lib/adminBriefingEngine";
import { getFirmScopedVendors } from "@/lib/tenancy";
import { getVendorProductInsightCatalog } from "@/lib/vendorProductInsightEngine";
import { getAlignmentBoardData, recomputeProjectedAlignment } from "@/lib/alignmentBoard";

const findMany = vi.mocked(prisma.company.findMany);
const briefing = vi.mocked(getAdminCompanyBriefing);
const scopedVendors = vi.mocked(getFirmScopedVendors);
const vendorCatalog = vi.mocked(getVendorProductInsightCatalog);

function snapshot(id: string, name: string, opts: { firmAvg?: number | null; vendor?: number | null } = {}) {
  return {
    product: { id, name, category: "Practice management", summary: null, utilityKeys: [], utilityLabels: ["Practice management"], utilityScopeLabel: "" },
    vendorAssessmentStatus: { completed: true, latestSubmittedAt: null, statusLabel: "", reason: "" },
    vendorSelfReported: { latestScore: opts.vendor ?? 70, submittedAt: null, sectionEvidence: [] },
    firmReviewed: { assessmentCount: 5, averageScore: opts.firmAvg ?? 66, latestSubmittedAt: null, utilityEvidence: [] },
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
    scopedVendors.mockResolvedValue(["vendorA"]);
    findMany.mockResolvedValue([{ id: "vendorA", name: "Northwind Systems" }] as never);
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
    } as never);
    vendorCatalog.mockResolvedValue([
      snapshot("p1", "Practice Pro"),
      snapshot("p2", "Ledger Plus", { firmAvg: 58 }),
    ] as never);

    const data = await getAlignmentBoardData("firm1");
    expect(scopedVendors).toHaveBeenCalledWith("firm1");
    expect(data).not.toBeNull();
    expect(data!.firmName).toBe("Demo Firm");
    // stack = firm-reviewed (p1 has canonicalFirmReviewScore 72); candidate = p2
    expect(data!.stack.map((s) => s.productId)).toEqual(["p1"]);
    expect(data!.stack[0].scoreVsFirm).toBe(72);
    expect(data!.stack[0].vendorName).toBe("Northwind Systems");
    expect(data!.candidates.map((c) => c.productId)).toEqual(["p2"]);
    // candidate projected fit falls back to the cross-firm benchmark average
    expect(data!.candidates[0].projectedScore).toBe(58);
    // board baseline = mean of stack scores (just p1 here)
    expect(data!.currentAlignment).toBe(72);
  });
});
