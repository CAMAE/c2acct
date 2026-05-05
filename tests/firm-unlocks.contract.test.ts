import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildFirmEliteInsightCards,
  buildFirmInsightDetailSurfaceCards,
  buildFirmInsightDetailSurfaceContent,
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
          && card.statusLabel === "Coming soon"
          && card.supportingText === "Unlock with Elite membership"
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
    ]);
    expect(proSurface.title).toBe("Pro");
    expect(proSurface.items.map((item) => item.title)).toEqual([
      "Current PAT picture",
      "Where the signal is strongest",
      "Where the signal is under pressure",
      "Current limits",
    ]);
    expect(proSurfaceText).toContain("Operating model (78%)");
    expect(proSurfaceText).toContain("Operating model discipline (74%)");
    expect(proSurfaceText).toContain("Only 3 relevant modules");
    expect(proSurfaceText).not.toContain("Assessment basis");
    expect(proSurfaceText).not.toContain("Module evidence");
    expect(proSurfaceText).not.toContain("Capability and question evidence");
    expect(proSurfaceText).not.toContain("Confidence and caveats");
    expect(proSurfaceText).not.toContain("Freshness:");
    expect(proSurfaceText).not.toContain("Sample:");
    expect(proSurfaceText).not.toMatch(/Caveat \d+/);
    expect(eliteSurface.title).toBe("Elite");
    expect(eliteSurfaceText).toContain("Coming soon");
    expect(eliteSurfaceText).toContain("Unlock with Elite membership");
  });

  it("keeps the firm insight detail route on the cleaned shared shell", () => {
    const text = readFileSync(
      path.join(ROOT, "app/firm/insights/[key]/page.tsx"),
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
