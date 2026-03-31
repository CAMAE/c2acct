/**
 * Compatibility-only dashboard helpers for older generic PAT shells.
 *
 * Canonical score, unlock, insight, and evidence behavior now lives in the
 * role-specific PAT routes and their runtime engines. Keep this file thin and
 * do not add new product semantics here.
 */
import { TIER1_ALIGNMENT_BADGE_ID, TIER1_ALIGNMENT_BADGE_NAME, TOP_INSIGHT_CARDS } from "@/lib/patUnlocks";

export type DashboardSubmissionSnapshot = {
  id: string;
  createdAt: string | Date;
  score: number | null;
  weightedAvg: number | null;
  signalIntegrityScore: number | null;
  answeredCount: number;
  moduleKey: string;
  moduleTitle: string;
};

export type DashboardScoreBand = {
  label: string;
  detail: string;
  tone: "slate" | "amber" | "emerald";
};

export function deriveScoreBand(rawScorePct: number | null): DashboardScoreBand {
  if (rawScorePct === null) {
    return {
      label: "No current posture",
      detail: "A posture band appears after the first assessment submission.",
      tone: "slate",
    };
  }

  if (rawScorePct < 40) {
    return {
      label: "Foundational posture",
      detail: "Core operating discipline is still inconsistent and the platform should emphasize baseline alignment work.",
      tone: "amber",
    };
  }

  if (rawScorePct < 70) {
    return {
      label: "Stabilizing posture",
      detail: "The operating model is becoming repeatable, but execution and coordination still need reinforcement.",
      tone: "amber",
    };
  }

  return {
    label: "Operationally scaled posture",
    detail: "The current score indicates repeatable operating discipline strong enough to support deeper PAT insights.",
    tone: "emerald",
  };
}

export function deriveIntegrityNarrative(signalIntegrityScore: number): {
  label: string;
  detail: string;
  tone: "slate" | "amber" | "emerald";
} {
  if (signalIntegrityScore < 0.65) {
    return {
      label: "Low confidence",
      detail: "Responses show low coverage or pattern-quality concerns. Treat the submission as directional only.",
      tone: "amber",
    };
  }

  if (signalIntegrityScore < 0.85) {
    return {
      label: "Moderate confidence",
      detail: "The response signal is usable, but operators should review it before using it for larger program decisions.",
      tone: "slate",
    };
  }

  return {
    label: "High confidence",
    detail: "The response pattern is consistent enough to support current Pro membership interpretation.",
    tone: "emerald",
  };
}

export function buildInsightAvailability(input: {
  earnedBadgeIds: Iterable<string>;
  unlockedInsightKeys: Iterable<string>;
}) {
  const earnedBadgeIds = new Set(input.earnedBadgeIds);
  const unlockedInsightKeys = new Set(input.unlockedInsightKeys);

  return TOP_INSIGHT_CARDS.map((card) => {
    const badgeSatisfied = !card.requiredBadgeId || earnedBadgeIds.has(card.requiredBadgeId);
    const insightSatisfied = !card.requiredInsightKey || unlockedInsightKeys.has(card.requiredInsightKey);
    const unlocked = badgeSatisfied && insightSatisfied;

    let unlockRequirement = "Always available";
    if (card.requiredBadgeId === TIER1_ALIGNMENT_BADGE_ID && card.requiredInsightKey) {
      unlockRequirement = `Requires ${TIER1_ALIGNMENT_BADGE_NAME} and unlocked insight ${card.requiredInsightKey}`;
    } else if (card.requiredBadgeId === TIER1_ALIGNMENT_BADGE_ID) {
      unlockRequirement = `Requires ${TIER1_ALIGNMENT_BADGE_NAME}`;
    } else if (card.requiredInsightKey) {
      unlockRequirement = `Requires unlocked insight ${card.requiredInsightKey}`;
    } else if (card.requiredBadgeId) {
      unlockRequirement = `Requires badge ${card.requiredBadgeId}`;
    }

    return {
      ...card,
      unlocked,
      unlockRequirement,
    };
  });
}

export function deriveSubmissionTrajectory(submissions: DashboardSubmissionSnapshot[]): {
  label: string;
  detail: string;
} {
  if (submissions.length < 2) {
    return {
      label: "Single snapshot",
      detail: "PAT has one submission only, so trajectory is not established yet.",
    };
  }

  const latest = submissions[0]?.score;
  const previous = submissions[1]?.score;
  if (typeof latest !== "number" || typeof previous !== "number") {
    return {
      label: "Insufficient numeric history",
      detail: "Recent submissions exist, but the score history is incomplete.",
    };
  }

  const delta = latest - previous;
  if (delta >= 5) {
    return {
      label: "Upward movement",
      detail: `The most recent submission improved by ${delta} points versus the prior submission.`,
    };
  }

  if (delta <= -5) {
    return {
      label: "Regression detected",
      detail: `The most recent submission fell by ${Math.abs(delta)} points versus the prior submission.`,
    };
  }

  return {
    label: "Stable movement",
    detail: "Recent submissions are materially flat. PAT should focus on interpretation and next actions rather than trend claims.",
  };
}
