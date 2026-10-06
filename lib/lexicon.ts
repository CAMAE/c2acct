import { FIRM_PILLARS, PILLAR_BY_MODULE_KEY, PILLAR_BY_MODULE_TITLE, pillarForModule, type FirmPillar } from "@/lib/firmPillars";
import { FRESHNESS_STATE_LABEL } from "@/lib/freshness";
import { guideWord, type RoleWordForm } from "@/lib/roleWords";

/**
 * pattern box B (R61, R-U): the ONE source for the words a reader sees — roles,
 * tiers, evidence, benchmark, freshness, score names, product terms and the
 * assessment vocabulary — in the three locales. Components import from here (or
 * from lib/firmPillars for module labels, which this module re-exports); the
 * retired-names guard (tests/guard-retired-names.contract.test.ts) keeps the old
 * words out of customer copy. Routes, identifiers and admin pages never change.
 *
 * "Guide" keeps the R17 flag law: guideWord() reads "Guide" while
 * PAT_ENABLE_NEW_FRONT_DOOR=1 (preview and the deploy night) and the production
 * word flag-off, so flag-off copy stays byte-identical to the baseline.
 */
export type Locale = "en" | "es" | "fr";

const ROLE_WORDS = {
  en: { firm: "Firm", vendor: "Vendor", enterprise: "Enterprise", admin: "Admin" },
  es: { firm: "Firma", vendor: "Proveedor", enterprise: "Empresa", admin: "Admin" },
  fr: { firm: "Cabinet", vendor: "Vendeur", enterprise: "Entreprise", admin: "Admin" },
} as const;

/** Role words. The Guide word comes from lib/roleWords (flag law), the rest from the table. */
export function roleWord(role: "firm" | "vendor" | "enterprise" | "admin" | "guide", locale: Locale = "en", form: RoleWordForm = "Consultant"): string {
  if (role === "guide") {
    const word = guideWord(form);
    if (locale === "es") return word === "Guide" ? "Guía" : word === "guide" ? "guía" : word === "Guides" ? "Guías" : word === "guides" ? "guías" : word;
    if (locale === "fr") return word; // "Guide" is the French word too
    return word;
  }
  return ROLE_WORDS[locale][role];
}

export const TIER_WORDS = {
  en: { pro: "Pro", elite: "Elite", enterprise: "Enterprise" },
  es: { pro: "Pro", elite: "Elite", enterprise: "Empresa" },
  fr: { pro: "Pro", elite: "Elite", enterprise: "Entreprise" },
} as const;

export const EVIDENCE_WORDS = {
  en: { firmReviewed: "firm-reviewed", vendorSelfReported: "vendor self-reported", divergence: "divergence" },
  es: { firmReviewed: "revisado por firmas", vendorSelfReported: "autoinformado por el proveedor", divergence: "divergencia" },
  fr: { firmReviewed: "évalué par les cabinets", vendorSelfReported: "auto-déclaré par le vendeur", divergence: "divergence" },
} as const;

export const BENCHMARK_WORDS = {
  en: { peerBenchmark: "peer benchmark", cohort: "cohort", percentile: "percentile", topDecile: "top decile", topQuartile: "top quartile", upperMiddle: "upper middle", lowerMiddle: "lower middle", bottomQuartile: "bottom quartile" },
  es: { peerBenchmark: "referencia entre pares", cohort: "cohorte", percentile: "percentil", topDecile: "decil superior", topQuartile: "cuartil superior", upperMiddle: "medio alto", lowerMiddle: "medio bajo", bottomQuartile: "cuartil inferior" },
  fr: { peerBenchmark: "référence entre pairs", cohort: "cohorte", percentile: "percentile", topDecile: "décile supérieur", topQuartile: "quartile supérieur", upperMiddle: "milieu haut", lowerMiddle: "milieu bas", bottomQuartile: "quartile inférieur" },
} as const;

/** Quartile 1..4 (1 = top) in words, never "Q1" to "Q4" alone. */
export function quartileWord(quartile: 1 | 2 | 3 | 4, locale: Locale = "en"): string {
  const words = BENCHMARK_WORDS[locale];
  return quartile === 1 ? words.topQuartile : quartile === 2 ? words.upperMiddle : quartile === 3 ? words.lowerMiddle : words.bottomQuartile;
}

export const FRESHNESS_WORDS = {
  en: FRESHNESS_STATE_LABEL,
  es: { fresh: "Reciente", aging: "Envejeciendo", stale: "Caducado" },
  fr: { fresh: "Récent", aging: "Vieillissant", stale: "Périmé" },
} as const;

export const SCORE_WORDS = {
  en: { alignmentIndex: "alignment index", stackAlignment: "stack alignment", firmReviewedScore: "firm-reviewed score" },
  es: { alignmentIndex: "índice de alineación", stackAlignment: "alineación del stack", firmReviewedScore: "puntuación revisada por firmas" },
  fr: { alignmentIndex: "indice d’alignement", stackAlignment: "alignement de la pile", firmReviewedScore: "score évalué par les cabinets" },
} as const;

export const PRODUCT_WORDS = {
  en: { productAssessment: "product assessment", productReview: "product review", productFitCard: "Product Fit Card", techStackSandbox: "Tech Stack Sandbox", reviewRefresh: "Review refresh" },
  es: { productAssessment: "evaluación de producto", productReview: "revisión de producto", productFitCard: "Product Fit Card", techStackSandbox: "Tech Stack Sandbox", reviewRefresh: "Actualización de revisión" },
  fr: { productAssessment: "évaluation produit", productReview: "revue produit", productFitCard: "Product Fit Card", techStackSandbox: "Tech Stack Sandbox", reviewRefresh: "Actualisation de la revue" },
} as const;

export const ASSESSMENT_WORDS = {
  en: { fiveModules: "five modules", scoredQuestions: "20 scored questions", fiveFollowUps: "five follow-ups" },
  es: { fiveModules: "cinco módulos", scoredQuestions: "20 preguntas puntuadas", fiveFollowUps: "cinco preguntas de seguimiento" },
  fr: { fiveModules: "cinq modules", scoredQuestions: "20 questions notées", fiveFollowUps: "cinq questions de suivi" },
} as const;

/** Module labels: lib/firmPillars.ts is the source; re-exported so one import serves. */
export { FIRM_PILLARS, PILLAR_BY_MODULE_KEY, PILLAR_BY_MODULE_TITLE, pillarForModule };
export type { FirmPillar };
export const MODULE_SHORT_LABELS = FIRM_PILLARS;
export const MODULE_LONG_LABELS = Object.keys(PILLAR_BY_MODULE_TITLE) as readonly string[];

/** The words the lexicon retires from customer copy (the retired-names guard reads this list). */
export const RETIRED_WORDS = ["consultant", "peer-validated", "pillar", "five part", "canonical", "blended", "Free", "Basic"] as const;
