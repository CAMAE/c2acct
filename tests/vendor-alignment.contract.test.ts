import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildVendorAlignmentEliteInsightCards,
  buildVendorAlignmentInsightDetailSurfaceCards,
  buildVendorAlignmentInsightDetailSurfaceContent,
  buildVendorAlignmentInsightBundle,
  buildVendorAlignmentProInsightCards,
  getRequestedVendorAlignmentInsightDetailSurface,
  getRequestedVendorAlignmentInsightOverviewMode,
} from "@/lib/vendorAlignmentInsightEngine";

const ROOT = "/Users/camerongarrett/work/c2acct-live";

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

  it("keeps vendor alignment readiness truthful across empty, partial, and full firm evidence", () => {
    const empty = buildVendorAlignmentInsightBundle({
      sampleSize: 0,
      submissionCount: 0,
      moduleAggregates: [],
      capabilityAggregates: [],
      questionClusters: [],
    });
    const partial = buildFixture({
      sampleSize: 1,
      submissionCount: 5,
      moduleScores: {
        operating: 71,
        automation: 63,
        data: 58,
        governance: 62,
        strategy: 66,
      },
      capabilityScores: {
        firm_capability_operating_model_discipline: 70,
        firm_capability_operating_clarity: 68,
        firm_capability_execution_consistency: 64,
        firm_capability_measurement_visibility: 59,
        firm_capability_automation_ai_readiness: 63,
        firm_capability_change_enablement: 62,
        firm_capability_strategy_change_alignment: 66,
        firm_capability_data_flow_integration: 58,
        firm_capability_control_resilience: 61,
        firm_capability_governance_controls: 62,
        firm_capability_strategic_alignment: 65,
      },
      clusterScores: {
        "operating-discipline": 70,
        "workflow-friction": 55,
        "automation-change": 63,
        "data-integration": 58,
        "controls-risk": 60,
        "strategy-market": 66,
      },
    });
    const full = buildFixture({
      sampleSize: 10,
      submissionCount: 50,
      moduleScores: {
        operating: 78,
        automation: 74,
        data: 71,
        governance: 72,
        strategy: 76,
      },
      capabilityScores: {
        firm_capability_operating_model_discipline: 78,
        firm_capability_operating_clarity: 75,
        firm_capability_execution_consistency: 74,
        firm_capability_measurement_visibility: 72,
        firm_capability_automation_ai_readiness: 74,
        firm_capability_change_enablement: 73,
        firm_capability_strategy_change_alignment: 76,
        firm_capability_data_flow_integration: 71,
        firm_capability_control_resilience: 72,
        firm_capability_governance_controls: 73,
        firm_capability_strategic_alignment: 76,
      },
      clusterScores: {
        "operating-discipline": 77,
        "workflow-friction": 69,
        "automation-change": 74,
        "data-integration": 71,
        "controls-risk": 72,
        "strategy-market": 76,
      },
    });

    const emptyReport = empty.reports.find((report) => report.tier === 1)!;
    const partialReport = partial.reports.find((report) => report.tier === 1)!;
    const fullReport = full.reports.find((report) => report.tier === 1)!;

    expect(empty.confidenceBand).toBe("no_signal");
    expect(emptyReport.currentStateSummary).toMatch(/no completed firm PAT evidence yet/i);
    expect(emptyReport.exactAssessmentBasis).toMatch(/Firm sample size: 0/i);
    expect(emptyReport.confidenceCaveats.join(" ")).toMatch(/No completed firm PAT submissions/i);
    const emptySurface = buildVendorAlignmentInsightDetailSurfaceContent({
      report: emptyReport,
      surface: "pro",
    });
    const emptySurfaceText = emptySurface.items.map((item) => `${item.title} ${item.body}`).join(" ");
    expect(emptySurfaceText).toMatch(/Evidence provenance/i);
    expect(emptySurfaceText).toMatch(/Firm PAT source: 0 assessed firms and 0 final firm module submissions/i);
    expect(emptySurfaceText).toMatch(/insufficient module-pattern evidence/i);
    expect(emptySurfaceText).toMatch(/Insufficient current firm PAT evidence/i);
    expect(partial.confidenceBand).toBe("sample_thin");
    expect(partialReport.confidenceCaveats.join(" ")).toMatch(/based on 1 assessed firm/i);
    expect(full.confidenceBand).toBe("grounded");
    expect(full.confidenceSummary).toMatch(/not claiming benchmark or forecast support/i);
    expect(fullReport.contributingModules.length).toBeGreaterThan(0);
    expect(fullReport.contributingCapabilities.length).toBeGreaterThan(0);
    expect(fullReport.notableQuestionClusters.length).toBeGreaterThan(0);
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

  it("maps overview modes and keeps elite cards non-clickable", () => {
    const bundle = buildFixture({
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

    expect(getRequestedVendorAlignmentInsightOverviewMode(undefined)).toBe("pro");
    expect(getRequestedVendorAlignmentInsightOverviewMode("elite")).toBe("elite");
    expect(getRequestedVendorAlignmentInsightOverviewMode("help")).toBe("help");

    const proCards = buildVendorAlignmentProInsightCards(bundle);
    const eliteCards = buildVendorAlignmentEliteInsightCards(bundle);

    expect(proCards).toHaveLength(8);
    expect(
      proCards.every(
        (card) =>
          card.interactive &&
          card.href?.startsWith("/vendor/alignment-insights/") &&
          // B8-1: Pro cards now carry their own band chip; only the Elite locked
          // card uses the "Coming soon" badge.
          card.statusLabel !== "Coming soon" &&
          !/based on \d+ firm pat sample/i.test(card.summary) &&
          !/sample-thin|emerging signal|grounded current-state signal|no current-state signal/i.test(
            `${card.summary} ${card.supportingText ?? ""}`
          )
      )
    ).toBe(true);
    expect(eliteCards).toHaveLength(3);
    expect(
      eliteCards.every(
        (card) =>
          card.interactive === false &&
          card.href === null &&
          card.tone === "locked" &&
          card.statusLabel === "Coming soon" &&
          card.supportingText === "Unlock with Elite membership"
      )
    ).toBe(true);
  });

  it("keeps direct-route Pro and Elite detail surfaces simple and explanation-first", () => {
    const bundle = buildFixture({
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
    const proReport = bundle.reports.find((report) => report.tier === 1)!;
    const eliteReport = bundle.reports.find((report) => report.tier === 2)!;

    expect(getRequestedVendorAlignmentInsightDetailSurface(undefined)).toBe("pro");
    expect(getRequestedVendorAlignmentInsightDetailSurface("modules")).toBe("pro");
    expect(getRequestedVendorAlignmentInsightDetailSurface("confidence")).toBe("pro");
    expect(getRequestedVendorAlignmentInsightDetailSurface("elite")).toBe("elite");

    const proCards = buildVendorAlignmentInsightDetailSurfaceCards({ report: proReport });
    const eliteCards = buildVendorAlignmentInsightDetailSurfaceCards({ report: eliteReport });

    expect(proCards.map((card) => card.key)).toEqual(["pro", "elite", "help"]);
    expect(eliteCards.map((card) => card.key)).toEqual(["pro", "elite", "help"]);
    expect(proCards.every((card) => card.interactive && card.href?.includes(`surface=${card.key}`))).toBe(true);
    expect(
      proCards.every((card) =>
        card.href?.startsWith(`/vendor/alignment-insights/${proReport.key}?surface=`)
      )
    ).toBe(true);
    expect(eliteCards.every((card) => card.interactive && card.href?.includes(`surface=${card.key}`))).toBe(
      true
    );
    expect(
      eliteCards.every((card) =>
        card.href?.startsWith(`/vendor/alignment-insights/${eliteReport.key}?surface=`)
      )
    ).toBe(true);
    expect(proCards.some((card) => card.title === "Confidence and caveats")).toBe(false);
    expect(proCards.some((card) => card.title === "Assessment basis")).toBe(false);
    expect(proCards.some((card) => card.title === "Module evidence")).toBe(false);
    expect(proCards.some((card) => card.title === "Capability and question evidence")).toBe(false);

    const proSurface = buildVendorAlignmentInsightDetailSurfaceContent({
      report: proReport,
      surface: "pro",
    });
    const eliteSurface = buildVendorAlignmentInsightDetailSurfaceContent({
      report: eliteReport,
      surface: "elite",
    });
    const proHelpSurface = buildVendorAlignmentInsightDetailSurfaceContent({
      report: proReport,
      surface: "help",
    });
    const lockedHelpSurface = buildVendorAlignmentInsightDetailSurfaceContent({
      report: eliteReport,
      surface: "help",
    });
    const proSurfaceText = [
      proSurface.title,
      proSurface.intro,
      ...proSurface.items.flatMap((item) => [item.title, item.body]),
    ].join(" ");
    const eliteSurfaceText = [
      eliteSurface.title,
      eliteSurface.intro,
      ...eliteSurface.items.flatMap((item) => [item.title, item.body]),
    ].join(" ");
    const proHelpSurfaceText = proHelpSurface.items.map((item) => `${item.title} ${item.body}`).join(" ");
    const lockedHelpSurfaceText = lockedHelpSurface.items.map((item) => `${item.title} ${item.body}`).join(" ");

    expect(proSurface.title).toBe("Pro");
    expect(proSurface.items.map((item) => item.title)).toEqual([
      "Current PAT picture",
      "Evidence provenance",
      "Where the signal is strongest",
      "Where the signal is under pressure",
      "Current limits",
    ]);
    expect(proSurfaceText).toMatch(/Firm PAT source: 9 assessed firms and 45 final firm module submissions/i);
    expect(proSurfaceText).toMatch(/Module patterns:/i);
    expect(proSurfaceText).toMatch(/Capability evidence:/i);
    expect(proSurfaceText).toMatch(/Question-cluster evidence:/i);
    expect(proSurfaceText).toMatch(/PAT uses only current firm PAT signal/i);
    expect(proSurfaceText).not.toMatch(
      /benchmark proof is available|projection proof is available|scenario proof is available/i
    );
    expect(proHelpSurface.items.map((item) => item.title)).toEqual([
      "What it is",
      "Why it matters",
      "How to use it",
      "Evidence provenance",
    ]);
    expect(proHelpSurfaceText).toMatch(/Firm PAT source:/i);
    expect(proSurfaceText).not.toContain("Confidence and caveats");
    expect(proSurfaceText).not.toContain("Assessment basis");
    expect(proSurfaceText).not.toContain("Module evidence");
    expect(proSurfaceText).not.toContain("Capability and question evidence");
    expect(proSurfaceText).not.toContain("Freshness:");
    expect(proSurfaceText).not.toContain("Sample:");
    expect(proSurfaceText).not.toMatch(/Caveat \d+/);
    expect(eliteSurface.title).toBe("Elite");
    expect(eliteSurface.items.map((item) => item.title)).toEqual([
      "What it is",
      "Why it matters",
      "How to use it",
      "Locked Elite boundary",
    ]);
    expect(eliteSurfaceText).toContain("not a live Elite interpretation");
    expect(eliteSurfaceText).toContain("Unlock with Elite membership");
    expect(eliteSurfaceText).toContain("not claiming benchmark, projection, scenario, customer, or market-wide proof");
    expect(eliteSurfaceText).not.toMatch(/Elite insight is live/i);
    expect(
      lockedHelpSurface.items.map((item) => item.title)
    ).toEqual(["What it is", "Why it matters", "How to use it", "Locked Elite boundary"]);
    expect(lockedHelpSurfaceText).toMatch(/Elite insight is not live/i);
  });

  it("keeps the vendor alignment detail route on the cleaned shared shell", () => {
    const text = readFileSync(
      path.join(ROOT, "app/vendor/alignment-insights/[key]/page.tsx"),
      "utf8"
    );

    expect(text).toContain('import InsightDetailShell from "@/app/components/insights/InsightDetailShell";');
    expect(text).toContain("<InsightDetailShell");
    expect(text).not.toContain("PatModeToggle");
    expect(text).not.toContain("Confidence and caveats");
    expect(text).not.toContain("Assessment basis");
    expect(text).not.toContain("Module evidence");
    expect(text).not.toContain("Capability and question evidence");
    expect(text).not.toContain("Freshness:");
    expect(text).not.toContain("Sample:");
    expect(text).not.toMatch(/Caveat \d+/);
  });

  it("keeps the vendor alignment overview route free of count-led hero copy", () => {
    const text = readFileSync(
      path.join(ROOT, "app/vendor/alignment-insights/page.tsx"),
      "utf8"
    );

    expect(text).not.toContain("across ${bundle.sampleSize} firms");
  });
});
