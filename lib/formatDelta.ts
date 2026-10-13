/**
 * Canonical delta / score formatter (Redlines R2, 2026-07-08).
 *
 * The ONE formatter for every surface that renders a computed delta or score —
 * Alignment Board, BattleCard, consultant briefs, insight radars. It kills
 * float-precision leaks like "-15.100000000000001" / "+7.799999999999997" by
 * rounding to hundredths, and returns a signed, human string.
 *
 * Contract (tests/format-delta.test.ts): no output ever carries more than ONE
 * decimal place (box-c, R65 item 2: "-8.60" on the Fit Card reads "-8.6", the
 * hub's "6.8 pt" is the model). Whole values render without decimals (+15);
 * fractional values render one (+7.8 / -15.1), trailing zero dropped.
 * Dependency-free so client components can import it directly.
 */

/** Round to hundredths, collapsing binary-float noise (kept for callers that store the value). */
export function roundHundredths(value: number): number {
  return Math.round(value * 100) / 100;
}

/** Round to tenths: the displayed precision for every delta and score (box-c, R65 item 2). */
export function roundTenths(value: number): number {
  return Math.round(value * 10) / 10;
}

export type FormatDeltaOptions = {
  /** Prefix non-negative values with "+". Default true. */
  sign?: boolean;
  /** Rendered when the value is null / undefined / NaN. Default "n/a" (box-c, R65 item 6: no em dash in rendered copy). */
  empty?: string;
};

/** Signed, tenths-rounded delta string (e.g. "+7.8", "-15.1", "+15"). */
export function formatDelta(
  value: number | null | undefined,
  options: FormatDeltaOptions = {}
): string {
  const { sign = true, empty = "n/a" } = options;
  if (value === null || value === undefined || Number.isNaN(value)) {
    return empty;
  }
  const rounded = roundTenths(value);
  const magnitude = Number.isInteger(rounded)
    ? String(Math.abs(rounded))
    : Math.abs(rounded).toFixed(1);
  if (rounded > 0) return sign ? `+${magnitude}` : magnitude;
  if (rounded < 0) return `-${magnitude}`;
  return magnitude; // exact zero carries no sign
}

/** Tenths-rounded score string without a forced sign (e.g. "66", "72.5"). */
export function formatScoreValue(value: number | null | undefined, empty = "n/a"): string {
  return formatDelta(value, { sign: false, empty });
}
