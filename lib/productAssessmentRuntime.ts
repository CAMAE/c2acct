export const PRODUCT_ASSESSMENT_SCALE_MIN = 0;
export const PRODUCT_ASSESSMENT_SCALE_MAX = 5;
const LEGACY_PRODUCT_ASSESSMENT_SCALE_MIN = 1;

export function resolveStoredProductAssessmentScale(
  scaleMin: number | null | undefined,
  scaleMax: number | null | undefined
) {
  if (Number.isFinite(scaleMin) && Number.isFinite(scaleMax) && Number(scaleMax) > Number(scaleMin)) {
    return {
      scaleMin: Number(scaleMin),
      scaleMax: Number(scaleMax),
    };
  }

  // Older malformed product submissions without explicit scale metadata should keep the legacy 1..5 fallback.
  return {
    scaleMin: LEGACY_PRODUCT_ASSESSMENT_SCALE_MIN,
    scaleMax: PRODUCT_ASSESSMENT_SCALE_MAX,
  };
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
