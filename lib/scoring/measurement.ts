import { clamp01, normalizeTo01 } from "@/lib/scoring/normalize";

export type ModuleMeasurement = {
  weightedAvg: number | null;
  moduleScoreNormalized: number;
  answeredCount: number;
  totalWeight: number;
  scaleMin: number;
  scaleMax: number;
};

type MeasurementQuestion = {
  key: string;
  weight?: number;
};

type ComputeModuleMeasurementArgs = {
  answers: Record<string, unknown>;
  questions: MeasurementQuestion[];
  scaleMin: number;
  scaleMax: number;
};

export function computeModuleMeasurement(args: ComputeModuleMeasurementArgs): ModuleMeasurement {
  const { answers, questions, scaleMin, scaleMax } = args;

  let weightedSum = 0;
  let weightedRawSum = 0;
  let totalWeight = 0;
  let answeredCount = 0;

  for (const question of questions) {
    const raw = answers?.[question.key];
    if (raw === null || raw === undefined) {
      continue;
    }

    const numericValue = Number(raw);
    if (!Number.isFinite(numericValue)) {
      continue;
    }

    const weight = Number.isFinite(question.weight) ? Math.max(0, Number(question.weight)) : 1;
    const normalized = normalizeTo01(numericValue, scaleMin, scaleMax);

    weightedSum += normalized * weight;
    weightedRawSum += numericValue * weight;
    totalWeight += weight;
    answeredCount += 1;
  }

  const weightedAvg = totalWeight > 0 ? weightedRawSum / totalWeight : null;
  const moduleScoreNormalized = totalWeight > 0 ? clamp01(weightedSum / totalWeight) : 0;

  return {
    weightedAvg,
    moduleScoreNormalized,
    answeredCount,
    totalWeight,
    scaleMin,
    scaleMax,
  };
}
