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
        sampleSize: input.sampleSize,
      },
      {
        key: "firm_alignment_automation_ai_v1",
        title: "Automation and AI Readiness",
        averageScore: input.moduleScores.automation,
        sampleSize: input.sampleSize,
      },
      {
        key: "firm_alignment_data_flow_v1",
        title: "Integration and Data Flow Maturity",
        averageScore: input.moduleScores.data,
        sampleSize: input.sampleSize,
      },
      {
        key: "firm_alignment_governance_v1",
        title: "Governance, Controls, and Vendor Risk",
        averageScore: input.moduleScores.governance,
        sampleSize: input.sampleSize,
      },
      {
        key: "firm_alignment_strategy_v1",
        title: "Strategy, Change Readiness, and Market Alignment",
        averageScore: input.moduleScores.strategy,
        sampleSize: input.sampleSize,
      },
    ],
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

const steadyFixture = buildFixture({
  sampleSize: 8,
  submissionCount: 40,
  moduleScores: {
    operating: 74,
    automation: 70,
    data: 66,
    governance: 68,
    strategy: 72,
  },
  capabilityScores: {
    firm_capability_operating_model_discipline: 73,
    firm_capability_operating_clarity: 71,
    firm_capability_execution_consistency: 69,
    firm_capability_measurement_visibility: 66,
    firm_capability_automation_ai_readiness: 72,
    firm_capability_change_enablement: 68,
    firm_capability_strategy_change_alignment: 70,
    firm_capability_data_flow_integration: 64,
    firm_capability_control_resilience: 65,
    firm_capability_governance_controls: 67,
    firm_capability_strategic_alignment: 71,
  },
  clusterScores: {
    "operating-discipline": 73,
    "workflow-friction": 62,
    "automation-change": 71,
    "data-integration": 64,
    "controls-risk": 66,
    "strategy-market": 72,
  },
});

const strainedFixture = buildFixture({
  sampleSize: 8,
  submissionCount: 40,
  moduleScores: {
    operating: 58,
    automation: 76,
    data: 49,
    governance: 53,
    strategy: 61,
  },
  capabilityScores: {
    firm_capability_operating_model_discipline: 57,
    firm_capability_operating_clarity: 55,
    firm_capability_execution_consistency: 52,
    firm_capability_measurement_visibility: 48,
    firm_capability_automation_ai_readiness: 75,
    firm_capability_change_enablement: 60,
    firm_capability_strategy_change_alignment: 63,
    firm_capability_data_flow_integration: 46,
    firm_capability_control_resilience: 50,
    firm_capability_governance_controls: 54,
    firm_capability_strategic_alignment: 61,
  },
  clusterScores: {
    "operating-discipline": 57,
    "workflow-friction": 43,
    "automation-change": 73,
    "data-integration": 45,
    "controls-risk": 49,
    "strategy-market": 61,
  },
});

const proReports = steadyFixture.reports.filter((report) => report.tier === 1);
assert.equal(proReports.length, 8, "Expected expanded Pro catalog with 8 insights.");
assert.equal(steadyFixture.confidenceBand, "emerging", "Eight firms should register as emerging signal.");

const eliteReports = steadyFixture.reports.filter((report) => report.tier === 2);
assert.equal(eliteReports.length, 3, "Expected 3 staged Elite cards.");
assert.ok(eliteReports.every((report) => report.locked), "Elite cards should remain locked.");

const steadyIntegration = steadyFixture.reports.find(
  (report) => report.key === "integration-strain"
);
const strainedIntegration = strainedFixture.reports.find(
  (report) => report.key === "integration-strain"
);
assert.ok(steadyIntegration, "Expected integration-strain insight.");
assert.ok(strainedIntegration, "Expected integration-strain insight after distribution change.");
assert.notEqual(
  steadyIntegration?.exactAssessmentBasis,
  strainedIntegration?.exactAssessmentBasis,
  "Insight basis should change when module and capability distributions change."
);

const thinFixture = buildFixture({
  sampleSize: 2,
  submissionCount: 10,
  moduleScores: {
    operating: 61,
    automation: 63,
    data: 58,
    governance: 57,
    strategy: 60,
  },
  capabilityScores: {
    firm_capability_operating_model_discipline: 60,
    firm_capability_operating_clarity: 59,
    firm_capability_execution_consistency: 58,
    firm_capability_measurement_visibility: 56,
    firm_capability_automation_ai_readiness: 63,
    firm_capability_change_enablement: 61,
    firm_capability_strategy_change_alignment: 60,
    firm_capability_data_flow_integration: 57,
    firm_capability_control_resilience: 55,
    firm_capability_governance_controls: 56,
    firm_capability_strategic_alignment: 60,
  },
  clusterScores: {
    "operating-discipline": 60,
    "workflow-friction": 55,
    "automation-change": 62,
    "data-integration": 57,
    "controls-risk": 54,
    "strategy-market": 60,
  },
});
assert.equal(thinFixture.confidenceBand, "sample_thin", "Two firms should remain sample-thin only.");
assert.match(
  thinFixture.confidenceSummary,
  /sample-thin rather than broad market signal/i,
  "Thin vendor alignment samples should be described as sample-thin."
);
assert.ok(
  thinFixture.reports
    .filter((report) => !report.locked)
    .every((report) => /sample-thin/i.test(report.confidenceSummary)),
  "Thin Pro reports should carry sample-thin confidence language."
);

console.log(
  "PASS smoke-vendor-alignment-engine: expanded Pro catalog renders, basis shifts with PAT signal changes, and thin samples stay sample-thin."
);
