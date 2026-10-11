import { SCALE, resolveStoredScale } from "@/lib/assessmentCore";

// scoring-core (R63): the one scale constant and the one stored-scale resolver
// live in lib/assessmentCore. These names stay for the existing importers.
export const PRODUCT_ASSESSMENT_SCALE_MIN: number = SCALE.min;
export const PRODUCT_ASSESSMENT_SCALE_MAX: number = SCALE.max;

export function resolveStoredProductAssessmentScale(
  scaleMin: number | null | undefined,
  scaleMax: number | null | undefined
) {
  return resolveStoredScale(scaleMin, scaleMax);
}

export function normalizeAnswerForStoredScale(
  value: number,
  scaleMin: number,
  scaleMax: number
) {
  const denominator = scaleMax - scaleMin;
  if (!Number.isFinite(value) || !Number.isFinite(denominator) || denominator <= 0) {
    return null;
  }

  return Math.round((((value - scaleMin) / denominator) * 100) * 10) / 10;
}
