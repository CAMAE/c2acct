import { computeScore, normalizeSignalIntegrityScore, summarizeSubmissionScores } from "@/lib/scoring";
import { SCORE_BANDS, SCORE_BAND_ORDER, scoreBandFor, scoreChipLabel, evidenceConfidenceFor, evidenceConfidenceLabel, BANNED_BAND_LABELS, ALLOWED_BAND_LABELS } from "@/lib/bandLexicon";
import {
  MAX_CONTRIBUTOR_SHARE,
  MIN_CONTRIBUTORS,
  evaluateBenchmarkSuppression,
  evaluateBenchmarkSuppressionByCount,
} from "@/lib/benchmarkSuppression";
import {
  PRODUCT_GENERAL_QUESTION_COUNT,
  PRODUCT_OPEN_ENDED_QUESTION_COUNT,
  PRODUCT_SCORED_QUESTIONS_PER_SUBCATEGORY,
  PRODUCT_UTILITY_REGISTRY,
  PRODUCT_UTILITY_REGISTRY_VERSION,
  PRODUCT_UTILITY_SCORED_QUESTION_COUNT,
  PRODUCT_UTILITY_SUBCATEGORY_COUNT,
} from "@/lib/productUtilityRegistry";
import { FIRM_MODULE_DEFINITIONS } from "@/lib/firmPat";

/**
 * The surface registry: the ONLY bridge between a golden JSON item and real
 * product code.
 *
 * Golden files stay pure data (no imports, no code, reviewable as a diff), and
 * each item names a surface here. Every entry takes the item's `input` and
 * returns a plain JSON-comparable value. Keeping the mapping explicit means an
 * eval can never accidentally exercise something other than the shipped
 * function it claims to test.
 */
export type Surface = (input: unknown) => unknown;

const asRecord = (input: unknown): Record<string, unknown> =>
  input && typeof input === "object" ? (input as Record<string, unknown>) : {};

export const SURFACES: Record<string, Surface> = {
  // ── scoring ──────────────────────────────────────────────────────────────
  "scoring.computeScore": (input) => {
    const args = asRecord(input);
    return computeScore({
      answers: args.answers as Record<string, number> | null,
      scaleMin: Number(args.scaleMin),
      scaleMax: Number(args.scaleMax),
    });
  },
  "scoring.normalizeSignalIntegrityScore": (input) =>
    normalizeSignalIntegrityScore(asRecord(input).value),
  "scoring.summarizeSubmissionScores": (input) => {
    const args = asRecord(input);
    return summarizeSubmissionScores(args.submission === null ? null : asRecord(args.submission));
  },

  // ── bands / lexicon ──────────────────────────────────────────────────────
  "bands.scoreBandFor": (input) => {
    const band = scoreBandFor(Number(asRecord(input).score));
    return { key: band.key, label: band.label };
  },
  "bands.scoreChipLabel": (input) => scoreChipLabel(Number(asRecord(input).score)),
  "bands.bandOrder": () => SCORE_BAND_ORDER,
  "bands.bandBounds": (input) => {
    const key = String(asRecord(input).key) as keyof typeof SCORE_BANDS;
    const band = SCORE_BANDS[key];
    return band ? { min: band.min, max: band.max } : null;
  },
  "bands.evidenceConfidenceFor": (input) =>
    evidenceConfidenceFor(asRecord(input).internal as "no_signal" | "sample_thin" | "emerging" | "grounded"),
  "bands.evidenceConfidenceLabel": (input) =>
    evidenceConfidenceLabel(asRecord(input).internal as "no_signal" | "sample_thin" | "emerging" | "grounded"),
  "bands.bannedLabelsAreNotAllowed": () =>
    BANNED_BAND_LABELS.filter((label) => (ALLOWED_BAND_LABELS as readonly string[]).includes(label)),

  // ── suppression ──────────────────────────────────────────────────────────
  "suppression.evaluate": (input) => evaluateBenchmarkSuppression(asRecord(input).weights as number[]),
  "suppression.evaluateByCount": (input) =>
    evaluateBenchmarkSuppressionByCount(Number(asRecord(input).contributorCount)),
  "suppression.thresholds": () => ({
    minContributors: MIN_CONTRIBUTORS,
    maxContributorShare: MAX_CONTRIBUTOR_SHARE,
  }),

  // ── registry lookups ─────────────────────────────────────────────────────
  "registry.counts": () => ({
    subcategoryCount: PRODUCT_UTILITY_SUBCATEGORY_COUNT,
    scoredPerSubcategory: PRODUCT_SCORED_QUESTIONS_PER_SUBCATEGORY,
    scoredQuestionCount: PRODUCT_UTILITY_SCORED_QUESTION_COUNT,
    generalQuestionCount: PRODUCT_GENERAL_QUESTION_COUNT,
    openEndedQuestionCount: PRODUCT_OPEN_ENDED_QUESTION_COUNT,
  }),
  "registry.version": () => PRODUCT_UTILITY_REGISTRY_VERSION,
  "registry.utilityKeys": () => PRODUCT_UTILITY_REGISTRY.map((utility) => utility.key).sort(),
  "registry.utilityCount": () => PRODUCT_UTILITY_REGISTRY.length,
  /** Utilities whose subcategory count deviates from the declared architecture. */
  "registry.subcategoryShapeViolations": () =>
    PRODUCT_UTILITY_REGISTRY.filter(
      (utility) => utility.subcategories.length !== PRODUCT_UTILITY_SUBCATEGORY_COUNT
    ).map((utility) => utility.key),
  /** Subcategories whose scored-question count deviates. */
  "registry.scoredQuestionShapeViolations": () =>
    PRODUCT_UTILITY_REGISTRY.flatMap((utility) =>
      utility.subcategories
        .filter((sub) => sub.questions.length !== PRODUCT_SCORED_QUESTIONS_PER_SUBCATEGORY)
        .map((sub) => `${utility.key}/${sub.key}`)
    ),
  "registry.duplicateUtilityKeys": () => {
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const utility of PRODUCT_UTILITY_REGISTRY) {
      if (seen.has(utility.key)) dupes.push(utility.key);
      seen.add(utility.key);
    }
    return dupes;
  },
  "registry.firmModuleKeys": () => FIRM_MODULE_DEFINITIONS.map((definition) => definition.key),
  "registry.duplicateFirmModuleKeys": () => {
    const seen = new Set<string>();
    const dupes: string[] = [];
    for (const definition of FIRM_MODULE_DEFINITIONS) {
      if (seen.has(definition.key)) dupes.push(definition.key);
      seen.add(definition.key);
    }
    return dupes;
  },
};

export function getSurface(name: string): Surface | undefined {
  return SURFACES[name];
}
