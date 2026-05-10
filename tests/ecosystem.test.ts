import { describe, expect, it } from "vitest";

import type {
  AdminCompanyBriefing,
  BriefingCatalogItem,
  BriefingProductOpenEndedResponse,
} from "@/lib/adminBriefingEngine";
import {
  FUNCTION_BUCKET_KEYS,
  HOT_DIVERGENCE_THRESHOLD,
  aggregateFirmConfidence,
  avgFirmAlignmentScore,
  avgModuleCompletion,
  countHotDivergences,
  countThirtyDayActions,
  openEndedResponsesForEcosystem,
  vendorAtAGlanceForVendor,
  vendorCoverageMapForVendor,
} from "@/lib/ecosystem";
import type { FirmAlignmentProgressSummary } from "@/lib/firmPat";
import type { VendorProductInsightSnapshot } from "@/lib/vendorProductInsightEngine";

function catalogEntry(overrides: Partial<BriefingCatalogItem> = {}): BriefingCatalogItem {
  return {
    companyId: "firm-x",
    companyName: "Firm X",
    userCount: 0,
    completedModuleCount: 0,
    productReviewCount: 0,
    canonicalFirmScore: null,
    confidenceLabel: "No current-state signal",
    latestUpdatedAt: null,
    ...overrides,
  };
}

function briefingWith(input: {
  products?: Array<{ vendor: number | null; firm: number | null }>;
  windows?: Array<"30 days" | "60 days" | "90 days">;
}): AdminCompanyBriefing {
  return {
    productLayer: {
      products: (input.products ?? []).map((entry, index) => ({
        productId: `product-${index}`,
        productName: `Product ${index}`,
        vendorName: "Vendor",
        canonicalFirmReviewScore: entry.firm,
        firmReviewCount: 1,
        vendorSelfReportedScore: entry.vendor,
        combinedCurrentReadout: "",
        divergenceLabel: "",
        confidenceLabel: "",
        confidenceSummary: "",
        latestUpdatedAt: null,
        utilityLabels: [],
        taxonomyTitles: [],
        capabilityKeys: [],
        latestVendorAssessmentSubmittedAt: null,
        openEndedResponseCount: 0,
      })),
    },
    nextActions: (input.windows ?? []).map((window, index) => ({
      window,
      title: `Action ${index}`,
      detail: "",
      evidence: "",
    })),
  } as unknown as AdminCompanyBriefing;
}

function progress(completionPercent: number): FirmAlignmentProgressSummary {
  return {
    totalModules: 5,
    completedModules: 0,
    inProgressModules: 0,
    notStartedModules: 0,
    answeredQuestions: 0,
    totalQuestions: 0,
    completionPercent,
    nextModule: null,
  } as unknown as FirmAlignmentProgressSummary;
}

describe("lib/ecosystem helpers", () => {
  describe("avgFirmAlignmentScore", () => {
    it("returns null for empty catalog", () => {
      expect(avgFirmAlignmentScore([])).toBeNull();
    });

    it("returns null when every firm score is null", () => {
      expect(
        avgFirmAlignmentScore([catalogEntry(), catalogEntry({ companyId: "firm-2" })])
      ).toBeNull();
    });

    it("returns a rounded average and skips null scores", () => {
      const result = avgFirmAlignmentScore([
        catalogEntry({ canonicalFirmScore: 60 }),
        catalogEntry({ companyId: "firm-2", canonicalFirmScore: 80 }),
        catalogEntry({ companyId: "firm-3", canonicalFirmScore: null }),
      ]);
      expect(result).toBe(70);
    });
  });

  describe("aggregateFirmConfidence", () => {
    it("distributes across all five buckets and ignores unknown labels", () => {
      const counts = aggregateFirmConfidence([
        catalogEntry({ confidenceLabel: "Grounded current-state signal" }),
        catalogEntry({ companyId: "f2", confidenceLabel: "Grounded current-state signal" }),
        catalogEntry({ companyId: "f3", confidenceLabel: "Emerging signal" }),
        catalogEntry({ companyId: "f4", confidenceLabel: "Sample-thin current-state signal" }),
        catalogEntry({ companyId: "f5", confidenceLabel: "Early current-state signal" }),
        catalogEntry({ companyId: "f6", confidenceLabel: "No current-state signal" }),
        catalogEntry({ companyId: "f7", confidenceLabel: "Some band that does not exist" }),
      ]);
      expect(counts).toEqual({
        grounded: 2,
        emerging: 1,
        sampleThin: 1,
        earlySignal: 1,
        noSignal: 1,
      });
    });
  });

  describe("countHotDivergences", () => {
    it("uses the 10-point threshold (9-pt skipped, 10-pt counted, 11-pt counted)", () => {
      expect(HOT_DIVERGENCE_THRESHOLD).toBe(10);
      const briefing = briefingWith({
        products: [
          { vendor: 70, firm: 61 }, // 9-pt gap → not hot
          { vendor: 70, firm: 60 }, // 10-pt gap → hot (boundary)
          { vendor: 70, firm: 59 }, // 11-pt gap → hot
          { vendor: 70, firm: 81 }, // 11-pt gap, opposite sign → hot
        ],
      });
      // 1 (9-pt skipped) + 3 hot
      expect(countHotDivergences([briefing])).toBe(3);
    });

    it("skips pairs where either score is null", () => {
      const briefing = briefingWith({
        products: [
          { vendor: null, firm: 60 },
          { vendor: 80, firm: null },
          { vendor: null, firm: null },
        ],
      });
      expect(countHotDivergences([briefing])).toBe(0);
    });
  });

  describe("countThirtyDayActions", () => {
    it("only counts items whose window === '30 days'", () => {
      const briefingA = briefingWith({ windows: ["30 days", "60 days", "30 days", "90 days"] });
      const briefingB = briefingWith({ windows: ["30 days"] });
      expect(countThirtyDayActions([briefingA, briefingB])).toBe(3);
    });

    it("returns 0 when no briefings supplied", () => {
      expect(countThirtyDayActions([])).toBe(0);
    });
  });

  describe("avgModuleCompletion", () => {
    it("returns null for empty input", () => {
      expect(avgModuleCompletion([])).toBeNull();
    });

    it("averages completionPercent across firms and rounds the result", () => {
      expect(avgModuleCompletion([progress(60), progress(80), progress(90)])).toBe(77);
    });
  });

  describe("vendorCoverageMapForVendor", () => {
    function snapshot(id: string, utilityKeys: string[]): VendorProductInsightSnapshot {
      return {
        product: {
          id,
          name: `Product ${id}`,
          summary: null,
          utilityKeys,
          utilityLabels: utilityKeys,
          utilityScopeLabel: "",
        },
        firmReviewed: {
          assessmentCount: 0,
          averageScore: null,
          latestSubmittedAt: null,
          utilityEvidence: [],
        },
      } as unknown as VendorProductInsightSnapshot;
    }

    it("renders all 14 buckets with covered cells where utilityKeys hit", () => {
      const cells = vendorCoverageMapForVendor([
        snapshot("p1", ["function-tax", "function-audit"]),
        snapshot("p2", ["function-tax", "function-workflow", "function-payroll"]),
      ]);
      expect(cells).toHaveLength(FUNCTION_BUCKET_KEYS.length);
      const covered = cells.filter((cell) => cell.covered);
      expect(covered.map((cell) => cell.bucketKey).sort()).toEqual(
        ["function-audit", "function-payroll", "function-tax", "function-workflow"].sort()
      );
      // tax is in two products, the rest in one
      const tax = cells.find((cell) => cell.bucketKey === "function-tax");
      expect(tax?.productCount).toBe(2);
      const audit = cells.find((cell) => cell.bucketKey === "function-audit");
      expect(audit?.productCount).toBe(1);
      // unfilled cells preserved with productCount: 0
      const unfilled = cells.filter((cell) => !cell.covered);
      expect(unfilled).toHaveLength(FUNCTION_BUCKET_KEYS.length - 4);
      expect(unfilled.every((cell) => cell.productCount === 0)).toBe(true);
    });

    it("ignores utility keys outside the 14-bucket taxonomy", () => {
      const cells = vendorCoverageMapForVendor([
        snapshot("p1", ["function-tax", "made-up-bucket", "function-not-a-thing"]),
      ]);
      const covered = cells.filter((cell) => cell.covered);
      expect(covered).toHaveLength(1);
      expect(covered[0].bucketKey).toBe("function-tax");
    });
  });

  describe("vendorAtAGlanceForVendor", () => {
    function scored(id: string, score: number | null, utilityKeys: string[] = []) {
      return {
        product: {
          id,
          name: `Product ${id}`,
          summary: null,
          utilityKeys,
          utilityLabels: utilityKeys,
          utilityScopeLabel: "",
        },
        firmReviewed: {
          assessmentCount: 0,
          averageScore: score,
          latestSubmittedAt: null,
          utilityEvidence: [],
        },
      } as unknown as VendorProductInsightSnapshot;
    }

    it("returns highest and lowest firm-reviewed scores", () => {
      const result = vendorAtAGlanceForVendor([
        scored("a", 52, ["function-tax"]),
        scored("b", 84, ["function-workflow"]),
        scored("c", 70, ["function-payroll"]),
      ]);
      expect(result.productCount).toBe(3);
      expect(result.strongestProduct).toEqual({ id: "b", name: "Product b", score: 84 });
      expect(result.weakestProduct).toEqual({ id: "a", name: "Product a", score: 52 });
      expect(result.functionBucketsCovered).toBe(3);
      expect(result.functionBucketsTotal).toBe(FUNCTION_BUCKET_KEYS.length);
    });

    it("nulls strongest/weakest when every score is null", () => {
      const result = vendorAtAGlanceForVendor([
        scored("a", null, ["function-tax"]),
        scored("b", null, []),
      ]);
      expect(result.productCount).toBe(2);
      expect(result.strongestProduct).toBeNull();
      expect(result.weakestProduct).toBeNull();
      expect(result.functionBucketsCovered).toBe(1);
    });
  });

  describe("openEndedResponsesForEcosystem", () => {
    function openEndedBriefing(
      companyId: string,
      companyName: string,
      responses: Array<{ productId: string; text: string; submittedAt: Date | null }>
    ): AdminCompanyBriefing {
      const openEndedResponses: BriefingProductOpenEndedResponse[] = responses.map(
        (entry, index) => ({
          productId: entry.productId,
          productName: `Product ${entry.productId}`,
          vendorName: "Vendor",
          questionId: `q-${index}`,
          questionKey: `q-key-${index}`,
          questionPrompt: "Tell us more",
          sectionTitle: "Section",
          sectionDescription: "",
          responseText: entry.text,
          submittedAt: entry.submittedAt,
        })
      );
      return {
        company: { id: companyId, name: companyName },
        productLayer: {
          products: [],
          openEndedResponses,
        },
        nextActions: [],
      } as unknown as AdminCompanyBriefing;
    }

    it("slices to 10 most-recent across firms and reports total count", () => {
      const briefingA = openEndedBriefing("firm-a", "Firm A",
        Array.from({ length: 15 }, (_, i) => ({
          productId: "p1",
          text: `A response ${i}`,
          submittedAt: new Date(`2026-04-${String(i + 1).padStart(2, "0")}T12:00:00Z`),
        })),
      );
      const briefingB = openEndedBriefing("firm-b", "Firm B",
        Array.from({ length: 10 }, (_, i) => ({
          productId: "p1",
          text: `B response ${i}`,
          submittedAt: new Date(`2026-05-${String(i + 1).padStart(2, "0")}T12:00:00Z`),
        })),
      );
      const { responses, totalCount } = openEndedResponsesForEcosystem([briefingA, briefingB], 10);
      expect(totalCount).toBe(25);
      expect(responses).toHaveLength(10);
      // most recent should be 2026-05-10
      expect(responses[0].submittedAt).toBe("2026-05-10T12:00:00.000Z");
      expect(responses[0].firmCompanyId).toBe("firm-b");
    });

    it("skips blank responses and reports zeros for empty input", () => {
      const { responses, totalCount } = openEndedResponsesForEcosystem([
        openEndedBriefing("firm-a", "Firm A", [
          { productId: "p1", text: "real", submittedAt: new Date("2026-05-01") },
          { productId: "p1", text: "   ", submittedAt: new Date("2026-05-02") },
        ]),
      ], 10);
      expect(totalCount).toBe(1);
      expect(responses).toHaveLength(1);
      expect(responses[0].response).toBe("real");

      const empty = openEndedResponsesForEcosystem([], 10);
      expect(empty.responses).toHaveLength(0);
      expect(empty.totalCount).toBe(0);
    });
  });
});
