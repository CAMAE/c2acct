/**
 * ONE band lexicon (Block 8 B8-2, Cam's ruling 2026-07-11). The single source of
 * truth for every customer-facing band label. Two SEPARATE axes — never mix them,
 * never concatenate a confidence label onto a score band.
 *
 *  A. SCORE BANDS — for any 0-100 score/index. Five bands. Chip reads "68 · Building".
 *  B. EVIDENCE CONFIDENCE — about DATA VOLUME only (never quality). Three states,
 *     rendered as their own small label, never joined to a score band.
 *
 * Killed labels (banned by tests/band-lexicon.contract.test.ts): Optimizing,
 * Emerging, Full confidence, Pending confidence, Limited signal, Sample-thin.
 */

// ─── A. SCORE BANDS (0-100) ────────────────────────────────────────────────
export type ScoreBandKey = "early" | "developing" | "building" | "established" | "leading";

export type ScoreBandDef = {
  key: ScoreBandKey;
  label: string;
  /** Inclusive lower bound of the band. */
  min: number;
  /** Inclusive upper bound of the band. */
  max: number;
  /** Chart color token (deep-red → deep-green ramp). */
  colorVar: string;
};

export const SCORE_BANDS: Record<ScoreBandKey, ScoreBandDef> = {
  early: { key: "early", label: "Early", min: 0, max: 39, colorVar: "var(--radar-deep-red)" },
  developing: { key: "developing", label: "Developing", min: 40, max: 59, colorVar: "var(--radar-red)" },
  building: { key: "building", label: "Building", min: 60, max: 74, colorVar: "var(--radar-amber)" },
  established: { key: "established", label: "Established", min: 75, max: 89, colorVar: "var(--radar-green)" },
  leading: { key: "leading", label: "Leading", min: 90, max: 100, colorVar: "var(--radar-deep-green)" },
};

/** Band-order low→high, for iteration / legends. */
export const SCORE_BAND_ORDER: ScoreBandKey[] = ["early", "developing", "building", "established", "leading"];

/** The one score-band function. Clamps to [0,100]. */
export function scoreBandFor(score: number): ScoreBandDef {
  const s = Math.max(0, Math.min(100, score));
  if (s >= SCORE_BANDS.leading.min) return SCORE_BANDS.leading;
  if (s >= SCORE_BANDS.established.min) return SCORE_BANDS.established;
  if (s >= SCORE_BANDS.building.min) return SCORE_BANDS.building;
  if (s >= SCORE_BANDS.developing.min) return SCORE_BANDS.developing;
  return SCORE_BANDS.early;
}

/** Canonical chip text: "68 · Building". Rounds the score. */
export function scoreChipLabel(score: number): string {
  return `${Math.round(score)} · ${scoreBandFor(score).label}`;
}

// ─── B. EVIDENCE CONFIDENCE (data volume only) ─────────────────────────────
/** Public confidence states — the only three we ever show a customer. */
export type EvidenceConfidence = "grounded" | "early_signal" | "no_signal";

export const EVIDENCE_CONFIDENCE_LABEL: Record<EvidenceConfidence, string> = {
  grounded: "Grounded",
  early_signal: "Early signal",
  no_signal: "No signal",
};

/**
 * Collapse the internal sample-count band keys (kept for logic granularity in
 * lib/confidenceBands.ts) to the three public confidence states. Thin/emerging
 * both read "Early signal"; only a true 0-count reads "No signal".
 */
export function evidenceConfidenceFor(
  internal: "no_signal" | "sample_thin" | "emerging" | "grounded"
): EvidenceConfidence {
  if (internal === "grounded") return "grounded";
  if (internal === "no_signal") return "no_signal";
  return "early_signal";
}

export function evidenceConfidenceLabel(
  internal: "no_signal" | "sample_thin" | "emerging" | "grounded"
): string {
  return EVIDENCE_CONFIDENCE_LABEL[evidenceConfidenceFor(internal)];
}

// ─── Banned strays (contract-test guard) ───────────────────────────────────
/** Customer-facing labels retired by Cam's 2026-07-11 ruling. */
export const BANNED_BAND_LABELS: readonly string[] = [
  "Optimizing",
  "Emerging",
  "Full confidence",
  "Pending confidence",
  "Limited signal",
  "Sample-thin",
] as const;

/** Every label the lexicon is allowed to surface (for the allow-list assertion). */
export const ALLOWED_BAND_LABELS: readonly string[] = [
  ...SCORE_BAND_ORDER.map((k) => SCORE_BANDS[k].label),
  ...Object.values(EVIDENCE_CONFIDENCE_LABEL),
] as const;
