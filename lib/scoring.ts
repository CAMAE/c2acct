export type ScoreInput = {
  answers: Record<string, number> | null | undefined;
  scaleMin: number;
  scaleMax: number;
};

export type ScoreResult = {
  scaleMin: number;
  scaleMax: number;
  score: number;
  rawScorePct: number;
  weightedAvg: number | null;
  rawWeightedAvg: number | null;
  totalWeight: number;
  answeredCount: number;
};

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

export function computeScore(input: ScoreInput): ScoreResult {
  const { answers, scaleMin, scaleMax } = input;

  const safeAnswers: Record<string, number> =
    answers && typeof answers === "object" ? (answers as Record<string, number>) : {};

  const values = Object.values(safeAnswers)
    .map((value) => Number(value))
    .filter((value) => Number.isFinite(value));

  const answeredCount = values.length;
  if (answeredCount === 0) {
    return {
      score: 0,
      rawScorePct: 0,
      weightedAvg: null,
      rawWeightedAvg: null,
      totalWeight: 0,
      answeredCount: 0,
      scaleMin,
      scaleMax,
    };
  }

  const totalWeight = answeredCount;
  const sum = values.reduce((left, right) => left + right, 0);
  const weightedAvg = sum / totalWeight;

  const denominator = scaleMax - scaleMin;
  const rawScorePct = denominator === 0 ? 0 : Math.round(((weightedAvg - scaleMin) / denominator) * 100);

  return {
    score: rawScorePct,
    rawScorePct,
    weightedAvg,
    rawWeightedAvg: weightedAvg,
    totalWeight,
    answeredCount,
    scaleMin,
    scaleMax,
  };
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
