import assert from "node:assert/strict";
import { computeScore, summarizeSubmissionScores } from "@/lib/scoring";

const score = computeScore({
  answers: {
    q1: 0,
    q2: 1,
    q3: 2,
    q4: 4,
    q5: 5,
  },
  scaleMin: 0,
  scaleMax: 5,
});

assert.equal(score.answeredCount, 5, "A 0 answer must still count as answered.");
assert.equal(score.totalWeight, 5, "All five modular answers should contribute to raw scoring.");
assert.equal(score.rawWeightedAvg, 2.4, "Expected deterministic weighted average for fixture.");
assert.equal(score.rawScorePct, 48, "Raw PAT score should normalize to a 0-100 scale.");
assert.equal(score.score, score.rawScorePct, "Persisted canonical score alias must remain raw score.");

const summary = summarizeSubmissionScores({
  score: score.rawScorePct,
  weightedAvg: score.rawWeightedAvg,
  signalIntegrityScore: 0.75,
});

assert.equal(summary.unlockBasisScorePct, 48, "Unlock basis should stay on raw score.");
assert.equal(
  summary.confidenceAdjustedScorePct,
  36,
  "Confidence-adjusted display should remain separate from the raw unlock basis."
);
assert.equal(
  summary.confidenceAdjustedWeightedAvg,
  1.8,
  "Confidence-adjusted weighted average should be derived separately for display semantics."
);

console.log(
  "PASS smoke-firm-modular-runtime: 0 counts as answered, raw score remains canonical, confidence-adjusted display remains separate."
);
