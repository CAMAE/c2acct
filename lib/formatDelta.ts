/**
 * Canonical delta / score formatter (Redlines R2, 2026-07-08).
 *
 * The ONE formatter for every surface that renders a computed delta or score —
 * Alignment Board, Sales Card, consultant briefs, insight radars. It kills
 * float-precision leaks like "-15.100000000000001" / "+7.799999999999997" by
 * rounding to hundredths, and returns a signed, human string.
 *
 * Contract (tests/format-delta.test.ts): no output ever carries more than two
 * decimal places. Whole values render without decimals (+15); fractional values
 * render exactly two (+7.80 / -15.10). Dependency-free so client components can
 * import it directly.
 */

/** Round to hundredths, collapsing binary-float noise. */
export function roundHundredths(value: number): number {
  return Math.round(value * 100) / 100;
}

export type FormatDeltaOptions = {
  /** Prefix non-negative values with "+". Default true. */
  sign?: boolean;
  /** Rendered when the value is null / undefined / NaN. Default "—". */
  empty?: string;
};

/** Signed, hundredths-rounded delta string (e.g. "+7.80", "-15.10", "+15"). */
export function formatDelta(
  value: number | null | undefined,
  options: FormatDeltaOptions = {}
): string {
  const { sign = true, empty = "—" } = options;
  if (value === null || value === undefined || Number.isNaN(value)) {
    return empty;
  }
  const rounded = roundHundredths(value);
  const magnitude = Number.isInteger(rounded)
    ? String(Math.abs(rounded))
    : Math.abs(rounded).toFixed(2);
  if (rounded > 0) return sign ? `+${magnitude}` : magnitude;
  if (rounded < 0) return `-${magnitude}`;
  return magnitude; // exact zero carries no sign
}

/** Hundredths-rounded score string without a forced sign (e.g. "66", "72.50"). */
export function formatScoreValue(value: number | null | undefined, empty = "—"): string {
  return formatDelta(value, { sign: false, empty });
}
