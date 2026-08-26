import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getPatExplainerHero, getPatExplainerSections, getPatHomepageSummary } from "@/lib/patContent";
import { getPublicOnboardingConfig } from "@/lib/publicOnboarding";
import { getSelfSignupGoalQuestion, getSelfSignupRoleOptions } from "@/lib/selfSignupWizard";
import { loadVerticalPack } from "@/lib/verticals/loader";
import {
  ACCOUNTING_LEXICON,
  LEXICON_KEYS,
  assertCompleteLexicon,
  clearPrimedLexicons,
  lexicon,
  primeVerticalLexicon,
} from "@/lib/verticals/lexicon";
import { VERTICAL_PACKS_FLAG_ENV } from "@/lib/verticals/flag";

/**
 * W2 — THE flag-off proof (VERTICAL-READINESS-AUDIT-2026-08 §3.3).
 *
 * "The proof obligation is a test, not a promise: a contract test that renders
 * the guarded copy surfaces with the flag off and asserts the output equals the
 * current strings character for character."
 *
 * PRE_SEAM is a verbatim transcription of those strings as they existed at
 * commit 55954436, before `lexicon()` was introduced. It is a frozen artifact:
 * if a copy change is genuinely intended, the reviewer updates this block
 * deliberately and the diff shows exactly which customer-visible words moved.
 * Reassembling it from the lexicon would make the test tautological.
 */
const PRE_SEAM = {
  homepageEyebrow: "GUIDED INSIGHTS FOR THE ACCOUNTING ECOSYSTEM",
  homepageSummary:
    "PAT is guided intelligence for the accounting ecosystem. It turns structured product and operating signals into usable insight so vendors and firms can understand fit, friction, and next steps without losing context.",
  explainerHeroTitle: "Guided intelligence for the accounting ecosystem.",
  explainerHeroBody:
    "PAT is the intelligence layer for the accounting ecosystem. It helps firms understand operational alignment and helps vendors understand product alignment in the same system, starting with current-state clarity and extending into richer decision support only where the data can support it honestly.",
  explainerWhatPatIs:
    "Performance Alignment Technology is the intelligence layer for the accounting ecosystem. It gives firms an operating-alignment view and gives vendors a product-alignment view inside the same PAT system, so the signal stays connected instead of splitting into separate stories.",
  vendorRoleTitle: "I build software for accounting firms",
  vendorRoleBody: "Map product evidence to the accounting-firm market and see where your product aligns.",
  firmRoleTitle: "I run or work at an accounting firm",
  vendorGoalLabel: "Prove product–market fit with accounting firms",
  vendorOnboardingHeroBody:
    "Map your product evidence, complete the product assessment, then use PAT to understand where the product fits the accounting-firm market.",
} as const;

/** Every guarded surface, rendered through the seam, keyed to its pre-seam string. */
function renderGuardedSurfaces() {
  const homepage = getPatHomepageSummary();
  const hero = getPatExplainerHero();
  const sections = getPatExplainerSections();
  const roles = getSelfSignupRoleOptions();
  const vendorRole = roles.find((option) => option.role === "vendor")!;
  const firmRole = roles.find((option) => option.role === "firm")!;
  const vendorGoal = getSelfSignupGoalQuestion("vendor");

  return {
    homepageEyebrow: homepage.eyebrow,
    homepageSummary: homepage.summary,
    explainerHeroTitle: hero.title,
    explainerHeroBody: hero.body,
    explainerWhatPatIs: sections.find((section) => section.title === "What PAT is")!.body,
    vendorRoleTitle: vendorRole.title,
    vendorRoleBody: vendorRole.body,
    firmRoleTitle: firmRole.title,
    vendorGoalLabel: vendorGoal.options.find((option) => option.value === "prove-product-market-fit")!
      .label,
    vendorOnboardingHeroBody: getPublicOnboardingConfig("vendor").heroBody,
  };
}

const SURFACE_KEYS = Object.keys(PRE_SEAM) as Array<keyof typeof PRE_SEAM>;

describe("vertical lexicon — flag-off byte identity", () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    saved[VERTICAL_PACKS_FLAG_ENV] = process.env[VERTICAL_PACKS_FLAG_ENV];
    saved.PAT_DEFAULT_VERTICAL = process.env.PAT_DEFAULT_VERTICAL;
    delete process.env[VERTICAL_PACKS_FLAG_ENV];
    delete process.env.PAT_DEFAULT_VERTICAL;
    clearPrimedLexicons();
  });

  afterEach(() => {
    for (const [name, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    clearPrimedLexicons();
  });

  it.each(SURFACE_KEYS)("renders %s character-for-character as before the seam", (key) => {
    expect(renderGuardedSurfaces()[key]).toBe(PRE_SEAM[key]);
  });

  it("is identical with the flag explicitly set to 0 as with it unset", () => {
    const unset = renderGuardedSurfaces();
    process.env[VERTICAL_PACKS_FLAG_ENV] = "0";
    expect(renderGuardedSurfaces()).toEqual(unset);
  });

  it("ignores PAT_DEFAULT_VERTICAL entirely while the flag is off", () => {
    // The env override is step 3 of the resolution order, and the flag-off
    // short-circuit sits in front of the whole order. A stray env var on a
    // production box must not be able to reword the front door.
    process.env.PAT_DEFAULT_VERTICAL = "legal";
    expect(renderGuardedSurfaces()).toEqual(PRE_SEAM);
  });

  it("ignores a primed non-accounting pack lexicon while the flag is off", () => {
    primeVerticalLexicon("legal", {
      ecosystem: "legal ecosystem",
      firm: "law firm",
      firmArticle: "a",
      firmPlural: "law firms",
      firmMarket: "law-firm market",
      vendorAudience: "software for law firms",
    });
    process.env.PAT_DEFAULT_VERTICAL = "legal";
    expect(renderGuardedSurfaces()).toEqual(PRE_SEAM);
  });

  it("does not touch the filesystem to answer a flag-off lookup", () => {
    // The accounting values are an in-code frozen map, so a pack-loading bug
    // cannot reach a flag-off tenant (audit §3.3, first bullet).
    expect(Object.isFrozen(ACCOUNTING_LEXICON)).toBe(true);
    for (const key of LEXICON_KEYS) {
      expect(lexicon(key)).toBe(ACCOUNTING_LEXICON[key]);
    }
  });
});

describe("vertical lexicon — the accounting pack IS the current literals", () => {
  it("pins verticals/accounting/pack.yaml's lexicon block to ACCOUNTING_LEXICON", async () => {
    const pack = await loadVerticalPack("accounting");
    expect(pack.lexicon).toEqual({ ...ACCOUNTING_LEXICON });
  });

  it("declares no lexicon key the code does not know about", async () => {
    const pack = await loadVerticalPack("accounting");
    expect(Object.keys(pack.lexicon).sort()).toEqual([...LEXICON_KEYS].sort());
  });

  it("rejects a partial lexicon rather than falling back per key", () => {
    // A per-key fallback would render "accounting firms" inside otherwise-legal
    // copy, which reads as correct and is not.
    expect(() => assertCompleteLexicon("legal", { ecosystem: "legal ecosystem" })).toThrow(
      /missing: firm, firmArticle, firmPlural, firmMarket, vendorAudience/
    );
  });
});

describe("vertical lexicon — flag on", () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    saved[VERTICAL_PACKS_FLAG_ENV] = process.env[VERTICAL_PACKS_FLAG_ENV];
    saved.PAT_DEFAULT_VERTICAL = process.env.PAT_DEFAULT_VERTICAL;
    process.env[VERTICAL_PACKS_FLAG_ENV] = "1";
    delete process.env.PAT_DEFAULT_VERTICAL;
    clearPrimedLexicons();
  });

  afterEach(() => {
    for (const [name, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    clearPrimedLexicons();
  });

  it("still renders accounting identically when the tenant resolves to accounting", () => {
    expect(renderGuardedSurfaces()).toEqual(PRE_SEAM);
  });

  it("swaps the nouns and nothing else for a primed second vertical", () => {
    primeVerticalLexicon("legal", {
      ecosystem: "legal ecosystem",
      firm: "law firm",
      firmArticle: "a",
      firmPlural: "law firms",
      firmMarket: "law-firm market",
      vendorAudience: "software for law firms",
    });
    process.env.PAT_DEFAULT_VERTICAL = "legal";
    const legal = renderGuardedSurfaces();
    expect(legal.homepageEyebrow).toBe("GUIDED INSIGHTS FOR THE LEGAL ECOSYSTEM");
    expect(legal.firmRoleTitle).toBe("I run or work at a law firm");
    expect(legal.vendorGoalLabel).toBe("Prove product–market fit with law firms");
    // Structure is untouched: only the nouns differ from the accounting render.
    expect(legal.homepageSummary.replace("legal ecosystem", "accounting ecosystem")).toBe(
      PRE_SEAM.homepageSummary
    );
  });

  it("refuses to render an unprimed non-accounting vertical", () => {
    process.env.PAT_DEFAULT_VERTICAL = "healthcare";
    expect(() => renderGuardedSurfaces()).toThrow(/never primed/i);
  });
});
