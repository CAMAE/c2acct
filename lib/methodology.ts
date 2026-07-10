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

export const METHODOLOGY_VERSION = "1.1";
export const METHODOLOGY_SOURCE_DOC = "docs/elite-sprint/AGGREGATION-METHODOLOGY.md";

export type MethodologyChangelogEntry = {
  version: string;
  date: string;
  summary: string;
};

export const METHODOLOGY_CHANGELOG: readonly MethodologyChangelogEntry[] = [
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
      "Sample-thin — fewer than 3 data points",
      "Emerging — 3 to 5 data points",
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
];
