/**
 * scoring-core (R63): computeScore lives in lib/assessmentCore, the one scoring
 * module. This file keeps the submission summary helpers and re-exports the
 * score function and its types for the nine existing importers.
 */
export { computeScore, type ScoreInput, type ScoreResult } from "@/lib/assessmentCore";

export type SubmissionScoreSummary = {
  rawScorePct: number | null;
  rawWeightedAvg: number | null;
  signalIntegrityScore: number;
  confidenceAdjustedScorePct: number | null;
  confidenceAdjustedWeightedAvg: number | null;
  unlockBasisScorePct: number | null;
};

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function normalizeSignalIntegrityScore(value: unknown): number {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return 1;
  }

  if (numericValue < 0) {
    return 0;
  }

  if (numericValue > 1) {
    return 1;
  }

  return numericValue;
}

export function summarizeSubmissionScores(input: {
  score?: unknown;
  weightedAvg?: unknown;
  signalIntegrityScore?: unknown;
} | null | undefined): SubmissionScoreSummary {
  const rawScoreValue = Number(input?.score);
  const rawWeightedAvgValue = Number(input?.weightedAvg);
  const signalIntegrityScore = normalizeSignalIntegrityScore(input?.signalIntegrityScore);

  const rawScorePct = Number.isFinite(rawScoreValue) ? Math.round(rawScoreValue) : null;
  const rawWeightedAvg = Number.isFinite(rawWeightedAvgValue) ? rawWeightedAvgValue : null;

  return {
    rawScorePct,
    rawWeightedAvg,
    signalIntegrityScore,
    confidenceAdjustedScorePct:
      rawScorePct === null ? null : Math.round(rawScorePct * signalIntegrityScore),
    confidenceAdjustedWeightedAvg:
      rawWeightedAvg === null ? null : round2(rawWeightedAvg * signalIntegrityScore),
    unlockBasisScorePct: rawScorePct,
  };
}
