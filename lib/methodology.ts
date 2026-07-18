/**
 * Public methodology content (Governance Phase 2, A1) — the rendered, versioned
 * form of docs/elite-sprint/AGGREGATION-METHODOLOGY.md, served at /methodology.
 *
 * This is the STATED methodology: the audit rule is "defensible if stated,
 * indefensible if implied otherwise." Copy here must never imply weighting,
 * percentile, or statistical significance beyond what is written. Keep this in
 * sync with the source doc; the version + changelog below are the public record
 * of material changes (A1: material changes announced before effect).
 *
 * Locked by tests/methodology-content.contract.test.ts.
 */

import { FRESHNESS_WINDOWS } from "@/lib/freshness";

export const METHODOLOGY_VERSION = "1.3";
export const METHODOLOGY_SOURCE_DOC = "docs/elite-sprint/AGGREGATION-METHODOLOGY.md";

export type MethodologyChangelogEntry = {
  version: string;
  date: string;
  summary: string;
};

export const METHODOLOGY_CHANGELOG: readonly MethodologyChangelogEntry[] = [
  {
    version: "1.3",
    date: "July 17, 2026",
    summary:
      "Published the quarterly benchmark cutoff mechanics: each calendar quarter has a cutoff date, and only assessments completed on or before it count toward that quarter's benchmark cut. The cutoff is a calendar deadline for what is included next — it never alters a score already computed.",
  },
  {
    version: "1.2",
    date: "July 17, 2026",
    summary:
      "Published the evidence-freshness windows (Fresh under 90 days, Aging 90–365 days, Stale over 365 days). Stated the honest-decay law: evidence age is labelled beside a score, never used to silently alter it.",
  },
  {
    version: "1.1",
    date: "July 10, 2026",
    summary:
      "Added benchmark suppression (minimum-n safe harbor: at least 5 contributing firms, no single firm above 25%). Documented the conflict-of-interest wall and the demo/synthetic data wall as companion integrity guards.",
  },
  {
    version: "1.0",
    date: "July 9, 2026",
    summary:
      "Initial published methodology: equal-weight averaging, directional-divergence sample floor, unified confidence bands, single-pass display rounding.",
  },
];

export type MethodologySection = {
  key: string;
  title: string;
  paragraphs: readonly string[];
  bullets?: readonly string[];
};

export const METHODOLOGY_SECTIONS: readonly MethodologySection[] = [
  {
    key: "scope",
    title: "What these numbers are — and are not",
    paragraphs: [
      "Patalign reports directional, informational readings built from firm and vendor assessments. Figures are presented as plain averages with the sample size shown. Nothing here is a weighted, percentile, or significance-tested statistic, and nothing is professional advice.",
      "Where evidence is thin, the surface says so; where a peer benchmark cannot be published responsibly, we show an insufficient-data state instead of a number.",
    ],
  },
  {
    key: "averaging",
    title: "Averaging — equal-weight by design",
    paragraphs: [
      "Firm and vendor alignment readings average self-normalized 0–100 module scores. The five assessment modules are equal pillars of the framework; each emits one 0–100 score, so within-module question counts are already absorbed. Weighting by question or response count would distort the framework's stated structure, so we do not do it.",
      "Product readings use one-firm-one-vote: each firm's review of a product counts once, so multi-utility reviews cannot dominate the market read.",
    ],
  },
  {
    key: "divergence",
    title: "Divergence — a sample floor before we assert a gap",
    paragraphs: [
      "When a vendor's self-report differs from the firm-reviewed average, we only call it a directional divergence once at least three firm reviews exist. Below that floor the gap is shown as an early signal, explicitly labelled as too thin to read.",
    ],
  },
  {
    key: "confidence",
    title: "Confidence bands — UX conventions, not statistics",
    paragraphs: [
      "Every surface carries a confidence band that keeps thin evidence visibly qualified. These bands are user-experience conventions with no claimed statistical basis — they never imply a p-value, confidence interval, or significance test.",
    ],
    bullets: [
      "No signal — no current-state evidence yet",
      "Early signal — fewer than 6 data points",
      "Grounded — 6 or more data points",
    ],
  },
  {
    key: "suppression",
    title: "Benchmark suppression — a minimum-n safe harbor",
    paragraphs: [
      "Confidence bands label thin evidence; suppression removes it. A cross-firm or peer benchmark is not published when either guard fails: fewer than five distinct contributing firms, or a single firm supplying more than 25% of the cut. This is the compensation-survey safe-harbor rule, adopted verbatim.",
      "A suppressed benchmark shows an insufficient-peer-data state — never a number. Equal-weight cuts of five or more firms always clear the dominance guard by construction.",
    ],
  },
  {
    key: "integrity",
    title: "Integrity walls",
    paragraphs: [
      "Two companion guards protect every published aggregate. Demo and synthetic data are excluded from every customer-facing pool. And a conflict-of-interest wall ensures a vendor's own self-report never enters the firm-reviewed peer average it is measured against — the two are always kept separate and separately labelled.",
    ],
  },
  {
    key: "rounding",
    title: "Rounding — a single authoritative pass",
    paragraphs: [
      "The user-facing value is rounded once, to an integer, at display. Internal aggregates may carry one extra decimal of precision as a convenience, but that intermediate step is bounded and can never change a displayed integer or cross a band threshold. Patalign does not present, or imply, sub-integer precision.",
    ],
  },
  {
    key: "freshness",
    title: "Freshness windows — evidence age is labelled, never decayed",
    paragraphs: [
      `Every score carries the age of the evidence behind it — the most recent module submission, product assessment, or firm review that fed it. Patalign classifies that age into three published windows: Fresh (under ${FRESHNESS_WINDOWS.agingAfterDays} days), Aging (${FRESHNESS_WINDOWS.agingAfterDays}–${FRESHNESS_WINDOWS.staleAfterDays} days), and Stale (over ${FRESHNESS_WINDOWS.staleAfterDays} days).`,
      "Age changes the label, never the number. Patalign does not silently decay, discount, or otherwise alter a score because it is old — the figure stays exactly as computed and the freshness state sits beside it so you can weigh its currency yourself. Absence of an evidence date is treated as unknown, not as stale.",
    ],
    bullets: [
      `Fresh — newest evidence under ${FRESHNESS_WINDOWS.agingAfterDays} days old.`,
      `Aging — newest evidence ${FRESHNESS_WINDOWS.agingAfterDays} to ${FRESHNESS_WINDOWS.staleAfterDays} days old.`,
      `Stale — newest evidence over ${FRESHNESS_WINDOWS.staleAfterDays} days old.`,
    ],
  },
  {
    key: "quarterly-cutoff",
    title: "Quarterly benchmark cutoff — a published deadline, not a score change",
    paragraphs: [
      "Patalign publishes a quarterly benchmark cut. Each calendar quarter has a cutoff date — the last day of the quarter — and an assessment counts toward that quarter's benchmark only if it was completed on or before that date. This is the same calendar-deadline pattern used by established B2B benchmark reports: a predictable date that tells everyone which evidence is included next.",
      "The cutoff governs inclusion, not value. It never changes, weights, or decays a score that has already been computed — a figure completed after the cutoff simply lands in the next quarter's cut instead of the current one. Membership tier changes what you see inside the benchmark (bands and percentiles for all members; deeper ranked position for Elite), never whether the cutoff applies to you.",
    ],
    bullets: [
      "The cutoff is the last calendar day of each quarter (Mar 31, Jun 30, Sep 30, Dec 31).",
      "Assessments completed on or before the cutoff count for that quarter; later ones count for the next.",
      "The cutoff decides what is included in the next cut — it does not alter any score already computed.",
    ],
  },
];
