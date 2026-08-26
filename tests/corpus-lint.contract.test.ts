import { describe, expect, it } from "vitest";
import {
  DEFAULT_COMPETITOR_NAMES,
  NEAR_DUPLICATE_THRESHOLD,
  competitorNames,
  jaccard,
  lintBannedConstructs,
  lintCorpus,
  lintNearDuplicates,
  shingles,
  toSentences,
  type LintableArticle,
} from "@/lib/corpus/importLint";
import { HELP_ARTICLES, lintHelpArticles } from "@/scripts/index-help";

/**
 * Corpus import lint (corpus program (d)).
 *
 * The corpus is the one place Pat is allowed to speak from: anything indexed
 * here is something the assistant will state to a customer as fact, in our
 * voice, with a citation. So the lint is not style enforcement — it is the list
 * of claims we refuse to have repeated back to a firm by an AI carrying our name.
 */

const article = (body: string, path = "help/test/a.md", title = "Test article"): LintableArticle => ({
  path,
  title,
  body,
});

const rules = (body: string) => lintBannedConstructs(article(body)).map((v) => v.rule);

describe("outcome promises vs mechanism statements", () => {
  it("FLAGS an outcome promise", () => {
    // The worked example from the ruling.
    expect(rules("We guarantee results for every firm that completes the assessment.")).toContain(
      "outcome-promise"
    );
  });

  it("ALLOWS a mechanism statement using the same verb", () => {
    // The other worked example. A blanket ban on "guarantee" would be unusable:
    // the honest half of the story needs that word.
    expect(rules("Deterministic arithmetic guarantees repeatability across runs.")).not.toContain(
      "outcome-promise"
    );
  });

  it("flags the promise verbs in our own voice", () => {
    for (const body of [
      "Patalign guarantees more clients.",
      "We promise revenue growth.",
      "Pat ensures success for your firm.",
    ]) {
      expect(rules(body)).toContain("outcome-promise");
    }
  });

  it("allows the mechanism family", () => {
    for (const body of [
      "The computation guarantees the same answer for the same inputs.",
      "Hashing guarantees idempotence when the importer re-runs.",
      "A unique constraint ensures consistency of the stored row.",
      "Scoring is deterministic, which guarantees byte-identical output.",
    ]) {
      expect(rules(body)).not.toContain("outcome-promise");
    }
  });

  it("does NOT let a mechanism sentence launder a promise elsewhere in the article", () => {
    // Evaluation is per sentence precisely so this cannot happen.
    const body =
      "Deterministic arithmetic guarantees repeatability. We also guarantee results for your firm.";
    expect(rules(body)).toContain("outcome-promise");
  });

  it("ALLOWS a disclaimer that denies a promise", () => {
    // The strongest sentence in the shipping corpus is a disclaimer. A lint that
    // punishes the hedge while the promise goes unwritten teaches authors to
    // delete their hedges — the opposite of the intent.
    for (const body of [
      "It is directional, not a guaranteed outcome.",
      "Patalign does not guarantee results.",
      "This is a directional signal and never a promise of revenue.",
    ]) {
      expect(rules(body)).not.toContain("outcome-promise");
    }
  });
});

describe("financial claims, prices, competitors, roadmap tone, AI marketing", () => {
  it("flags ROI and financial-return claims", () => {
    expect(rules("Firms see ROI within one quarter.")).toContain("financial-claim");
    expect(rules("This will increase revenue for your practice.")).toContain("financial-claim");
  });

  it("allows denying a financial claim", () => {
    expect(rules("Patalign does not compute ROI and makes no return on investment claim.")).not.toContain(
      "financial-claim"
    );
  });

  it("flags prices, and a negation does NOT clear a price", () => {
    expect(rules("Elite membership is $99 per month.")).toContain("price");
    // "it does not cost $99" still states a price.
    expect(rules("It does not cost $99.")).toContain("price");
  });

  it("flags competitor names, and a negation does NOT clear one", () => {
    expect(rules("Unlike QuickBooks, Patalign measures alignment.")).toContain("competitor-name");
    // "we are not X" still puts a competitor's name in Pat's mouth.
    expect(rules("We are not Xero.")).toContain("competitor-name");
  });

  it("extends the competitor list from the environment", () => {
    const env = { PAT_CORPUS_BANNED_NAMES: "AcmeLedger, Beta Books" };
    expect(competitorNames(env)).toContain("acmeledger");
    expect(competitorNames(env)).toContain("beta books");
    expect(
      lintBannedConstructs(article("AcmeLedger is a competitor."), env).map((v) => v.rule)
    ).toContain("competitor-name");
    // Without the env extension the same sentence is clean, so the default list
    // is genuinely what is being extended rather than a coincidence.
    expect(rules("AcmeLedger is a competitor.")).not.toContain("competitor-name");
  });

  it("keeps a non-empty default competitor list", () => {
    expect(DEFAULT_COMPETITOR_NAMES.length).toBeGreaterThan(0);
  });

  it("flags roadmap tone and AI-marketing vocabulary", () => {
    expect(rules("This feature is coming soon.")).toContain("roadmap-tone");
    expect(rules("Our AI-powered engine is revolutionary.")).toContain("ai-marketing");
  });

  it("passes ordinary, honest product copy untouched", () => {
    expect(
      rules(
        "The Alignment Board lays your current product stack out as pieces, each carrying its live alignment score. Swap a piece for a candidate and your projected firm alignment recomputes, with a confidence band when the sample is thin."
      )
    ).toEqual([]);
  });
});

describe("near-duplicate gate", () => {
  const base =
    "The BattleCard ranks the firms in your ecosystem by how well your product fits them, using firm-reviewed evidence where it exists. Alignment delta is the core metric.";

  it("flags a copy-paste-and-edit duplicate", () => {
    const pairs = lintNearDuplicates([
      article(base, "help/a.md"),
      article(`${base} It also shows the ranking.`, "help/b.md"),
    ]);
    expect(pairs).toHaveLength(1);
    expect(pairs[0]!.similarity).toBeGreaterThanOrEqual(NEAR_DUPLICATE_THRESHOLD);
  });

  it("does NOT flag two independently written articles on related topics", () => {
    expect(
      lintNearDuplicates([
        article(base, "help/a.md"),
        article(
          "Benchmark comparison shows how your products compare to an anonymized platform aggregate of firm reviews, with the contributing firm count. Cuts below the minimum-n safe harbor are withheld.",
          "help/b.md"
        ),
      ])
    ).toEqual([]);
  });

  it("treats identical text as identical however short", () => {
    expect(jaccard(shingles("alpha beta"), shingles("alpha beta"))).toBe(1);
    expect(lintNearDuplicates([article("same words here", "a.md"), article("same words here", "b.md")])).toHaveLength(1);
  });

  it("compares each pair once", () => {
    const same = "identical body text for every article in this set";
    const pairs = lintNearDuplicates([
      article(same, "a.md"),
      article(same, "b.md"),
      article(same, "c.md"),
    ]);
    // 3 choose 2, not 3 squared.
    expect(pairs).toHaveLength(3);
  });

  it("splits sentences on terminators and newlines", () => {
    expect(toSentences("One. Two!\nThree?")).toEqual(["One.", "Two!", "Three?"]);
  });
});

describe("the shipping corpus passes its own gate", () => {
  it("is clean today", () => {
    // The lint ships enabled at the import boundary, so the corpus that exists
    // must satisfy it — otherwise the next seed run fails.
    const report = lintHelpArticles();
    expect({ violations: report.violations, duplicates: report.duplicates }).toEqual({
      violations: [],
      duplicates: [],
    });
    expect(report.ok).toBe(true);
  });

  it("checks a non-trivial corpus (the gate is not vacuously passing)", () => {
    expect(HELP_ARTICLES.length).toBeGreaterThan(20);
  });

  it("would reject the corpus if one banned article were added", () => {
    const withOffender = [
      ...HELP_ARTICLES.map(({ path, title, body }) => ({ path, title, body })),
      article("We guarantee results and ROI within one quarter.", "help/bad/offender.md"),
    ];
    expect(lintCorpus(withOffender).ok).toBe(false);
  });
});
