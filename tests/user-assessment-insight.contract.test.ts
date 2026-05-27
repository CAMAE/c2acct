import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  USER_ALIGNMENT_MODULE_KEY,
  USER_TIER1_INSIGHT_DEFINITIONS,
  USER_TIER2_INSIGHT_DEFINITIONS,
  buildUserCombinedEvidenceText,
  buildUserInsightDetailSurfaceContent,
  buildUserInsightOverviewState,
  getRequestedUserInsightDetailSurface,
  getRequestedUserInsightOverviewMode,
  getUserInsightDefinition,
  type UserAssessmentProgress,
  type UserPatContext,
} from "@/lib/userPat";

const ROOT = process.cwd();

const emptyUserContext: UserPatContext = {
  userId: "user-empty",
  email: "empty.user@pat.local",
  companyId: null,
  role: "MEMBER",
  personSubjectId: "subject-empty",
  subjectMembershipReady: true,
  assessmentCount: 0,
  latestScore: null,
  latestSubmittedAt: null,
  compatibilityMode: "native",
};

const completedUserContext: UserPatContext = {
  userId: "user-complete",
  email: "complete.user@pat.local",
  companyId: null,
  role: "MEMBER",
  personSubjectId: "subject-complete",
  subjectMembershipReady: true,
  assessmentCount: 1,
  latestScore: 82,
  latestSubmittedAt: new Date("2026-04-26T12:00:00.000Z"),
  compatibilityMode: "native",
};

const partialProgress: UserAssessmentProgress = {
  moduleKey: USER_ALIGNMENT_MODULE_KEY,
  title: "User Alignment Assessment",
  description: "Person-level PAT alignment assessment using the existing survey flow.",
  questionCount: 20,
  answeredCount: 10,
  latestScore: null,
  latestSubmittedAt: null,
  href: `/survey/${USER_ALIGNMENT_MODULE_KEY}`,
  tier1Unlocked: false,
};

const completedProgress: UserAssessmentProgress = {
  ...partialProgress,
  answeredCount: 20,
  latestScore: 82,
  latestSubmittedAt: new Date("2026-04-26T12:00:00.000Z"),
  tier1Unlocked: true,
};

describe("user assessment and insight contracts", () => {
  it("keeps user insight modes stable and truthful before assessment completion", () => {
    expect(getRequestedUserInsightOverviewMode(undefined)).toBe("pro");
    expect(getRequestedUserInsightOverviewMode("elite")).toBe("elite");
    expect(getRequestedUserInsightOverviewMode("help")).toBe("help");
    expect(getRequestedUserInsightOverviewMode("unknown")).toBe("pro");
    expect(getRequestedUserInsightDetailSurface(undefined)).toBe("help");
    expect(getRequestedUserInsightDetailSurface("current-evidence")).toBe("current-evidence");
    expect(getRequestedUserInsightDetailSurface("next-step")).toBe("next-step");
    expect(getRequestedUserInsightDetailSurface("modules")).toBe("help");

    const overview = buildUserInsightOverviewState({ tier1Unlocked: partialProgress.tier1Unlocked });

    expect(overview.currentStateSummary).toMatch(/needs a completed individual alignment submission/i);
    expect(overview.proCards).toHaveLength(USER_TIER1_INSIGHT_DEFINITIONS.length);
    expect(overview.proCards.every((card) => card.statusLabel === "Assessment needed")).toBe(true);
    expect(overview.proCards.every((card) => card.tone === "muted")).toBe(true);
    expect(overview.proCards.map((card) => `${card.summary} ${card.supportingText ?? ""}`).join(" ")).toMatch(
      /complete the individual alignment assessment|evidence is still missing/i
    );
    expect(overview.proCards.map((card) => `${card.summary} ${card.supportingText ?? ""}`).join(" ")).not.toMatch(
      /grounded in current person-level alignment evidence/i
    );
    expect(overview.eliteCards).toHaveLength(USER_TIER2_INSIGHT_DEFINITIONS.length);
    expect(overview.eliteCards.every((card) => !card.interactive && card.tone === "locked")).toBe(true);
  });

  it("opens grounded user Pro cards only after completed person-level evidence exists", () => {
    const overview = buildUserInsightOverviewState({ tier1Unlocked: completedProgress.tier1Unlocked });
    const workFitInsight = getUserInsightDefinition("user_tier1_work_fit");
    const eliteInsight = getUserInsightDefinition("user_tier2_enablement_projection");

    expect(workFitInsight).toBeTruthy();
    expect(eliteInsight).toBeTruthy();
    expect(overview.currentStateSummary).toMatch(/completed individual alignment evidence/i);
    expect(overview.proCards.every((card) => card.statusLabel === undefined && card.tone === "active")).toBe(true);
    expect(overview.proCards.every((card) => card.supportingText === "Grounded in current person-level alignment evidence.")).toBe(true);

    const evidenceSurface = buildUserInsightDetailSurfaceContent({
      insight: workFitInsight!,
      userPatContext: completedUserContext,
      alignmentProgress: completedProgress,
      surface: "current-evidence",
    });
    const nextStepSurface = buildUserInsightDetailSurfaceContent({
      insight: workFitInsight!,
      userPatContext: completedUserContext,
      alignmentProgress: completedProgress,
      surface: "next-step",
    });
    const eliteSurface = buildUserInsightDetailSurfaceContent({
      insight: eliteInsight!,
      userPatContext: completedUserContext,
      alignmentProgress: completedProgress,
      surface: "current-evidence",
    });

    const evidenceText = evidenceSurface.items.map((item) => `${item.title} ${item.body}`).join(" ");
    const nextStepText = nextStepSurface.items.map((item) => `${item.title} ${item.body}`).join(" ");

    expect(buildUserCombinedEvidenceText({ insight: workFitInsight!, userPatContext: completedUserContext })).toContain(
      "1 completed individual alignment submission"
    );
    expect(evidenceText).toContain("Alignment submissions: 1");
    expect(evidenceText).toContain("Latest score: 82");
    expect(evidenceText).toMatch(/insight layer is open/i);
    expect(nextStepText).toMatch(/Review the current alignment assessment results/i);
    expect(eliteSurface.title).toBe("Help");
    expect(eliteSurface.intro).toMatch(/coming soon/i);
    expect(buildUserCombinedEvidenceText({ insight: eliteInsight!, userPatContext: completedUserContext })).toMatch(
      /reserved for a deeper person-level PAT layer/i
    );
  });

  it("keeps empty user detail surfaces from claiming a grounded readout", () => {
    const workFitInsight = getUserInsightDefinition("user_tier1_work_fit");
    expect(workFitInsight).toBeTruthy();

    const helpSurface = buildUserInsightDetailSurfaceContent({
      insight: workFitInsight!,
      userPatContext: emptyUserContext,
      alignmentProgress: partialProgress,
      surface: "help",
    });
    const evidenceSurface = buildUserInsightDetailSurfaceContent({
      insight: workFitInsight!,
      userPatContext: emptyUserContext,
      alignmentProgress: partialProgress,
      surface: "current-evidence",
    });

    const surfaceText = [
      helpSurface.intro,
      ...helpSurface.items.flatMap((item) => [item.title, item.body]),
      evidenceSurface.intro,
      ...evidenceSurface.items.flatMap((item) => [item.title, item.body]),
    ].join(" ");

    expect(buildUserCombinedEvidenceText({ insight: workFitInsight!, userPatContext: emptyUserContext })).toContain(
      "0 completed individual alignment submissions"
    );
    expect(surfaceText).toMatch(/grounded person-level readout still depends/i);
    expect(surfaceText).toMatch(/Alignment submissions: 0/);
    expect(surfaceText).toMatch(/PAT still needs a completed individual alignment submission/i);
    expect(surfaceText).not.toMatch(/insight layer is open/i);
    expect(surfaceText).not.toMatch(/market-observed comparison|projected enablement path/i);
  });

  it("keeps user assessment routes gated and staged product assessment copy honest", () => {
    const alignmentPage = readFileSync(
      path.join(ROOT, "app/user/alignment-assessment/page.tsx"),
      "utf8"
    );
    const insightsPage = readFileSync(path.join(ROOT, "app/user/insights/page.tsx"), "utf8");
    const insightDetailPage = readFileSync(
      path.join(ROOT, "app/user/insights/[key]/page.tsx"),
      "utf8"
    );
    const productPage = readFileSync(path.join(ROOT, "app/user/product-assessment/page.tsx"), "utf8");

    for (const text of [alignmentPage, insightsPage, insightDetailPage]) {
      expect(text).toContain("MembershipSurfaceGate");
      expect(text).toContain("resolveMembershipEntitlement");
      expect(text).toContain("MEMBERSHIP_PLAN.PRO");
    }

    expect(alignmentPage).toContain("Complete the assessment to open insights");
    expect(productPage).toContain("does not yet have a truthful individual");
    expect(productPage).toContain("There is no current individual product submit route yet");
    expect(productPage).toContain("No individual product insight or unlock path consumes person-level product submissions yet");
    expect(productPage).not.toContain("Submit product assessment");
  });
});
