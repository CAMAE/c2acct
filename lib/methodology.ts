/**
 * Public methodology content (Governance Phase 2, A1), served at /methodology.
 *
 * scoring-core (R63, rulings 32 and 33): this page states what the code does,
 * in the reader's voice, in this order: what a score is; the five modules and
 * the index; the product assessment and the firm review; the peer benchmark;
 * confidence; freshness; divergence; knowledge banks; reproducibility; the
 * version. Every number it names is imported from the module that computes it
 * (lib/assessmentCore, lib/confidenceBands, lib/freshness), so the page cannot
 * drift from the code. The version and the changelog are the public record of
 * material changes (A1: material changes announced before effect).
 *
 * Locked by tests/methodology-content.contract.test.ts and tests/enforce-core.contract.test.ts.
 *
 * legal-load (R64, delta 7a, Cam 10/11): the 1.1 changelog entry keeps its original
 * wording, marked "(wording since retired)", because a changelog is a record of what
 * was published; the live sections never say it.
 */

import {
  ALIGNMENT_INDEX_MIN_MODULES,
  DISPLAY_TIER_MIN_N,
  DIVERGENCE_ALIGNED_WITHIN,
  DIVERGENCE_FLAGGED_AT,
  RANK_MIN_N,
  SCALE,
} from "@/lib/assessmentCore";
import { CONFIDENCE_SAMPLE_THRESHOLDS } from "@/lib/confidenceBands";
import { FIRM_PILLARS } from "@/lib/firmPillars";
import { FRESHNESS_WINDOWS } from "@/lib/freshness";
import type { TrustSurfaceTable } from "@/lib/trustContent";

export const METHODOLOGY_VERSION = "1.5";
export const METHODOLOGY_SOURCE_DOC = "docs/elite-sprint/AGGREGATION-METHODOLOGY.md";

/** The one phrase for the floor, used on every surface that names it. */
export const EVIDENCE_FLOOR_PHRASE =
  "the evidence floor (five contributing firms, no firm above 25 percent, structured consistent with the former 1996 DOJ/FTC safety zone, withdrawn in 2023)";

const REVIEW_WINDOW_MONTHS = 12;
const BANK_ITEMS = 90;
const BANK_SITTING_ITEMS = 30;

export type MethodologyChangelogEntry = {
  version: string;
  date: string;
  summary: string;
};

export const METHODOLOGY_CHANGELOG: readonly MethodologyChangelogEntry[] = [
  {
    version: "1.5",
    date: "October 11, 2026",
    summary:
      "1.5: the alignment index needs three final modules (fewer reads Partial); the benchmark shows what the cohort size allows (median at 5, quartiles at 10, percentile at 30, rank at 10); Stale evidence lowers the confidence label one step; Elite percentiles are the stored run's, never a live estimate; one scoring module.",
  },
  {
    version: "1.4",
    date: "October 8, 2026",
    summary:
      "1.4: cutoff, one firm one vote and the 25 percent cap are enforced in compute; one confidence table; coverage penalty active; divergence aligned under 5 and flagged at 10; anchors per bank; firmMaturity bands retired.",
  },
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
      "Added benchmark suppression (minimum-n safe harbor: at least 5 contributing firms, no single firm above 25%) (wording since retired). Documented the conflict-of-interest wall and the demo/synthetic data wall as companion integrity guards.",
  },
  {
    version: "1.0",
    date: "July 9, 2026",
    summary:
      "Initial published methodology: equal-weight averaging, divergence sample floor, unified confidence bands, single-pass display rounding.",
  },
];

export type MethodologySection = {
  key: string;
  title: string;
  paragraphs: readonly string[];
  bullets?: readonly string[];
  table?: TrustSurfaceTable;
};

/** The confidence table, one place (lib/confidenceBands). The words are the lexicon's. */
export const CONFIDENCE_TABLE: TrustSurfaceTable = {
  columns: ["Data points behind the reading", "Label"],
  rows: [
    ["0", "No signal"],
    [`1 to ${CONFIDENCE_SAMPLE_THRESHOLDS.emerging - 1}`, "Early signal"],
    [`${CONFIDENCE_SAMPLE_THRESHOLDS.emerging} and up`, "Grounded"],
  ],
};

/** The freshness table, one place (lib/freshness). */
export const FRESHNESS_TABLE: TrustSurfaceTable = {
  columns: ["Age of the newest evidence", "Label", "Effect"],
  rows: [
    [`under ${FRESHNESS_WINDOWS.agingAfterDays} days`, "Fresh", "none"],
    [`${FRESHNESS_WINDOWS.agingAfterDays} to ${FRESHNESS_WINDOWS.staleAfterDays - 1} days`, "Aging", "none"],
    [`${FRESHNESS_WINDOWS.staleAfterDays} days and older`, "Stale", "the confidence label drops one step"],
  ],
};

export const METHODOLOGY_SECTIONS: readonly MethodologySection[] = [
  {
    key: "score",
    title: "What a score is",
    paragraphs: [
      `A score is arithmetic on your answers. Every scored item is answered on one scale, ${SCALE.min} to ${SCALE.max}, where ${SCALE.min} means not in place. A module score is the plain average of those answers placed on a 0 to 100 line. It is rounded once, to a whole number, at the moment it is displayed. Nothing is weighted by question count, response count or anything else, and no surface shows or implies decimals.`,
      "These are informational readings for product and operating decisions. Where evidence is thin the surface says so, and where a peer benchmark cannot be published responsibly you see an insufficient peer data state instead of a number. Nothing here is professional advice, and no figure is a weighted, percentile-adjusted or significance-tested statistic beyond what this page states; there is no claimed statistical basis for any label.",
    ],
  },
  {
    key: "index",
    title: "The five modules and the alignment index",
    paragraphs: [
      `The firm assessment has five modules: ${FIRM_PILLARS.join(", ")}. Each produces one 0 to 100 score from its own answers, so the five carry equal weight by construction.`,
      `The alignment index is the equal-weight mean of the module scores you have completed, rounded once. It needs at least ${ALIGNMENT_INDEX_MIN_MODULES} final modules. With fewer, your surfaces read Partial and show the module scores on their own.`,
    ],
  },
  {
    key: "product-and-review",
    title: "The product assessment and the firm review",
    paragraphs: [
      "A vendor assesses its own product on the scored questions for the utilities it declares. That reading is the vendor assertion. Firms that use the product review it on the same scored questions, utility by utility. That reading is firm-observed. The two are computed, stored and labelled separately and are never blended into one number, and a vendor's own assertion never enters the firm-observed average it is measured against.",
      `One firm, one vote: a firm's latest final review of a product is its vote. Earlier finals stay stored and readable as history and do not count. A review counts for ${REVIEW_WINDOW_MONTHS} months; after that it stays readable on the product page and leaves every average.`,
    ],
  },
  {
    key: "benchmark",
    title: "The peer benchmark",
    paragraphs: [
      "Firms are compared inside a cohort: the same vertical, and the same size band once enough firms allow it. Demo and synthetic rows carry their own boundary and never enter a customer cohort.",
      `A cohort publishes only above ${EVIDENCE_FLOOR_PHRASE}. Below the floor you see an insufficient peer data state, never a number.`,
      "Each calendar quarter has a cutoff, the last day of the quarter. Only final assessments completed on or before the cutoff enter that quarter's run. The run is computed from those rows and frozen; every surface reads the stored run, so a later submission lands in the next quarter and never moves a published number. Your percentile is the share of the cohort at or below your score, counted, never estimated.",
      "What you see depends on how many firms are in the cohort:",
    ],
    bullets: [
      `Under ${DISPLAY_TIER_MIN_N.median} contributing firms: nothing is published.`,
      `${DISPLAY_TIER_MIN_N.median} to ${DISPLAY_TIER_MIN_N.quartiles - 1}: the cohort median and your band.`,
      `${DISPLAY_TIER_MIN_N.quartiles} to ${DISPLAY_TIER_MIN_N.percentile - 1}: the quartiles and your band. Your exact rank opens at ${RANK_MIN_N}.`,
      `${DISPLAY_TIER_MIN_N.percentile} and up: your percentile, with the quartiles and your rank.`,
    ],
  },
  {
    key: "confidence",
    title: "Confidence labels",
    paragraphs: [
      "Every reading carries a confidence label that says how much evidence stands behind it. The label is about volume only, never quality, and it is a convention for keeping thin evidence visibly qualified. It never implies a p-value, a confidence interval or a significance test. One table applies everywhere; what counts as a data point is stated on each surface (firm reviews of a product, completed modules, reviewed products).",
      "Stale evidence lowers the label one step: a Grounded reading on stale evidence reads Early signal.",
    ],
    table: CONFIDENCE_TABLE,
  },
  {
    key: "freshness",
    title: "Freshness labels",
    paragraphs: [
      "Every score carries the age of the newest evidence behind it: the most recent module submission, product assessment or firm review that fed it. Age changes the label, never the number. The figure stays exactly as computed and the freshness label sits beside it. A missing evidence date reads as unknown, not as stale.",
    ],
    table: FRESHNESS_TABLE,
  },
  {
    key: "divergence",
    title: "Divergence",
    paragraphs: [
      "When a vendor's assertion and the firm-observed reading differ, the gap is read item for item, and only once at least three distinct firms have reviewed the product. Below that floor the gap is shown as early signal and labelled too thin to read.",
      `Above the floor one pair of thresholds applies everywhere a gap is labelled: within ${DIVERGENCE_ALIGNED_WITHIN} points the two readings are aligned; a gap of ${DIVERGENCE_FLAGGED_AT} points or more is flagged as a calibration gap; between the two it is watched, not asserted.`,
    ],
  },
  {
    key: "knowledge-banks",
    title: "Knowledge banks",
    paragraphs: [
      `Each knowledge bank holds ${BANK_ITEMS} items. A sitting serves ${BANK_SITTING_ITEMS} of them, drawn across the bank's difficulty tiers, with the anchor items the bank's charter names served in every sitting. The sitting score is the share answered correctly, shown as a whole-number percent with its band. Sittings are not benchmarked across firms.`,
    ],
  },
  {
    key: "reproducibility",
    title: "Reproducibility",
    paragraphs: [
      "Every published number can be recomputed from the stored raw rows: the answers and their scale, the final flag and timestamp of each submission, and the cohort each firm belongs to. Nothing is published that cannot be rebuilt from those rows, and the run that produced a benchmark is stored with its cutoff so the same cut can be reproduced later.",
    ],
  },
  {
    key: "version",
    title: "The methodology version",
    paragraphs: [
      `This is methodology version ${METHODOLOGY_VERSION}. Material changes are announced in the changelog below before they take effect, and the version moves with them so a reading can always be traced to the rules it was computed under.`,
    ],
  },
];
