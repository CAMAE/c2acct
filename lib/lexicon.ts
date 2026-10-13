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

/**
 * Quartile in words, never "Q1" to "Q4" alone. The quartile follows
 * lib/eliteInsightsV2.quartileOf, derived from the percentile the card shows:
 * 4 = top quartile (75th percentile and up), 3 = upper middle, 2 = lower middle,
 * 1 = bottom quartile. enforce-core (R62, walk V-new): the map used to run the
 * other way, so "13th of 13" read "top quartile".
 */
export function quartileWord(quartile: 1 | 2 | 3 | 4, locale: Locale = "en"): string {
  const words = BENCHMARK_WORDS[locale];
  return quartile === 4 ? words.topQuartile : quartile === 3 ? words.upperMiddle : quartile === 2 ? words.lowerMiddle : words.bottomQuartile;
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

/**
 * legal-load (R64, delta 8): the reader words a channel's firms use for the things the
 * shared structure names. Accounting's are the words the surfaces print today; legal's
 * are the firm pack's nouns. A surface that needs a channel noun reads it here by the
 * tenant's vertical, never from a per-vertical copy of the sentence. "Guide" is not a
 * channel word and stays with lib/roleWords (R17 flag law).
 */
export const VERTICAL_READER_WORDS = {
  accounting: {
    en: { engagement: "engagement", engagementLetter: "engagement letter", workItem: "return", deadlineSystem: "due-date tracking", clientFunds: "client funds", conflicts: "independence check", responsiblePerson: "engagement partner", team: "service line" },
    es: { engagement: "encargo", engagementLetter: "carta de encargo", workItem: "declaración", deadlineSystem: "seguimiento de plazos", clientFunds: "fondos del cliente", conflicts: "verificación de independencia", responsiblePerson: "socio del encargo", team: "línea de servicio" },
    fr: { engagement: "mission", engagementLetter: "lettre de mission", workItem: "déclaration", deadlineSystem: "suivi des échéances", clientFunds: "fonds du client", conflicts: "vérification d’indépendance", responsiblePerson: "associé responsable", team: "ligne de service" },
  },
  legal: {
    en: { engagement: "matter", engagementLetter: "engagement letter", workItem: "matter", deadlineSystem: "docketing", clientFunds: "trust account", conflicts: "conflicts", responsiblePerson: "responsible attorney", team: "practice group" },
    es: { engagement: "asunto", engagementLetter: "carta de encargo", workItem: "asunto", deadlineSystem: "control de plazos procesales", clientFunds: "cuenta fiduciaria", conflicts: "conflictos", responsiblePerson: "abogado responsable", team: "grupo de práctica" },
    fr: { engagement: "dossier", engagementLetter: "lettre de mission", workItem: "dossier", deadlineSystem: "suivi des échéances judiciaires", clientFunds: "compte fiduciaire", conflicts: "conflits", responsiblePerson: "avocat responsable", team: "groupe de pratique" },
  },
} as const;

export type VerticalReaderWordKey = keyof (typeof VERTICAL_READER_WORDS)["legal"]["en"];
type VerticalReaderWordTable = Readonly<Record<Locale, Readonly<Record<VerticalReaderWordKey, string>>>>;

/** One channel noun for a reader, by the tenant's vertical; an unknown vertical reads accounting's word. */
export function verticalReaderWord(verticalId: string, key: VerticalReaderWordKey, locale: Locale = "en"): string {
  const tables: Readonly<Record<string, VerticalReaderWordTable>> = VERTICAL_READER_WORDS;
  const table = tables[verticalId] ?? VERTICAL_READER_WORDS.accounting;
  return table[locale][key];
}

/** The words the lexicon retires from customer copy (the retired-names guard reads this list). */
/**
 * box-c (R65, item 2): the two grammar helpers for a number inside prose.
 * formatPoints(1) → "1 pt", formatPoints(8) → "8 pts", formatPoints(6.8) → "6.8 pts",
 * one decimal at most, trailing zero dropped (the hub's "6.8 pt" is the model).
 */
export function formatPointsValue(n: number): string {
  const rounded = Math.round(Math.abs(n) * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}
export function formatPoints(n: number): string {
  const value = formatPointsValue(n);
  return `${value} ${value === "1" ? "pt" : "pts"}`;
}
/** "a" or "an" for the number as it is read aloud: 8, 11, 18, 80 to 89, 800 to 899 take "an". */
export function articleFor(n: number | string, capitalize = false): string {
  const text = String(n).replace(/^[-+−]/, "");
  const integer = text.split(/[.,]/)[0] ?? "";
  const an = integer.startsWith("8") || integer === "11" || integer === "18";
  const article = an ? "an" : "a";
  return capitalize ? article.charAt(0).toUpperCase() + article.slice(1) : article;
}

export const RETIRED_WORDS = ["consultant", "peer-validated", "pillar", "five part", "canonical", "blended", "Free", "Basic"] as const;
