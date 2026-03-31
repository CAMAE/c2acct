import { computeScore, summarizeSubmissionScores } from "../lib/scoring";
import { resolveUnlockedInsights } from "../lib/insights/evaluateUnlocked";
import { TIER1_ALIGNMENT_BADGE_ID } from "../lib/patUnlocks";

function assert(condition: unknown, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

const score = computeScore({
  answers: {
    q1: 5,
    q2: 4,
    q3: 3,
  },
  scaleMin: 1,
  scaleMax: 5,
});

assert(score.rawScorePct === 75, `expected rawScorePct=75, got ${score.rawScorePct}`);
assert(score.score === score.rawScorePct, "legacy score alias must match rawScorePct");

const summary = summarizeSubmissionScores({
  score: score.rawScorePct,
  weightedAvg: score.rawWeightedAvg,
  signalIntegrityScore: 0.8,
});

assert(summary.unlockBasisScorePct === 75, "unlock basis should remain raw score");
assert(summary.confidenceAdjustedScorePct === 60, "confidence-adjusted score should be derived separately");

const gatedInsight = {
  id: "insight-1",
  key: "firm_tier1_operating_baseline",
  title: "Operating baseline",
  body: "test",
  tier: 1,
  badgeRuleIds: [TIER1_ALIGNMENT_BADGE_ID],
  capabilityRules: [{ nodeId: "node-1", minScore: 60 }],
};

const lockedWithoutCapability = resolveUnlockedInsights({
  insights: [
    gatedInsight,
    {
      id: "insight-2",
      key: "capability_only",
      title: "Capability Only",
      body: "test",
      tier: 1,
      badgeRuleIds: [],
      capabilityRules: [{ nodeId: "node-1", minScore: 50 }],
    },
  ],
  earnedBadgeIds: [TIER1_ALIGNMENT_BADGE_ID],
  capabilityScores: [{ nodeId: "node-1", score: 59 }],
});

assert(
  lockedWithoutCapability.length === 1 && lockedWithoutCapability[0]?.key === "capability_only",
  "firm Pro insight should stay locked when required capability scores are missing"
);

const unlocked = resolveUnlockedInsights({
  insights: [
    gatedInsight,
    {
      id: "insight-2",
      key: "capability_only",
      title: "Capability Only",
      body: "test",
      tier: 1,
      badgeRuleIds: [],
      capabilityRules: [{ nodeId: "node-1", minScore: 80 }],
    },
  ],
  earnedBadgeIds: [TIER1_ALIGNMENT_BADGE_ID],
  capabilityScores: [{ nodeId: "node-1", score: 81 }],
});

assert(unlocked.length === 2, `expected 2 unlocked insights, got ${unlocked.length}`);
assert(
  unlocked.some((insight) => insight.key === "firm_tier1_operating_baseline"),
  "firm Pro insight should unlock when badge and capability rules are satisfied"
);
assert(
  unlocked.find((insight) => insight.key === "firm_tier1_operating_baseline")?.evidence.earnedBadgeIds.includes(
    TIER1_ALIGNMENT_BADGE_ID
  ),
  "badge evidence should be present"
);

console.log(
  JSON.stringify(
    {
      ok: true,
      rawScorePct: score.rawScorePct,
      confidenceAdjustedScorePct: summary.confidenceAdjustedScorePct,
      lockedWithoutCapability: lockedWithoutCapability.map((insight) => insight.key),
      unlockedKeys: unlocked.map((insight) => insight.key),
    },
    null,
    2
  )
);
