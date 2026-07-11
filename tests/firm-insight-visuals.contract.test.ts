import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import DivergenceBar from "@/app/components/charts/DivergenceBar";
import ProgressMeter from "@/app/components/charts/ProgressMeter";
import RadarChart from "@/app/components/charts/RadarChart";
import RankedBars from "@/app/components/charts/RankedBars";
import ScoreLockup from "@/app/components/charts/ScoreLockup";
import { getScoreBand } from "@/lib/scoreBands";
import {
  buildFirmInsightCardMetric,
  buildFirmInsightCardSummary,
  buildFirmInsightPlainLanguage,
  buildFirmProInsightCards,
  type FirmInsightReport,
} from "@/lib/firmInsightEngine";
import { FIRM_TIER1_INSIGHT_DEFINITIONS } from "@/lib/firmPat";

type InsightKey = (typeof FIRM_TIER1_INSIGHT_DEFINITIONS)[number]["key"];

function moduleEvidence(key: string, title: string, score: number | null) {
  return {
    key,
    title,
    score,
    submittedAt: score === null ? null : new Date("2026-06-01T12:00:00.000Z"),
    sectionKey: key,
    sectionTitle: title,
  };
}

const modules = [
  moduleEvidence("firm_alignment_operating_model_v1", "Operating Model and Workflow Discipline", 80),
  moduleEvidence("firm_alignment_automation_ai_v1", "Automation and AI Readiness", 74),
  moduleEvidence("firm_alignment_data_flow_v1", "Integration and Data Flow Maturity", 65),
  moduleEvidence("firm_alignment_governance_v1", "Governance, Controls, and Vendor Risk", 71),
  moduleEvidence("firm_alignment_strategy_v1", "Strategy, Change Readiness, and Market Alignment", 77),
];

function reportFixture(key: InsightKey): FirmInsightReport {
  return {
    key,
    title: "Fixture insight",
    sampleSize: 5,
    latestUpdatedAt: new Date("2026-06-01T12:00:00.000Z"),
    confidenceBand: "emerging",
    confidenceLabel: "Limited signal",
    confidenceSummary: "Fixture confidence summary.",
    currentStateSummary:
      "Fixture insight shows the current operating picture, with the strongest support in Operating Model.",
    what: "Fixture what.",
    why: "Fixture why.",
    how: "Fixture how.",
    basisSummary: "Fixture basis.",
    contributingModules: modules,
    strongestModules: [modules[0]],
    weakestModules: [modules[2]],
    contributingCapabilities: [
      {
        key: "firm_capability_data_confidence",
        title: "Data confidence",
        description: null,
        score: 87,
        threshold: 60,
        meetsThreshold: true,
      },
      {
        key: "firm_capability_control_discipline",
        title: "Control discipline",
        description: null,
        score: 52,
        threshold: 60,
        meetsThreshold: false,
      },
    ],
    notableQuestionClusters: [],
    confidenceCaveats: ["Only 5 of 5 relevant modules have final submissions."],
  };
}

const TIER1_KEYS = FIRM_TIER1_INSIGHT_DEFINITIONS.map((insight) => insight.key) as InsightKey[];

describe("score bands", () => {
  it("maps scores to the five ruled maturity bands (B8-2)", () => {
    expect(getScoreBand(0).label).toBe("Early");
    expect(getScoreBand(39).label).toBe("Early");
    expect(getScoreBand(40).label).toBe("Developing");
    expect(getScoreBand(59).label).toBe("Developing");
    expect(getScoreBand(60).label).toBe("Building");
    expect(getScoreBand(74).label).toBe("Building");
    expect(getScoreBand(75).label).toBe("Established");
    expect(getScoreBand(89).label).toBe("Established");
    expect(getScoreBand(90).label).toBe("Leading");
    expect(getScoreBand(100).label).toBe("Leading");
  });
});

describe("varied firm insight card copy", () => {
  it("produces a distinct summary per tier-1 insight and drops the boilerplate pattern", () => {
    const summaries = TIER1_KEYS.map((key) => buildFirmInsightCardSummary(key, reportFixture(key)));

    expect(summaries.every((summary) => typeof summary === "string" && summary.length > 0)).toBe(true);
    expect(new Set(summaries).size).toBe(TIER1_KEYS.length);
    for (const summary of summaries) {
      expect(summary).not.toContain("shows the current operating picture");
      expect(summary).not.toMatch(
        /sample-thin|emerging signal|grounded current-state signal|no current-state signal/i
      );
    }
  });

  it("attaches one varied real number per card", () => {
    const metrics = TIER1_KEYS.map((key) => buildFirmInsightCardMetric(key, reportFixture(key)));

    expect(metrics.map((metric) => metric?.value)).toEqual(["73%", "74%", "1 of 2", "15 pts"]);
    expect(new Set(metrics.map((metric) => metric?.caption)).size).toBe(TIER1_KEYS.length);
  });

  it("keeps overview cards on the varied copy when a report is present", () => {
    const reports = new Map(TIER1_KEYS.map((key) => [key, reportFixture(key)]));
    const cards = buildFirmProInsightCards({ reports, unlockedKeys: new Set(TIER1_KEYS) });

    expect(cards).toHaveLength(TIER1_KEYS.length);
    for (const card of cards) {
      expect(card.summary).not.toContain("shows the current operating picture");
      expect(card.metric).toBeTruthy();
    }
  });

  it("falls back to a single-module readout when only one module is scored", () => {
    const report = reportFixture("firm_tier1_change_alignment");
    const single = {
      ...report,
      contributingModules: [modules[0], moduleEvidence("firm_alignment_data_flow_v1", "Integration and Data Flow Maturity", null)],
      strongestModules: [modules[0]],
      weakestModules: [modules[0]],
    };

    expect(buildFirmInsightCardSummary("firm_tier1_change_alignment", single)).toContain(
      "Current evidence rests on Operating Model and Workflow Discipline at 80%"
    );
    expect(buildFirmInsightCardMetric("firm_tier1_change_alignment", single)).toEqual({
      value: "80%",
      caption: "average module score",
    });
  });
});

describe("plain-language insight summary", () => {
  it("builds the zero-context readout from the same payload, including tech-stack framing", () => {
    const plain = buildFirmInsightPlainLanguage(reportFixture("firm_tier1_operating_baseline"));

    // B8-2: 73 now falls in the Building band (60-74).
    expect(plain?.summary).toContain("Your firm scores 73 — Building.");
    expect(plain?.summary).toContain(
      "Your strongest area is Operating Model and Workflow Discipline; your biggest opportunity is Integration and Data Flow Maturity at 65%."
    );
    expect(plain?.summary).toContain(
      "A score in the building range generally means core workflows are taking shape but still lean on individual effort, but integration work becomes the friction point when new tools enter your stack"
    );
    expect(plain?.summary).toContain(
      "Raising Integration and Data Flow Maturity first typically increases the return on every later software decision"
    );
    expect(plain?.summary).toContain(
      "With every relevant module at final submission, this is a complete current-state picture to evaluate new software against."
    );
    expect(plain?.summary.split(/(?<=\.)\s+/)).toHaveLength(5);
    expect(plain?.nextSteps).toEqual([
      "Bring Control discipline above 60% to unlock the full readout.",
    ]);
  });

  it("varies the tech-stack sentences by band and by weakest-module theme", () => {
    const report = reportFixture("firm_tier1_operating_baseline");
    const governanceWeakest = {
      ...report,
      contributingModules: report.contributingModules.map((module) =>
        module.key === "firm_alignment_governance_v1" ? { ...module, score: 41 } : module
      ),
      weakestModules: [moduleEvidence("firm_alignment_governance_v1", "Governance, Controls, and Vendor Risk", 41)],
    };
    const dataFlowSummary = buildFirmInsightPlainLanguage(report)?.summary;
    const governanceSummary = buildFirmInsightPlainLanguage(governanceWeakest)?.summary;

    expect(governanceSummary).toContain("vendor and control discipline becomes the friction point");
    expect(dataFlowSummary).toContain("integration work becomes the friction point");
    expect(governanceSummary).not.toBe(dataFlowSummary);
    // B8-2: both averages sit in the Building band now; the sentences differ by
    // the weakest-module friction theme, not the band clause.
    expect(governanceSummary).toContain("A score in the building range generally means core workflows are taking shape");
  });

  it("counts remaining modules and stays current-state only across the expanded copy", () => {
    const report = reportFixture("firm_tier1_operating_baseline");
    const partial = {
      ...report,
      contributingModules: [
        ...report.contributingModules.slice(0, 3),
        moduleEvidence("firm_alignment_governance_v1", "Governance, Controls, and Vendor Risk", null),
        moduleEvidence("firm_alignment_strategy_v1", "Strategy, Change Readiness, and Market Alignment", null),
      ],
    };
    const plain = buildFirmInsightPlainLanguage(partial);

    expect(plain?.summary).toContain("Completing the remaining 2 modules sharpens this picture.");
    expect(plain?.summary).toContain(
      "As more modules reach final submission, this readout firms up from partial evidence into a complete current-state picture."
    );
    expect(plain?.summary.split(/(?<=\.)\s+/)).toHaveLength(6);
    for (const summary of [
      plain?.summary,
      buildFirmInsightPlainLanguage(report)?.summary,
    ]) {
      expect(summary).not.toMatch(/benchmark|percentile|projection|forecast|peer|industry average|typical firm/i);
    }
  });

  it("returns null when no module evidence is scored", () => {
    const report = reportFixture("firm_tier1_operating_baseline");
    const empty = {
      ...report,
      contributingModules: report.contributingModules.map((module) => ({
        ...module,
        score: null,
        submittedAt: null,
      })),
    };

    expect(buildFirmInsightPlainLanguage(empty)).toBeNull();
  });
});

describe("chart component kit", () => {
  it("renders ScoreLockup with a band chip and context line", () => {
    const html = renderToStaticMarkup(
      createElement(ScoreLockup, {
        label: "Alignment index",
        score: 74,
        delta: 3.5,
        context: "Average of final module scores",
      })
    );

    expect(html).toContain("74 · Building");
    expect(html).toContain("text-[40px]");
    expect(html).toContain("+3.5");
    expect(html).toContain("Average of final module scores");
  });

  it("renders compound lockup values as slash-joined numerals in one bold ink run", () => {
    const html = renderToStaticMarkup(
      createElement(ScoreLockup, {
        label: "Modules complete",
        score: null,
        displayValue: "4/5",
      })
    );

    expect(html).toContain(">4/5<");
    expect(html).toMatch(/text-\[40px\] font-semibold[^"]*text-\[var\(--shell-ink\)\]/);
    expect(html).not.toContain("font-normal");
  });

  it("renders RadarChart with an accessible title, axis labels, and band-colored vertices", () => {
    const html = renderToStaticMarkup(
      createElement(RadarChart, {
        title: "Five-module maturity profile",
        axes: modules.map((module) => ({ key: module.key, label: module.title, value: module.score })),
      })
    );

    expect(html).toContain("<title>Five-module maturity profile</title>");
    expect(html).toContain("var(--brand-c2-blue)");
    expect(html).toContain(getScoreBand(80).colorVar);
    expect(html).not.toContain("stroke-dasharray=\"4 4\""); // no benchmark series requested
  });

  it("renders RankedBars with value labels and a threshold tick caption", () => {
    const html = renderToStaticMarkup(
      createElement(RankedBars, {
        title: "Capability scores",
        threshold: 60,
        colorByBand: true,
        items: [
          { key: "a", label: "Data confidence", value: 87, meta: "meets" },
          { key: "b", label: "Control discipline", value: 52, meta: "below" },
        ],
      })
    );

    expect(html).toContain("Data confidence");
    expect(html).toContain("87");
    expect(html).toContain("60% threshold");
    expect(html).toContain(getScoreBand(87).colorVar);
    expect(html).toContain(getScoreBand(52).colorVar);
  });

  it("renders DivergenceBar with both series and a computed gap callout", () => {
    const html = renderToStaticMarkup(
      createElement(DivergenceBar, {
        title: "Vendor-reported vs firm-reviewed",
        a: { label: "Vendor self-reported", value: 84.5 },
        b: { label: "Firm-reviewed", value: 75 },
      })
    );

    expect(html).toContain("Vendor self-reported");
    expect(html).toContain("Firm-reviewed");
    expect(html).toContain("9.5 pt divergence");
  });

  it("renders ProgressMeter segments and unlock-requirement chips", () => {
    const html = renderToStaticMarkup(
      createElement(ProgressMeter, {
        completed: 3,
        total: 5,
        unitLabel: "modules",
        title: "Module completion",
        chips: modules.map((module, idx) => ({ key: module.key, label: module.title, done: idx < 3 })),
      })
    );

    expect(html).toContain("3 of 5");
    expect(html).toContain("Module completion: 3 of 5 modules");
    expect(html).toContain("Operating Model and Workflow Discipline");
    expect(html).toContain("border-dashed");
  });
});
