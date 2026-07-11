import { describe, expect, it } from "vitest";
import {
  buildBriefingActionPlan,
  buildRiskOpportunityPanels,
  filterBriefingOpenEndedResponses,
} from "@/lib/adminBriefingEngine";

describe("admin briefing engine contracts", () => {
  it("builds deterministic 30/60/90 actions from live weak points", () => {
    const actions = buildBriefingActionPlan({
      weakestModuleTitle: "Data Flow and Controls",
      weakestProductTitle: "LedgerFlow",
      missingUserCoverage: true,
      ecosystemCaveat: "The ecosystem layer remains directional.",
    });

    expect(actions).toHaveLength(3);
    expect(actions[0].window).toBe("30 days");
    // WS11-D Block H.2: "individual" / "person-level" language dropped from
    // the 30-day action. The missingUserCoverage branch is still identifiable
    // via "additional operating evidence" + reference to firm-side signal.
    expect(actions[0].detail).toMatch(/additional operating evidence|firm-side signal/i);
    expect(actions[1].detail).toMatch(/LedgerFlow/);
    expect(actions[2].evidence).toMatch(/directional/i);
  });

  it("builds risk and opportunity panels from weakest and strongest evidence", () => {
    const panels = buildRiskOpportunityPanels({
      weakestModule: {
        key: "firm_alignment_data_flow_v1",
        title: "Data Flow and Controls",
        canonicalScore: 42,
        confidenceScore: 0.74,
        latestSubmittedAt: new Date("2026-03-30T00:00:00.000Z"),
        sectionScores: [],
      },
      strongestModule: {
        key: "firm_alignment_operating_model_v1",
        title: "Operating Model",
        canonicalScore: 84,
        confidenceScore: 0.92,
        latestSubmittedAt: new Date("2026-03-30T00:00:00.000Z"),
        sectionScores: [],
      },
      products: [
        {
          productId: "prod_1",
          productName: "LedgerFlow",
          vendorName: "Vendor A",
          canonicalFirmReviewScore: 41,
          firmReviewCount: 2,
          vendorSelfReportedScore: 82,
          combinedCurrentReadout: "LedgerFlow combines uneven product evidence.",
          divergenceLabel: "Vendor self-view is running above firm-reviewed signal",
          confidenceLabel: "Directional",
          confidenceSummary: "Signal is still thin.",
          latestUpdatedAt: new Date("2026-03-30T00:00:00.000Z"),
          utilityLabels: ["AP automation"],
          taxonomyTitles: ["Payables"],
          capabilityKeys: ["controls"],
          latestVendorAssessmentSubmittedAt: new Date("2026-03-29T00:00:00.000Z"),
          openEndedResponseCount: 10,
        },
        {
          productId: "prod_2",
          productName: "CloseMap",
          vendorName: "Vendor B",
          canonicalFirmReviewScore: 88,
          firmReviewCount: 4,
          vendorSelfReportedScore: 85,
          combinedCurrentReadout: "CloseMap is aligned.",
          divergenceLabel: "Vendor self-view and firm review are closely aligned",
          confidenceLabel: "Limited signal",
          confidenceSummary: "Signal is useful.",
          latestUpdatedAt: new Date("2026-03-30T00:00:00.000Z"),
          utilityLabels: ["Close"],
          taxonomyTitles: ["Close"],
          capabilityKeys: ["controls"],
          latestVendorAssessmentSubmittedAt: new Date("2026-03-29T00:00:00.000Z"),
          openEndedResponseCount: 8,
        },
      ],
      ecosystemSummary: "The ecosystem layer is current-state PAT context only.",
      individualCoverageText: "Only 1 of 4 linked users has person-level PAT evidence.",
    });

    expect(panels.risks[0].title).toMatch(/Data Flow and Controls/);
    expect(panels.risks[1].title).toMatch(/LedgerFlow/);
    expect(panels.opportunities[0].title).toMatch(/Operating Model/);
    expect(panels.opportunities[1].title).toMatch(/CloseMap/);
  });

  it("filters latest vendor open-ended responses by product, question, or answer text", () => {
    const responses = [
      {
        productId: "prod_1",
        productName: "LedgerFlow",
        vendorName: "Vendor A",
        questionId: "product_open_ended_v1__strongest_workflow",
        questionKey: "strongest_workflow",
        questionPrompt: "In which workflow or operating situation does this product currently look strongest, and what evidence supports that read?",
        sectionTitle: "Operating readout and current fit",
        sectionDescription: "Narrative PAT context.",
        responseText: "Month-end close orchestration is the strongest current workflow.",
        submittedAt: new Date("2026-03-30T00:00:00.000Z"),
      },
      {
        productId: "prod_2",
        productName: "CloseMap",
        vendorName: "Vendor B",
        questionId: "product_open_ended_v1__integration_gap",
        questionKey: "integration_gap",
        questionPrompt: "What integration, data, or interoperability gap matters most before PAT should treat this product as stronger than directional?",
        sectionTitle: "Follow-up, evidence, and next action",
        sectionDescription: "Narrative PAT context.",
        responseText: "ERP mapping remains the main integration gap.",
        submittedAt: new Date("2026-03-30T00:00:00.000Z"),
      },
    ];

    expect(filterBriefingOpenEndedResponses(responses, "ledger")).toHaveLength(1);
    expect(filterBriefingOpenEndedResponses(responses, "integration")).toHaveLength(1);
    expect(filterBriefingOpenEndedResponses(responses, "close")).toHaveLength(2);
  });
});
