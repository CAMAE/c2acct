import { describe, expect, it } from "vitest";
import { getVendorAlignmentOverviewCard } from "@/lib/vendorAlignmentInsightCards";
import { getVendorAlignmentInsightContent } from "@/lib/insightContent";
import { buildVendorAlignmentInsightBundle } from "@/lib/vendorAlignmentInsightEngine";

function buildFixture(input: {
  sampleSize: number;
  submissionCount: number;
  moduleScores: Record<string, number>;
  capabilityScores: Record<string, number>;
  clusterScores: Record<string, number>;
}) {
  return buildVendorAlignmentInsightBundle({
    sampleSize: input.sampleSize,
    submissionCount: input.submissionCount,
    moduleAggregates: [
      {
        key: "firm_alignment_operating_model_v1",
        title: "Operating Model and Workflow Discipline",
        averageScore: input.moduleScores.operating,
      },
      {
        key: "firm_alignment_automation_ai_v1",
        title: "Automation and AI Readiness",
        averageScore: input.moduleScores.automation,
      },
      {
        key: "firm_alignment_data_flow_v1",
        title: "Integration and Data Flow Maturity",
        averageScore: input.moduleScores.data,
      },
      {
        key: "firm_alignment_governance_v1",
        title: "Governance, Controls, and Vendor Risk",
        averageScore: input.moduleScores.governance,
      },
      {
        key: "firm_alignment_strategy_v1",
        title: "Strategy, Change Readiness, and Market Alignment",
        averageScore: input.moduleScores.strategy,
      },
    ].map((moduleAggregate) => ({
      ...moduleAggregate,
      sampleSize: input.sampleSize,
    })),
    capabilityAggregates: [
      ["firm_capability_operating_model_discipline", "Operating model discipline"],
      ["firm_capability_operating_clarity", "Operating clarity"],
      ["firm_capability_execution_consistency", "Execution consistency"],
      ["firm_capability_measurement_visibility", "Measurement and visibility"],
      ["firm_capability_automation_ai_readiness", "Automation and AI readiness"],
      ["firm_capability_change_enablement", "Change enablement"],
      ["firm_capability_strategy_change_alignment", "Strategy and change alignment"],
      ["firm_capability_data_flow_integration", "Data flow and integration maturity"],
      ["firm_capability_control_resilience", "Control and resilience"],
      ["firm_capability_governance_controls", "Governance and control discipline"],
      ["firm_capability_strategic_alignment", "Strategic alignment"],
    ].map(([key, title]) => ({
      key,
      title,
      description: null,
      averageScore: input.capabilityScores[key] ?? null,
      sampleSize: input.sampleSize,
    })),
    questionClusters: [
      ["operating-discipline", "Operating discipline and ownership"],
      ["workflow-friction", "Workflow handoffs and friction"],
      ["automation-change", "Automation support and change absorption"],
      ["data-integration", "Data flow, integration, and visibility"],
      ["controls-risk", "Controls, resilience, and risk surfacing"],
      ["strategy-market", "Strategy and market adaptability"],
    ].map(([key, title]) => ({
      key,
      title,
      averageScore: input.clusterScores[key] ?? 0,
      questionCount: 3,
      responseCount: input.sampleSize * 3,
      questionStemSample: [title],
      moduleTitles: ["Fixture"],
    })),
  });
}

describe("vendor alignment catalog", () => {
  it("ships a launch-sufficient Pro catalog with concrete basis data", () => {
    const baseline = buildFixture({
      sampleSize: 9,
      submissionCount: 45,
      moduleScores: {
        operating: 74,
        automation: 71,
        data: 66,
        governance: 69,
        strategy: 72,
      },
      capabilityScores: {
        firm_capability_operating_model_discipline: 73,
        firm_capability_operating_clarity: 71,
        firm_capability_execution_consistency: 68,
        firm_capability_measurement_visibility: 66,
        firm_capability_automation_ai_readiness: 72,
        firm_capability_change_enablement: 69,
        firm_capability_strategy_change_alignment: 70,
        firm_capability_data_flow_integration: 65,
        firm_capability_control_resilience: 64,
        firm_capability_governance_controls: 67,
        firm_capability_strategic_alignment: 71,
      },
      clusterScores: {
        "operating-discipline": 73,
        "workflow-friction": 62,
        "automation-change": 71,
        "data-integration": 65,
        "controls-risk": 64,
        "strategy-market": 72,
      },
    });

    const proReports = baseline.reports.filter((report) => report.tier === 1);
    const eliteReports = baseline.reports.filter((report) => report.tier === 2);

    expect(proReports).toHaveLength(8);
    expect(
      proReports.every(
        (report) =>
          report.exactAssessmentBasis.length > 0 &&
          report.contributingModules.length > 0 &&
          report.notableQuestionClusters.length > 0
      )
    ).toBe(true);
    expect(eliteReports).toHaveLength(3);
    expect(eliteReports.every((report) => report.locked)).toBe(true);
  });

  it("changes insight basis when the underlying PAT distribution changes", () => {
    const baseline = buildFixture({
      sampleSize: 9,
      submissionCount: 45,
      moduleScores: {
        operating: 74,
        automation: 71,
        data: 66,
        governance: 69,
        strategy: 72,
      },
      capabilityScores: {
        firm_capability_operating_model_discipline: 73,
        firm_capability_operating_clarity: 71,
        firm_capability_execution_consistency: 68,
        firm_capability_measurement_visibility: 66,
        firm_capability_automation_ai_readiness: 72,
        firm_capability_change_enablement: 69,
        firm_capability_strategy_change_alignment: 70,
        firm_capability_data_flow_integration: 65,
        firm_capability_control_resilience: 64,
        firm_capability_governance_controls: 67,
        firm_capability_strategic_alignment: 71,
      },
      clusterScores: {
        "operating-discipline": 73,
        "workflow-friction": 62,
        "automation-change": 71,
        "data-integration": 65,
        "controls-risk": 64,
        "strategy-market": 72,
      },
    });

    const shifted = buildFixture({
      sampleSize: 9,
      submissionCount: 45,
      moduleScores: {
        operating: 58,
        automation: 77,
        data: 47,
        governance: 53,
        strategy: 61,
      },
      capabilityScores: {
        firm_capability_operating_model_discipline: 57,
        firm_capability_operating_clarity: 56,
        firm_capability_execution_consistency: 52,
        firm_capability_measurement_visibility: 47,
        firm_capability_automation_ai_readiness: 76,
        firm_capability_change_enablement: 62,
        firm_capability_strategy_change_alignment: 64,
        firm_capability_data_flow_integration: 45,
        firm_capability_control_resilience: 49,
        firm_capability_governance_controls: 54,
        firm_capability_strategic_alignment: 60,
      },
      clusterScores: {
        "operating-discipline": 57,
        "workflow-friction": 43,
        "automation-change": 74,
        "data-integration": 45,
        "controls-risk": 48,
        "strategy-market": 61,
      },
    });

    const baselineRisk = baseline.reports.find((report) => report.key === "implementation-risk-posture");
    const shiftedRisk = shifted.reports.find((report) => report.key === "implementation-risk-posture");

    expect(baselineRisk).toBeTruthy();
    expect(shiftedRisk).toBeTruthy();
    expect(baselineRisk?.exactAssessmentBasis).not.toEqual(shiftedRisk?.exactAssessmentBasis);
  });

  it("builds concise overview cards with valid detail routes for visible and locked reports", () => {
    const baseline = buildFixture({
      sampleSize: 2,
      submissionCount: 10,
      moduleScores: {
        operating: 61,
        automation: 58,
        data: 52,
        governance: 55,
        strategy: 59,
      },
      capabilityScores: {
        firm_capability_operating_model_discipline: 60,
        firm_capability_operating_clarity: 58,
        firm_capability_execution_consistency: 57,
        firm_capability_measurement_visibility: 51,
        firm_capability_automation_ai_readiness: 56,
        firm_capability_change_enablement: 54,
        firm_capability_strategy_change_alignment: 59,
        firm_capability_data_flow_integration: 50,
        firm_capability_control_resilience: 53,
        firm_capability_governance_controls: 55,
        firm_capability_strategic_alignment: 57,
      },
      clusterScores: {
        "operating-discipline": 60,
        "workflow-friction": 48,
        "automation-change": 57,
        "data-integration": 50,
        "controls-risk": 52,
        "strategy-market": 59,
      },
    });

    const visibleCard = getVendorAlignmentOverviewCard(
      baseline.reports.find((report) => report.key === "implementation-risk-posture")!
    );
    const lockedCard = getVendorAlignmentOverviewCard(
      baseline.reports.find((report) => report.key === "benchmark-comparison")!
    );

    expect(visibleCard.href).toBe("/vendor/alignment-insights/implementation-risk-posture");
    expect(visibleCard.summary.length).toBeLessThan(
      baseline.reports.find((report) => report.key === "implementation-risk-posture")!.currentStateSummary.length + 1
    );
    expect(visibleCard.metaLine).toContain("2 firm samples");
    expect(visibleCard.locked).toBe(false);

    expect(lockedCard.href).toBe("/vendor/alignment-insights/benchmark-comparison");
    expect(lockedCard.locked).toBe(true);
    expect(lockedCard.metaLine).toContain("Staged only");
    expect(lockedCard.lockedTitle).toMatch(/does not imply/i);
  });

  it("keeps overview and detail content in parity for every report route", () => {
    const baseline = buildFixture({
      sampleSize: 4,
      submissionCount: 20,
      moduleScores: {
        operating: 66,
        automation: 63,
        data: 58,
        governance: 60,
        strategy: 64,
      },
      capabilityScores: {
        firm_capability_operating_model_discipline: 65,
        firm_capability_operating_clarity: 63,
        firm_capability_execution_consistency: 61,
        firm_capability_measurement_visibility: 58,
        firm_capability_automation_ai_readiness: 62,
        firm_capability_change_enablement: 60,
        firm_capability_strategy_change_alignment: 64,
        firm_capability_data_flow_integration: 57,
        firm_capability_control_resilience: 59,
        firm_capability_governance_controls: 60,
        firm_capability_strategic_alignment: 63,
      },
      clusterScores: {
        "operating-discipline": 65,
        "workflow-friction": 54,
        "automation-change": 62,
        "data-integration": 57,
        "controls-risk": 59,
        "strategy-market": 64,
      },
    });

    for (const report of baseline.reports) {
      const card = getVendorAlignmentOverviewCard(report);
      const content = getVendorAlignmentInsightContent(report.key);

      expect(card.href).toBe(`/vendor/alignment-insights/${report.key}`);
      expect(card.summary.length).toBeGreaterThan(0);
      expect(report.exactAssessmentBasis.length).toBeGreaterThan(0);
      if (report.locked) {
        expect(content?.lockedState?.summary ?? report.currentStateSummary).toContain(card.summary.slice(0, 10));
      } else {
        expect(report.currentStateSummary).toContain(card.summary.slice(0, 10));
      }
    }
  });
});
