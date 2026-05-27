import assert from "node:assert/strict";
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
    ].map((module) => ({
      ...module,
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

const baselineProReports = baseline.reports.filter((report) => report.tier === 1);
assert.equal(baselineProReports.length, 8, "Expected launch Pro vendor alignment catalog depth.");
assert.ok(
  baselineProReports.every(
    (report) =>
      report.exactAssessmentBasis.length > 0 &&
      report.contributingModules.length > 0 &&
      report.notableQuestionClusters.length > 0
  ),
  "Every visible Pro report should expose concrete PAT basis data."
);

const eliteReports = baseline.reports.filter((report) => report.tier === 2);
assert.equal(eliteReports.length, 3, "Expected three staged Elite vendor alignment reports.");
assert.ok(eliteReports.every((report) => report.locked), "Elite reports must remain visibly staged and locked.");

const baselineRisk = baseline.reports.find((report) => report.key === "implementation-risk-posture");
const shiftedRisk = shifted.reports.find((report) => report.key === "implementation-risk-posture");
assert.ok(baselineRisk && shiftedRisk, "Expected implementation risk posture report in both fixtures.");
assert.notEqual(
  baselineRisk?.exactAssessmentBasis,
  shiftedRisk?.exactAssessmentBasis,
  "Vendor alignment basis should move when underlying PAT distributions move."
);

console.log(
  "PASS smoke-vendor-alignment-catalog: Pro inventory is populated, basis is present, and narrative shifts with PAT signal changes."
);
