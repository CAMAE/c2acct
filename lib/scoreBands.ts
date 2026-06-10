/**
 * Maturity bands for PAT module/capability scores (0-100).
 * Band colors reuse the WS11-K radar tokens (globals.css) so semantic
 * color stays reserved for band meaning across every chart component.
 */
export type ScoreBandKey = "emerging" | "building" | "established" | "optimizing";

export type ScoreBand = {
  key: ScoreBandKey;
  label: string;
  colorVar: string;
};

const BANDS: Record<ScoreBandKey, ScoreBand> = {
  emerging: { key: "emerging", label: "Emerging", colorVar: "var(--radar-red)" },
  building: { key: "building", label: "Building", colorVar: "var(--radar-amber)" },
  established: { key: "established", label: "Established", colorVar: "var(--radar-green)" },
  optimizing: { key: "optimizing", label: "Optimizing", colorVar: "var(--radar-deep-green)" },
};

export function getScoreBand(score: number): ScoreBand {
  if (score >= 85) return BANDS.optimizing;
  if (score >= 70) return BANDS.established;
  if (score >= 50) return BANDS.building;
  return BANDS.emerging;
}

export const NEUTRAL_BAR_COLOR = "rgba(6, 54, 116, 0.38)";
export const TRACK_COLOR = "rgba(6, 54, 116, 0.08)";
export const GUIDE_COLOR = "rgba(6, 54, 116, 0.10)";
