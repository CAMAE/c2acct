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

const unlocked = resolveUnlockedInsights({
  insights: [
    {
      id: "insight-1",
      key: "tier1_alignment_baseline",
      title: "Alignment Baseline",
      body: "test",
      tier: 1,
      badgeRuleIds: [TIER1_ALIGNMENT_BADGE_ID],
      capabilityRules: [],
    },
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
assert(unlocked[0]?.evidence.earnedBadgeIds.includes(TIER1_ALIGNMENT_BADGE_ID), "badge evidence should be present");

console.log(
  JSON.stringify(
    {
      ok: true,
      rawScorePct: score.rawScorePct,
      confidenceAdjustedScorePct: summary.confidenceAdjustedScorePct,
      unlockedKeys: unlocked.map((insight) => insight.key),
    },
    null,
    2
  )
);
