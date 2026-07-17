import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Vendor BattleCard leak wall + ranking (Block F). Deps mocked at the module
 * boundary. The leak test is the point of the block: getVendorBattleCardData must
 * ONLY ever touch firms returned by getVendorScopedFirms — never a firm outside
 * the vendor's ecosystem.
 */

vi.mock("@/lib/prisma", () => ({
  default: {
    company: { findUnique: vi.fn() },
    // 16a: getVendorBattleCardData now reads each firm's alignment freshness.
    firmMaturitySnapshot: { findFirst: vi.fn(async () => null) },
  },
}));
vi.mock("@/lib/adminBriefingEngine", () => ({ getAdminCompanyBriefing: vi.fn() }));
vi.mock("@/lib/vendorProductInsightEngine", () => ({ getVendorProductInsightCatalog: vi.fn() }));
vi.mock("@/lib/tenancy", () => ({ getVendorScopedFirms: vi.fn() }));

import prisma from "@/lib/prisma";
import { getAdminCompanyBriefing } from "@/lib/adminBriefingEngine";
import { getVendorProductInsightCatalog } from "@/lib/vendorProductInsightEngine";
import { getVendorScopedFirms } from "@/lib/tenancy";
import { getVendorBattleCardData, rankFirmsByFit } from "@/lib/battleCard";

const findUnique = vi.mocked(prisma.company.findUnique);
const briefing = vi.mocked(getAdminCompanyBriefing);
const catalog = vi.mocked(getVendorProductInsightCatalog);
const scopedFirms = vi.mocked(getVendorScopedFirms);

function briefingFor(id: string, alignment: number, weakestScore: number) {
  return {
    company: { name: `Firm ${id}` },
    executiveSummary: { canonicalFirmScore: alignment, confidenceLabel: "Building" },
    firmLayer: {
      averageScore: alignment,
      completedModuleCount: 5,
      moduleHeatmap: [
        { key: "m1", title: "Automation", canonicalScore: 80, sectionScores: [{ key: "s1", title: "S1", score: 80, answeredCount: 4, questionCount: 4 }] },
        { key: "m2", title: "Governance", canonicalScore: weakestScore, sectionScores: [{ key: "s2", title: "S2", score: weakestScore, answeredCount: 3, questionCount: 4 }] },
      ],
    },
    productLayer: { reviewedProductCount: 2, products: [] },
  } as never;
}

function vendorSnapshot(firmAvg: number) {
  return {
    product: { id: "p1", name: "P", category: "PM", utilityKeys: [], utilityLabels: [], utilityScopeLabel: "" },
    vendorSelfReported: { latestScore: 70, submittedAt: null, sectionEvidence: [] },
    firmReviewed: { assessmentCount: 5, averageScore: firmAvg, latestSubmittedAt: null, utilityEvidence: [] },
    divergence: { points: 0, label: "" },
    confidenceBand: "grounded",
    confidenceLabel: "",
  } as never;
}

describe("rankFirmsByFit", () => {
  it("ranks bigger alignment deltas first; null deltas last", () => {
    const ranked = rankFirmsByFit([
      { firmCompanyId: "b", firmName: "B", alignmentDelta: -4, firmAlignment: 70, confidence: "grounded", gapArea: "x", gapScore: 60, moduleShape: [], nextActions: [], alignmentFreshness: null },
      { firmCompanyId: "a", firmName: "A", alignmentDelta: 26, firmAlignment: 40, confidence: "grounded", gapArea: "x", gapScore: 30, moduleShape: [], nextActions: [], alignmentFreshness: null },
      { firmCompanyId: "c", firmName: "C", alignmentDelta: null, firmAlignment: null, confidence: "no_signal", gapArea: "x", gapScore: null, moduleShape: [], nextActions: [], alignmentFreshness: null },
    ]);
    expect(ranked.map((f) => f.firmCompanyId)).toEqual(["a", "b", "c"]);
    expect(ranked.map((f) => f.fitRank)).toEqual([1, 2, 3]);
  });
});

describe("getVendorBattleCardData — leak wall", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findUnique.mockResolvedValue({ name: "Demo Vendor" } as never);
    catalog.mockResolvedValue([vendorSnapshot(66)]);
  });

  it("only queries firms inside the vendor's ecosystem, never outside it", async () => {
    scopedFirms.mockResolvedValue(["firmA", "firmB"]);
    briefing.mockImplementation(async (id: string) =>
      briefingFor(id, id === "firmA" ? 40 : 70, id === "firmA" ? 30 : 60)
    );

    const data = await getVendorBattleCardData("vendorX");

    // Tenancy call is scoped to this vendor.
    expect(scopedFirms).toHaveBeenCalledWith("vendorX");
    // Briefings fetched ONLY for the scoped firm ids — no cross-ecosystem probe.
    const queried = briefing.mock.calls.map((call) => call[0]);
    expect(new Set(queried)).toEqual(new Set(["firmA", "firmB"]));
    // Ranked output is a strict subset of the scoped set.
    expect(data!.rankedFirms.map((f) => f.firmCompanyId).sort()).toEqual(["firmA", "firmB"]);
    // firmA (alignment 40, delta +26) outranks firmB (70, delta -4).
    expect(data!.rankedFirms[0].firmCompanyId).toBe("firmA");
    expect(data!.rankedFirms[0].alignmentDelta).toBe(26);
    expect(data!.rankedFirms[0].gapArea).toBe("Governance");
  });

  it("returns an empty ranking (never a leak) when the vendor has no ecosystem", async () => {
    scopedFirms.mockResolvedValue([]);
    const data = await getVendorBattleCardData("vendorX");
    expect(briefing).not.toHaveBeenCalled();
    expect(data!.rankedFirms).toEqual([]);
  });
});
