import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildFirmEliteInsightCards,
  buildFirmInsightDetailSurfaceCards,
  buildFirmInsightDetailSurfaceContent,
  buildFirmLockedInsightDetailSurfaceCards,
  buildFirmLockedInsightDetailSurfaceContent,
  buildFirmProInsightCards,
  getRequestedFirmInsightDetailSurface,
  getRequestedFirmInsightOverviewMode,
  type FirmInsightReport,
} from "@/lib/firmInsightEngine";
import { resolveUnlockedInsights } from "@/lib/insights/evaluateUnlocked";
import { TIER1_ALIGNMENT_BADGE_ID } from "@/lib/patUnlocks";

const ROOT = "/Users/camerongarrett/work/c2acct-live";

const firmInsightFixture: FirmInsightReport = {
  key: "firm_tier1_operating_baseline",
  title: "Operating baseline",
  sampleSize: 3,
  latestUpdatedAt: new Date("2026-04-12T12:00:00.000Z"),
  confidenceBand: "sample_thin",
  confidenceLabel: "Sample-thin current-state signal",
  confidenceSummary: "Sample-thin current-state signal only.",
  currentStateSummary:
    "Operating baseline shows the current operating picture, with the strongest support in Operating model and the most pressure in Data flow.",
  what: "A current-state operating interpretation tied to the current PAT evidence.",
  why: "It shows where the current operating floor is strongest and weakest.",
  how: "Use it to prioritize the next grounded firm alignment action.",
  basisSummary: "PAT is using completed module scores and capability evidence only.",
  contributingModules: [
    {
      key: "firm_alignment_operating_model_v1",
      title: "Operating model",
      score: 78,
      submittedAt: new Date("2026-04-10T12:00:00.000Z"),
      sectionKey: "operating-model",
      sectionTitle: "Operating model",
    },
  ],
  strongestModules: [
    {
      key: "firm_alignment_operating_model_v1",
      title: "Operating model",
      score: 78,
      submittedAt: new Date("2026-04-10T12:00:00.000Z"),
      sectionKey: "operating-model",
      sectionTitle: "Operating model",
    },
  ],
  weakestModules: [
    {
      key: "firm_alignment_data_flow_v1",
      title: "Data flow",
      score: 52,
      submittedAt: new Date("2026-04-11T12:00:00.000Z"),
      sectionKey: "data-flow",
      sectionTitle: "Data flow",
    },
  ],
  contributingCapabilities: [
    {
      key: "firm_capability_operating_model_discipline",
      title: "Operating model discipline",
      description: "Definition fixture",
      score: 74,
      threshold: 60,
      meetsThreshold: true,
    },
  ],
  notableQuestionClusters: [
    {
      key: "cluster-1",
      title: "Ownership and discipline",
      averageScore: 71,
      questionCount: 4,
      moduleTitles: ["Operating model"],
      sectionTitles: ["Operating model"],
      questionPrompts: ["Question one", "Question two"],
    },
  ],
  confidenceCaveats: ["Only 3 relevant modules have final submissions."],
};

const noModuleFirmInsightFixture: FirmInsightReport = {
  ...firmInsightFixture,
  sampleSize: 0,
  latestUpdatedAt: null,
  confidenceBand: "no_signal",
  confidenceLabel: "No current-state signal",
  confidenceSummary: "Complete more modules before treating this as grounded signal.",
  currentStateSummary: "Operating baseline has no completed firm assessment evidence yet.",
  basisSummary: "PAT does not have enough completed module evidence to describe a grounded basis yet.",
  contributingModules: [],
  strongestModules: [],
  weakestModules: [],
  contributingCapabilities: [],
  notableQuestionClusters: [],
  confidenceCaveats: ["Complete more modules before using this insight."],
};

const completedFirmInsightFixture: FirmInsightReport = {
  ...firmInsightFixture,
  sampleSize: 8,
  confidenceBand: "grounded",
  confidenceLabel: "Grounded current-state signal",
  confidenceSummary: "Grounded current-state signal for current-state interpretation only.",
  confidenceCaveats: [
    "This remains current-state PAT evidence only. No benchmark, peer-comparison, or forecast layer is being claimed here.",
  ],
  contributingModules: [
    ...firmInsightFixture.contributingModules,
    {
      key: "firm_alignment_data_flow_v1",
      title: "Data flow",
      score: 64,
      submittedAt: new Date("2026-04-11T12:00:00.000Z"),
      sectionKey: "data-flow",
      sectionTitle: "Data flow",
    },
  ],
  notableQuestionClusters: [
    ...firmInsightFixture.notableQuestionClusters,
    {
      key: "cluster-2",
      title: "Data movement",
      averageScore: 58,
      questionCount: 5,
      moduleTitles: ["Data flow"],
      sectionTitles: ["Data flow"],
      questionPrompts: ["Question three", "Question four"],
    },
  ],
};

describe("firm pro unlock rules", () => {
  it("keeps firm pro insights locked without the required capability threshold", () => {
    const unlocked = resolveUnlockedInsights({
      insights: [
        {
          id: "insight-1",
          key: "firm_tier1_operating_baseline",
          title: "Operating baseline",
          body: "test",
          tier: 1,
          badgeRuleIds: [TIER1_ALIGNMENT_BADGE_ID],
          capabilityRules: [{ nodeId: "node-1", minScore: 60 }],
        },
      ],
      earnedBadgeIds: [TIER1_ALIGNMENT_BADGE_ID],
      capabilityScores: [{ nodeId: "node-1", score: 59 }],
    });

    expect(unlocked).toEqual([]);
  });

  it("unlocks firm pro insights only when badge and capability evidence are both present", () => {
    const unlocked = resolveUnlockedInsights({
      insights: [
        {
          id: "insight-1",
          key: "firm_tier1_operating_baseline",
          title: "Operating baseline",
          body: "test",
          tier: 1,
          badgeRuleIds: [TIER1_ALIGNMENT_BADGE_ID],
          capabilityRules: [{ nodeId: "node-1", minScore: 60 }],
        },
      ],
      earnedBadgeIds: [TIER1_ALIGNMENT_BADGE_ID],
      capabilityScores: [{ nodeId: "node-1", score: 81 }],
    });

    expect(unlocked).toHaveLength(1);
    expect(unlocked[0]?.key).toBe("firm_tier1_operating_baseline");
    expect(unlocked[0]?.evidence.earnedBadgeIds).toContain(TIER1_ALIGNMENT_BADGE_ID);
  });

  it("maps overview modes and keeps elite overview cards non-clickable", () => {
    expect(getRequestedFirmInsightOverviewMode(undefined)).toBe("pro");
    expect(getRequestedFirmInsightOverviewMode("elite")).toBe("elite");
    expect(getRequestedFirmInsightOverviewMode("help")).toBe("help");
    expect(getRequestedFirmInsightOverviewMode("unknown")).toBe("pro");
    expect(
      buildFirmEliteInsightCards().every(
        (card) =>
          !card.interactive
          && card.href === null
          && card.statusLabel === "Elite"
          && card.supportingText === "Live with Elite membership"
      )
    ).toBe(true);
  });

  it("keeps active firm overview cards free of confidence badges and count-led summaries", () => {
    const cards = buildFirmProInsightCards({
      reports: new Map([[firmInsightFixture.key, firmInsightFixture]]),
      unlockedKeys: new Set([firmInsightFixture.key]),
    });
    const operatingBaselineCard = cards.find((card) => card.key === firmInsightFixture.key);

    expect(operatingBaselineCard).toBeTruthy();
    expect(operatingBaselineCard?.statusLabel).toBeUndefined();
    expect(operatingBaselineCard?.summary).not.toContain("three completed module submissions");
    expect(operatingBaselineCard?.summary).not.toMatch(
      /sample-thin|emerging signal|grounded current-state signal|no current-state signal/i
    );
    expect(operatingBaselineCard?.supportingText).toBe("Strongest support: Operating model.");
  });

  it("builds grounded drill-down cards and normalizes requested surfaces", () => {
    const cards = buildFirmInsightDetailSurfaceCards({
      insightKey: firmInsightFixture.key,
      report: firmInsightFixture,
      locked: false,
    });

    expect(getRequestedFirmInsightDetailSurface(undefined)).toBe("pro");
    expect(getRequestedFirmInsightDetailSurface("modules")).toBe("pro");
    expect(getRequestedFirmInsightDetailSurface("capabilities")).toBe("pro");
    expect(getRequestedFirmInsightDetailSurface("confidence")).toBe("pro");
    expect(getRequestedFirmInsightDetailSurface("elite")).toBe("elite");
    expect(getRequestedFirmInsightDetailSurface("unknown")).toBe("pro");
    expect(cards.map((card) => card.key)).toEqual(["pro", "elite", "help"]);
    expect(cards.every((card) => card.interactive && card.href?.startsWith("/firm/insights/"))).toBe(true);
    expect(cards.some((card) => card.title === "Assessment basis")).toBe(false);
    expect(cards.some((card) => card.title === "Module evidence")).toBe(false);
    expect(cards.some((card) => card.title === "Capability and question evidence")).toBe(false);
    expect(cards.some((card) => card.title === "Confidence and caveats")).toBe(false);

    const helpSurface = buildFirmInsightDetailSurfaceContent({
      report: firmInsightFixture,
      surface: "help",
    });
    const proSurface = buildFirmInsightDetailSurfaceContent({
      report: firmInsightFixture,
      surface: "pro",
    });
    const eliteSurface = buildFirmInsightDetailSurfaceContent({
      report: firmInsightFixture,
      surface: "elite",
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

    expect(helpSurface.items.map((item) => item.title)).toEqual([
      "What it is",
      "Why it matters",
      "How to use it",
      "Evidence provenance",
    ]);
    expect(proSurface.title).toBe("Pro");
    expect(proSurface.items.map((item) => item.title)).toEqual([
      "Current PAT picture",
      "Evidence provenance",
      "Where the signal is strongest",
      "Where the signal is under pressure",
      "Current limits",
    ]);
    expect(proSurfaceText).toContain("Operating model (78%)");
    expect(proSurfaceText).toContain("Operating model discipline (74%)");
    expect(proSurfaceText).toContain("Only 3 relevant modules");
    expect(proSurfaceText).toContain("Firm module source: 3 final firm module submissions");
    expect(proSurfaceText).toContain("Module evidence: Operating model (78%, submitted 2026-04-10T12:00:00.000Z)");
    expect(proSurfaceText).toContain("Capability evidence: Operating model discipline (74%, meets 60% threshold)");
    expect(proSurfaceText).toContain("Question-pattern evidence: Ownership and discipline");
    expect(proSurfaceText).toContain("PAT uses only current firm module, capability, and question-pattern evidence here");
    expect(proSurfaceText).not.toContain("Assessment basis");
    expect(proSurfaceText).not.toContain("Capability and question evidence");
    expect(proSurfaceText).not.toContain("Confidence and caveats");
    expect(proSurfaceText).not.toContain("Freshness:");
    expect(proSurfaceText).not.toContain("Sample:");
    expect(proSurfaceText).not.toMatch(/Caveat \d+/);
    expect(eliteSurface.title).toBe("Elite");
    expect(eliteSurfaceText).toContain("Live with Elite membership");
    expect(eliteSurfaceText).not.toContain("Coming soon");
    expect(eliteSurfaceText).toContain("Locked Elite boundary");
    expect(eliteSurfaceText).toContain("This is not a live Elite interpretation");
    expect(eliteSurfaceText).toContain("does not expose unavailable findings");
  });

  it("keeps no-module and partial-module firm insight surfaces conservative", () => {
    const noModuleSurface = buildFirmInsightDetailSurfaceContent({
      report: noModuleFirmInsightFixture,
      surface: "pro",
    });
    const noModuleText = [
      noModuleSurface.title,
      noModuleSurface.intro,
      ...noModuleSurface.items.flatMap((item) => [item.title, item.body]),
    ].join(" ");

    expect(noModuleText).toContain("Complete more modules");
    expect(noModuleText).toContain("insufficient module evidence");
    expect(noModuleText).toContain("insufficient capability evidence");
    expect(noModuleText).toContain("insufficient question-pattern evidence");
    expect(noModuleText).toContain("does not claim benchmark, projection, recommendation");

    const completedSurface = buildFirmInsightDetailSurfaceContent({
      report: completedFirmInsightFixture,
      surface: "pro",
    });
    const completedText = completedSurface.items.flatMap((item) => [item.title, item.body]).join(" ");

    expect(completedText).toContain("Firm module source: 8 final firm module submissions");
    expect(completedText).toContain("Data flow (64%, submitted 2026-04-11T12:00:00.000Z)");
    expect(completedText).toContain("Data movement");
    expect(completedText).toContain("current-state PAT evidence only");
  });

  it("keeps locked elite firm insight routes click-safe across Pro, Elite, and Help surfaces", () => {
    const cards = buildFirmLockedInsightDetailSurfaceCards({
      insightKey: "firm_tier2_board_readiness",
      summary: "Board readiness is reserved for Elite.",
    });
    const proSurface = buildFirmLockedInsightDetailSurfaceContent({
      surface: "pro",
      summary: "Board readiness is reserved for Elite.",
    });
    const eliteSurface = buildFirmLockedInsightDetailSurfaceContent({
      surface: "elite",
      summary: "Board readiness is reserved for Elite.",
    });
    const helpSurface = buildFirmLockedInsightDetailSurfaceContent({
      surface: "help",
      summary: "Board readiness is reserved for Elite.",
    });
    const lockedText = [proSurface, eliteSurface, helpSurface]
      .flatMap((surface) => [
        surface.title,
        surface.intro,
        ...surface.items.flatMap((item) => [item.title, item.body]),
      ])
      .join(" ");

    expect(cards.map((card) => card.key)).toEqual(["pro", "elite", "help"]);
    expect(cards.every((card) => card.interactive && card.href?.startsWith("/firm/insights/"))).toBe(true);
    expect(lockedText).toContain("Locked Elite boundary");
    expect(lockedText).toContain("Complete more modules");
    expect(lockedText).toContain("not a live Elite interpretation");
    expect(lockedText).not.toContain("peer benchmark");
    expect(lockedText).not.toContain("forecast");
  });

  it("keeps the firm insight detail route on the cleaned shared shell", () => {
    const text = readFileSync(
      path.join(ROOT, "app/firm/insights/[key]/page.tsx"),
      "utf8"
    );

    expect(text).toContain('import InsightDetailShell from "@/app/components/insights/InsightDetailShell";');
    expect(text).toContain("<InsightDetailShell");
    expect(text).toContain("buildFirmLockedInsightDetailSurfaceCards");
    expect(text).toContain("buildFirmLockedInsightDetailSurfaceContent");
    expect(text).toContain("const visibleSurfaceKey = activeSurface;");
    expect(text).not.toContain("PatModeToggle");
    expect(text).not.toContain("Confidence and caveats");
    expect(text).not.toContain("Assessment basis");
    expect(text).not.toContain("Capability and question evidence");
    expect(text).not.toContain("Freshness:");
    expect(text).not.toContain("Sample:");
    expect(text).not.toContain('report ? activeSurface : "help"');
    expect(text).not.toMatch(/Caveat \d+/);
  });

  it("keeps the firm overview route free of count-led hero copy", () => {
    const text = readFileSync(
      path.join(ROOT, "app/firm/insights/page.tsx"),
      "utf8"
    );

    expect(text).not.toContain("completed alignment module");
    expect(text).not.toContain("firm product review");
  });

  it("keeps the firm alignment assessment overview grouped by module status", () => {
    const text = readFileSync(
      path.join(ROOT, "app/firm/alignment-assessment/page.tsx"),
      "utf8"
    );

    expect(text).toContain("STATUS_SECTIONS");
    expect(text).toContain("Not Started");
    expect(text).toContain("In Progress");
    expect(text).toContain("Completed");
    expect(text).toContain("Overall Progress");
    expect(text).toContain("Why the five modules matter");
    expect(text).toContain("not a legacy single survey");
    expect(text).toContain("summarizeFirmAlignmentProgress");
    expect(text).not.toContain("legacy single-survey semantics");
  });
});
