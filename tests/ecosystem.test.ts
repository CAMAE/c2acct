import { describe, expect, it } from "vitest";

import type { AdminCompanyBriefing, BriefingCatalogItem } from "@/lib/adminBriefingEngine";
import {
  HOT_DIVERGENCE_THRESHOLD,
  aggregateFirmConfidence,
  avgFirmAlignmentScore,
  avgModuleCompletion,
  countHotDivergences,
  countThirtyDayActions,
} from "@/lib/ecosystem";
import type { FirmAlignmentProgressSummary } from "@/lib/firmPat";

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
});
