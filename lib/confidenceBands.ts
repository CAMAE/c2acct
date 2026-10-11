/**
 * Confidence bands — ONE shared definition (2026-07-09 audit, CLASS 3). Every
 * engine previously carried its own thresholds (board/battleCard 3/6, product
 * engine 1/4/8, alignment engine 5/…); the audit flagged the divergence. This is
 * now the single source of truth.
 *
 * These thresholds are UX CONVENTIONS, not statistical significance tests. They
 * exist to keep thin evidence visibly qualified; copy must never imply a p-value,
 * confidence interval, or benchmark from them. The sample UNIT differs by surface
 * (firm reviews of a product / reviewed products / completed modules) — the band
 * is applied to whatever count of independent data points a surface has. See
 * docs/elite-sprint/AGGREGATION-METHODOLOGY.md §3.
 */
import { evidenceConfidenceLabel } from "@/lib/bandLexicon";
import type { FreshnessState } from "@/lib/freshness";

export type ConfidenceBand = "no_signal" | "sample_thin" | "emerging" | "grounded";

/** Sample-count boundaries (n < thin → sample_thin; n < emerging → emerging; else grounded). */
export const CONFIDENCE_SAMPLE_THRESHOLDS = { thin: 3, emerging: 6 } as const;

/** The one band function. `n` is the count of independent data points for the surface. */
export function confidenceBandForSampleSize(n: number): ConfidenceBand {
  if (n <= 0) return "no_signal";
  if (n < CONFIDENCE_SAMPLE_THRESHOLDS.thin) return "sample_thin";
  if (n < CONFIDENCE_SAMPLE_THRESHOLDS.emerging) return "emerging";
  return "grounded";
}

/**
 * Canonical short labels. Block 8 B8-2 (Cam's 2026-07-11 ruling): evidence
 * confidence collapses to THREE public states — Grounded / Early signal /
 * No signal — sourced from the one lexicon. The four internal keys stay for
 * threshold logic; thin+emerging both surface as Early signal. Retired the
 * long-form and sample-thin/limited-signal wording per the ruling.
 */
export const CONFIDENCE_BAND_LABEL: Record<ConfidenceBand, string> = {
  no_signal: evidenceConfidenceLabel("no_signal"),
  sample_thin: evidenceConfidenceLabel("sample_thin"),
  emerging: evidenceConfidenceLabel("emerging"),
  grounded: evidenceConfidenceLabel("grounded"),
};

// ─── scoring-core (R63, ruling 19): the Stale arm ────────────────────────────

/**
 * Stale evidence lowers the confidence label one step: Grounded reads Early
 * signal. Early signal and No signal have no lower step. Fresh and Aging change
 * nothing. The count never changes; only the label does.
 */
export function applyFreshnessToBand(band: ConfidenceBand, freshness: FreshnessState | null | undefined): ConfidenceBand {
  if (freshness === "stale" && band === "grounded") return "emerging";
  return band;
}

export type ConfidenceResolution = {
  band: ConfidenceBand;
  label: string;
  /** True when the Stale step moved the band below what the count alone gives. */
  loweredByStale: boolean;
};

/**
 * THE resolver every engine header calls: the count band from the one table,
 * then the Stale step. `freshness` is the state of the newest evidence behind
 * the reading, or null when the surface has no evidence date.
 */
export function resolveConfidence(input: { n: number; freshness?: FreshnessState | null }): ConfidenceResolution {
  const fromCount = confidenceBandForSampleSize(input.n);
  const band = applyFreshnessToBand(fromCount, input.freshness);
  return { band, label: CONFIDENCE_BAND_LABEL[band], loweredByStale: band !== fromCount };
}

/** The one sentence a header appends when the Stale step applied. */
export const STALE_CONFIDENCE_NOTE = "The newest evidence is stale, so the label sits one step below what the count alone would give.";
