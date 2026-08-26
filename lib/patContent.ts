import { lexicon } from "@/lib/verticals/lexicon";

/**
 * Front-door copy. The industry nouns come from the resolved vertical's lexicon
 * (class d, VERTICAL-READINESS-AUDIT-2026-08 §2); the sentences, punctuation and
 * casing stay here. With PAT_ENABLE_VERTICAL_PACKS off, `lexicon()` returns the
 * accounting literals with no pack load, so these render exactly as they did
 * before the seam existed — asserted character-for-character by
 * tests/vertical-lexicon-byte-identity.contract.test.ts.
 *
 * These are getters rather than module-scope consts on purpose: a const would
 * freeze the lexicon at import time, which is correct flag-off and wrong the
 * moment a request resolves to a different vertical.
 */
export function getPatHomepageSummary() {
  return {
    title: "WELCOME",
    eyebrow: `GUIDED INSIGHTS FOR THE ${lexicon("ecosystem").toUpperCase()}`,
    summary:
      `PAT is guided intelligence for the ${lexicon("ecosystem")}. It turns structured product and operating signals into usable insight so vendors and firms can understand fit, friction, and next steps without losing context.`,
  };
}

export function getPatExplainerHero() {
  return {
    eyebrow: "PAT",
    title: `Guided intelligence for the ${lexicon("ecosystem")}.`,
    body:
      `PAT is the intelligence layer for the ${lexicon("ecosystem")}. It helps firms understand operational alignment and helps vendors understand product alignment in the same system, starting with current-state clarity and extending into richer decision support only where the data can support it honestly.`,
  };
}

export function getPatExplainerSections() {
  return [
    {
      title: "What PAT is",
      body:
        `Performance Alignment Technology is the intelligence layer for the ${lexicon("ecosystem")}. It gives firms an operating-alignment view and gives vendors a product-alignment view inside the same PAT system, so the signal stays connected instead of splitting into separate stories.`,
    },
    {
      title: "How PAT works",
      body:
        "PAT starts with structured answers, product signal, and operating signal. It normalizes those inputs, applies the current rules and scoring logic, and turns them into insight that can be used without losing context.",
    },
    {
      title: "Why alignment matters",
      body:
        "Alignment matters because firms adopt products, not abstract company labels. The assessment is only the intake mechanism. The real value is the intelligence layer that follows: PAT makes operating alignment, product alignment, and next-step decision support visible in one system.",
    },
    {
      title: "Pro membership",
      body:
        "Pro membership converts structured answers into normalized scores, badges, unlocked insights, and current-state clarity. It is designed to show what is true now, where fit is visible, where friction is visible, and what the current signal can support with confidence.",
    },
    {
      title: "Elite membership",
      body:
        "Elite membership extends PAT into prediction, simulation, recommendation, self-versus-market comparison, and richer product decision support. That layer matters, but it should unlock only when the model, benchmark depth, and supporting data are strong enough to justify it.",
    },
  ];
}
