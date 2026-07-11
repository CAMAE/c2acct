/**
 * Maturity bands for PAT module/capability scores (0-100).
 *
 * Block 8 B8-2: the band definitions now live in the ONE lexicon
 * (lib/bandLexicon.ts, Cam's 2026-07-11 ruling — five bands Early/Developing/
 * Building/Established/Leading). This module stays as the chart-facing shim so
 * existing chart components keep the same {key,label,colorVar} shape and the
 * neutral track/guide color tokens.
 */
import { SCORE_BANDS, scoreBandFor, type ScoreBandKey } from "@/lib/bandLexicon";

export type { ScoreBandKey } from "@/lib/bandLexicon";

export type ScoreBand = {
  key: ScoreBandKey;
  label: string;
  colorVar: string;
};

export function getScoreBand(score: number): ScoreBand {
  const band = scoreBandFor(score);
  return { key: band.key, label: band.label, colorVar: band.colorVar };
}

/** Direct access to a band definition by key (chart legends). */
export function scoreBandByKey(key: ScoreBandKey): ScoreBand {
  const band = SCORE_BANDS[key];
  return { key: band.key, label: band.label, colorVar: band.colorVar };
}

export const NEUTRAL_BAR_COLOR = "rgba(6, 54, 116, 0.38)";
export const TRACK_COLOR = "rgba(6, 54, 116, 0.08)";
export const GUIDE_COLOR = "rgba(6, 54, 116, 0.10)";
