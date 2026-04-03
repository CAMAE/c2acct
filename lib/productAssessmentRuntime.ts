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
