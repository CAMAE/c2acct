import { readFileSync } from "node:fs";
import path from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import FirmGapPlanCard from "@/app/components/insights/elite/FirmGapPlanCard";
import { getConsultantFreshnessBoard, type FreshnessBoardClient } from "@/lib/consultantFreshness";
import { firmEliteHubMetrics, gapPlanLead, gapPlanRowMeta, getFirmEvidenceFreshness, vendorEliteHubMetrics, type FirmGapPlan } from "@/lib/eliteInsightsV2";
import { getFirmFreshness, type FirmFreshnessClient } from "@/lib/firmFreshness";
import { summarizeFirmAlignmentProgress, type FirmModuleProgress } from "@/lib/firmPat";
import { readFreshness } from "@/lib/freshness";
import { buildNudgeMessage } from "@/lib/notifications/nudge";

vi.mock("@/lib/consultantAccess", () => ({ getConsultantAccessStateForUser: vi.fn() }));

/**
 * pattern box A (R60, R-O): two readers, one truth. Each entity below is read by
 * one function; the test renders both surfaces from one fixture and compares.
 */
const ROOT = path.resolve(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");
const NOW = new Date("2026-10-06T12:00:00.000Z");
const DAY = 86_400_000;

describe("G2 — firm freshness: the Guide panel and the ecosystem page read one date and one label", () => {
  const newest = new Date(NOW.getTime() - 157 * DAY); // May 2, 2026 → Aging
  const older = new Date(NOW.getTime() - 300 * DAY);
  const rows = [
    { companyId: "f1", createdAt: older },
    { companyId: "f1", createdAt: newest },
    { companyId: "f1", createdAt: new Date(NOW.getTime() - 200 * DAY) },
  ];
  const client: FirmFreshnessClient & FreshnessBoardClient = {
    surveySubmission: {
      findMany: async () => [...rows].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()),
    },
    cadenceConfig: { findMany: async () => [] },
  };

  it("one fixture firm, both surfaces: same asOf date, same state", async () => {
    const elite = await getFirmEvidenceFreshness(client, "f1", NOW);
    const board = await getConsultantFreshnessBoard(
      { ecosystems: [{ assignmentId: "a", ecosystemId: "e", ecosystemName: "Eco", vendorCompanyId: null, vendorCompanyName: "V", firmCompanies: [{ id: "f1", name: "Firm" }] }] },
      NOW,
      client
    );
    const panel = board.firms[0].freshness;
    expect(elite).not.toBeNull();
    expect(panel).toEqual(elite);
    expect(elite?.state).toBe("aging");
    expect(elite?.asOfIso).toBe(newest.toISOString());
    // the ecosystem page's definition: the fully assessed firm's lastFullAssessmentAt is the same newest submission
    const modules = ["a", "b", "c", "d", "e"].map((key, index): FirmModuleProgress => ({
      key, badgeId: key, title: key, description: "", summary: "", href: "/", questionCount: 20, completedCount: 20, draftAnsweredCount: 0,
      status: "completed", statusLabel: "Completed", statusDescription: "", latestScore: 70, draftUpdatedAt: null,
      latestSubmittedAt: index === 1 ? newest : older,
    }));
    const progress = summarizeFirmAlignmentProgress(modules);
    expect(progress.fullyAssessed).toBe(true);
    expect(readFreshness(progress.lastFullAssessmentAt, NOW)).toEqual(elite);
    expect(await getFirmFreshness(client, "f1", NOW)).toEqual(elite);
  });

  it("a firm with no final module submission is never assumed stale", async () => {
    const empty: FirmFreshnessClient = { surveySubmission: { findMany: async () => [] } };
    expect(await getFirmEvidenceFreshness(empty, "f9", NOW)).toBeNull();
  });

  it("both callers import the one reader; neither reads firmMaturitySnapshot for freshness", () => {
    const elite = read("lib/eliteInsightsV2.ts");
    expect(elite).toContain('from "@/lib/firmFreshness"');
    expect(elite).toContain("return getFirmFreshness(client, companyId, now);");
    expect(read("lib/consultantFreshness.ts")).toContain("getFirmFreshnessForFirms(client, firmOrder, now)");
  });
});

describe("G3 — nudges read the hub's module progress", () => {
  it("a firm at 5 of 5 never gets a completion nudge; it gets the refresh nudge", () => {
    const message = buildNudgeMessage("firm", "Your consultant", { completedModules: 5, totalModules: 5 });
    expect(message.body).not.toMatch(/finish your alignment assessment modules/);
    expect(message.body).toMatch(/refresh your alignment assessment/);
    expect(message.ctaHref).toBe("/firm/alignment-assessment");
  });

  it("a firm with open modules gets the completion nudge with the count; unknown progress keeps the generic copy", () => {
    expect(buildNudgeMessage("firm", "Your consultant", { completedModules: 3, totalModules: 5 }).body).toMatch(/2 of your 5 alignment modules are still open/);
    expect(buildNudgeMessage("firm", "Your consultant", null).body).toMatch(/finish your alignment assessment modules/);
    expect(buildNudgeMessage("vendor", "Your consultant", { completedModules: 5, totalModules: 5 }).ctaHref).toBe("/vendor/product-assessment");
  });

  it("the draft path reads progress through lib/firmPat getFirmAssessmentProgress (the hub's reader)", () => {
    const nudge = read("lib/notifications/nudge.ts");
    expect(nudge).toContain('import { getFirmAssessmentProgress, summarizeFirmAlignmentProgress } from "@/lib/firmPat";');
    expect(read("lib/notifications/nudgeDraft.ts")).toContain("buildNudgeMessage(input.audience, nudgeFromLabel(authority), progress)");
  });
});

const gap = (key: string, title: string, score: number, threshold: number) => ({
  key, title, score, threshold, gap: threshold - score, moduleLabel: "Automation", narrative: "",
});

describe("F6 — gap plan: the hub card hero equals the page's first row", () => {
  const peer = { available: true, cutoffLabel: null, displayTier: "percentile" as const, rankShown: true, overall: { percentile: 72, rankFromTop: 30, n: 106, score: 68, peerMedian: 65 }, bestAction: { moduleLabel: "Automation and AI Readiness", deficit: 9, fromPercentile: 48, reaches: "top quartile" as const }, rows: [], reportCard: [], emptyReason: null };
  const trajectory = { available: false, history: [], projection: null, momentum: null, swapMovement: null, provenance: null, emptyReason: "x" };

  it("with no gaps the hero is the thinnest margin over its own bar, the page's first watch row", () => {
    const plan: FirmGapPlan = { available: true, gaps: [], watchList: [gap("auto", "Automation", 74, 65), gap("wf", "Workflow", 80, 60)], clearedCount: 10, totalCount: 10, emptyReason: "all clear" };
    const lead = gapPlanLead(plan)!;
    const face = firmEliteHubMetrics({ peer, gapPlan: plan, trajectory }).firm_tier2_recommendation!;
    expect(face.hero).toBe("Automation: 9 pts over its bar");
    expect(face.chip).toEqual({ label: "thinnest margin", tone: "positive" });
    expect(face.hero).not.toContain("top quartile");
    const html = renderToStaticMarkup(createElement(FirmGapPlanCard, { data: plan }));
    const firstMeta = html.match(/[+−]?\d+ pts (?:over|under) \d+%/)?.[0];
    expect(firstMeta).toBe(gapPlanRowMeta(plan.watchList[0]));
    expect(firstMeta).toBe(`+${lead.points} pts over ${lead.threshold}%`);
  });

  it("with gaps the hero is the largest deficit under its own bar, the page's first gap row", () => {
    const plan: FirmGapPlan = { available: true, gaps: [gap("data", "Data flow", 50, 65), gap("gov", "Governance", 58, 60)], watchList: [], clearedCount: 8, totalCount: 10, emptyReason: null };
    const face = firmEliteHubMetrics({ peer, gapPlan: plan, trajectory }).firm_tier2_recommendation!;
    expect(face.hero).toBe("Data flow: 15 pts under its bar");
    expect(face.chip?.label).toBe("biggest gap");
    const html = renderToStaticMarkup(createElement(FirmGapPlanCard, { data: plan }));
    expect(html.match(/\d+ pts (?:over|under) \d+%/)?.[0]).toBe("15 pts under 65%");
    expect(gapPlanRowMeta(plan.gaps[0])).toBe("15 pts under 65%");
  });
});

describe("V8 — category count", () => {
  it("the hero counts categories and says so", () => {
    const metrics = vendorEliteHubMetrics({
      category: {
        available: true,
        categories: [
          { category: "Tax & Compliance", mean: 70, stdev: 5, p25: 60, p50: 70, p75: 80, score: 82, percentile: 90, rankFromTop: 1, n: 9, quartile: 4, displayTier: "median" as const, rankShown: false, suppressed: false, suppressionReason: null },
          { category: "Ledger & Close", mean: 65, stdev: 5, p25: 55, p50: 65, p75: 75, score: 62, percentile: 40, rankFromTop: 5, n: 8, quartile: 2, displayTier: "median" as const, rankShown: false, suppressed: false, suppressionReason: null },
          { category: "Payroll", mean: 65, stdev: 5, p25: 55, p50: 65, p75: 75, score: 62, percentile: 40, rankFromTop: 5, n: 2, quartile: 2, displayTier: "none" as const, rankShown: false, suppressed: true, suppressionReason: "insufficient_contributors" },
        ],
        topAction: null,
        cutoffLabel: null,
        emptyReason: null,
      },
      demand: { available: false, identityAllowed: true, windowLabel: "", earlySignal: true, totalIn: 0, totalOut: 0, swappedIn: [], swappedOut: [], rankedAction: null, emptyReason: "x" },
      gapMap: { available: false, rows: [], emptyReason: "x" } as never,
    });
    expect(metrics["benchmark-comparison"]?.hero).toBe("1 of 2");
    expect(metrics["benchmark-comparison"]?.sub).toBe("categories in top band");
    expect(metrics["benchmark-comparison"]?.micro).toEqual({ kind: "band-dots", total: 2, filled: 1 });
  });
});

describe("results API — FINAL filter", () => {
  it("both submission reads apply getSurveyFinalWhere (drafts never reach /api/results)", () => {
    const route = read("app/api/results/route.ts");
    expect(route).toContain('import { getSurveyFinalWhere } from "@/lib/surveyDrafts";');
    expect((route.match(/getSurveyFinalWhere\(where\)/g) || []).length).toBe(2);
    expect(route).not.toMatch(/surveySubmission\.findMany\(\{\s*where: where\b/);
  });
});
