/**
 * Shared fit-tier heat for the Alignment Sandbox candidates and the vendor Sales
 * Card (Redlines R2/R3 heat, flipped 2026-07-09). ONE semantic scale everywhere:
 * green = strong/good fit, amber = middle, red = weak/bad — matching the existing
 * green-improve / orange-degrade delta language. Delta-driven, so the tiering
 * holds whether names are hidden (Pro) or revealed (Elite).
 */

export const FIT_TIER_KEYS = ["strong", "good", "weak"] as const;
export type FitTierKey = (typeof FIT_TIER_KEYS)[number] | "pending";

export function fitTierKey(delta: number | null): FitTierKey {
  if (delta === null) return "pending";
  if (delta >= 12) return "strong";
  if (delta >= 0) return "good";
  return "weak";
}

export function fitTierLabel(delta: number | null): string {
  switch (fitTierKey(delta)) {
    case "strong":
      return "Strong fit";
    case "good":
      return "Good fit";
    case "weak":
      return "Weak fit";
    default:
      return "Pending";
  }
}

// Green (strong) → amber (middle) → red (weak). Semantic, NOT pool-relative, so
// the same delta reads the same colour on the board and the BattleCard.
const HEAT_STOPS: Array<[number, number, number]> = [
  [47, 158, 92], // green  #2f9e5c
  [181, 132, 32], // amber  #b58420
  [194, 84, 65], // red    #c25441
];

/** delta +20 → green (t 0), 0 → amber (t 0.5), −20 → red (t 1). */
function fitHeatT(delta: number | null): number {
  if (delta === null) return 1;
  return Math.max(0, Math.min(1, 0.5 - delta / 40));
}

export function fitHeatColor(delta: number | null): string {
  if (delta === null) return "#5b6b85"; // cool-muted "pending"
  const t = fitHeatT(delta);
  const scaled = t * (HEAT_STOPS.length - 1);
  const i = Math.min(HEAT_STOPS.length - 2, Math.floor(scaled));
  const f = scaled - i;
  const a = HEAT_STOPS[i]!;
  const b = HEAT_STOPS[i + 1]!;
  const mix = (x: number, y: number) => Math.round(x + (y - x) * f);
  return `rgb(${mix(a[0], b[0])}, ${mix(a[1], b[1])}, ${mix(a[2], b[2])})`;
}

/** Fit-strength bar width (%): fuller for a stronger fit, min sliver for weak. */
export function fitBarPct(delta: number | null): number {
  if (delta === null) return 6;
  return Math.max(8, Math.min(100, 50 + delta * 1.2));
}
