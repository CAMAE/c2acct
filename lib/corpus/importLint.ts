/**
 * Corpus import lint (corpus program (d)).
 *
 * The corpus is the one place Pat is allowed to speak from. Anything indexed
 * here becomes something the assistant will state to a customer as fact, with a
 * citation, in Patalign's voice. So the bar for entry is not "is it true" but
 * "is it the kind of claim we are willing to have repeated back to a firm by an
 * AI carrying our name".
 *
 * Two independent gates, both pure and both offline:
 *
 *   1. BANNED CONSTRUCTS — outcome promises, ROI/financial claims, prices,
 *      competitor names, roadmap tone, and AI-marketing vocabulary.
 *   2. NEAR-DUPLICATES — two articles saying nearly the same thing SPLIT the
 *      retrieval rank between them, so a question that should surface one strong
 *      answer surfaces two weak halves. Duplication degrades retrieval quietly.
 *
 * ## The distinction that makes rule 1 usable
 *
 * A blanket ban on "guarantee" would be unusable, because the honest half of
 * Patalign's story NEEDS that word: the scoring really is deterministic
 * arithmetic, and saying so is the opposite of a marketing promise.
 *
 * So the rule is not lexical, it is about WHAT IS BEING PROMISED:
 *
 *   - An OUTCOME PROMISE claims a result for the customer — that they will earn,
 *     save, win, improve, or succeed. Flagged.
 *   - A MECHANISM STATEMENT describes a property of the system — that a
 *     computation is repeatable, deterministic, idempotent. Allowed.
 *
 * The two worked examples are encoded directly as tests:
 *   FLAG  "we guarantee results"
 *   ALLOW "deterministic arithmetic guarantees repeatability"
 *
 * Evaluation is per SENTENCE, so a mechanism exemption cannot launder an outcome
 * promise sitting elsewhere in the same paragraph.
 */

export type CorpusLintSeverity = "error";

export type CorpusLintViolation = {
  /** Stable rule id, for the report and for future suppression. */
  rule: string;
  severity: CorpusLintSeverity;
  path: string;
  /** The sentence that tripped the rule. */
  excerpt: string;
  reason: string;
};

/**
 * Sentences whose guarantee/ensure is about a SYSTEM PROPERTY rather than a
 * customer outcome. Checked first; a match exempts the sentence from the
 * outcome-promise rule only.
 */
const MECHANISM_EXEMPTIONS: RegExp[] = [
  /\b(deterministic|determinism|arithmetic|computation|calculation|the math|hashing|idempoten\w+|schema|constraint|migration|index)\b[^.!?]{0,60}\b(guarantee|guarantees|ensure|ensures)\b/i,
  /\b(guarantee|guarantees|ensure|ensures)\b[^.!?]{0,60}\b(repeatab\w+|reproducib\w+|determinis\w+|idempoten\w+|consistency|the same (answer|result|output)|byte-identical)\b/i,
  /**
   * "By <doing X>, PAT ensures <property>" — the mechanism is stated in the
   * sentence's own leading clause.
   *
   * Added when the B1 corpus tripped this rule three times on sentences that
   * are the OPPOSITE of marketing: "By keeping every contributor's share at a
   * quarter or less, PAT ensures a published benchmark reflects a genuine
   * plurality." That is the suppression rule explaining itself. The original
   * our-voice branch fired on "PAT ensures" alone, with no regard for what was
   * being ensured, so it could not tell a promise from an explanation.
   *
   * The object still matters: this exempts the SHAPE, and the outcome-noun
   * branch below continues to fire independently, so "By working hard, PAT
   * ensures more revenue" is still caught on "revenue".
   */
  /\bby\s+\w+ing\b[^.!?]{0,140},\s*(pat|patalign|we)\s+(ensure|ensures|guarantee|guarantees)\b/i,
];

/**
 * Sentences that DENY a claim rather than make one.
 *
 * "It is directional, not a guaranteed outcome" is the strongest sentence in the
 * shipping corpus — a disclaimer doing exactly the job this lint exists to
 * enforce — and the first draft of the outcome-promise rule flagged it. A lint
 * that punishes the disclaimer while the promise it disclaims goes unwritten
 * teaches authors to delete their hedges, which is the precise opposite of the
 * intent.
 *
 * So a negated claim is exempt from the CLAIM rules. It is deliberately NOT
 * exempt from the price or competitor-name rules: "we are not QuickBooks" still
 * puts a competitor's name in Pat's mouth, and "it does not cost $99" still
 * states a price.
 */
const NEGATION_EXEMPTIONS: RegExp[] = [
  /\b(not|never|no|nothing|without|rather than|instead of|cannot|can't|doesn't|does not|don't|do not|isn't|is not|aren't|are not)\b[^.!?]{0,40}\b(guarantee\w*|promise\w*|ensure\w*|roi|return on investment|results?|outcomes?)\b/i,
  /**
   * The denial trailing its verb: "promises nothing about outcomes",
   * "guarantees no particular result". The first pattern above scans FORWARD
   * from the negation and missed this by four characters, which is the kind of
   * margin that should not decide whether a disclaimer counts as a promise.
   */
  /\b(guarantee\w*|promise\w*|ensure\w*|roi|return on investment)\b[^.!?]{0,40}\b(is not|are not|isn't|aren't|never|nothing|no particular|none)\b/i,
];

type RuleExemption = "mechanism" | "negation";

type BannedRule = {
  rule: string;
  pattern: RegExp;
  reason: string;
  /** Which exemptions may clear a match of this rule. */
  exemptions?: RuleExemption[];
};

const BANNED_RULES: BannedRule[] = [
  /**
   * The outcome-promise rule is TWO rules, split by what triggers them, because
   * they need different exemptions.
   *
   * The voice branch fires on "we/PAT guarantee…" regardless of object, so it
   * must be exemptible by a mechanism clause — otherwise every sentence
   * explaining how the instrument works reads as marketing.
   *
   * The object branch fires on a promise verb near an OUTCOME NOUN, and must
   * NOT be exemptible by mechanism. A single combined rule was tried first and
   * immediately let "By working hard, PAT ensures more revenue" through: the
   * mechanism clause cleared the whole rule, laundering the outcome. A gate you
   * can defeat by prefixing "By ..." to the sentence is not a gate.
   */
  {
    rule: "outcome-promise",
    pattern: /\b(we|patalign|pat)\s+(guarantee|guarantees|promise|promises|ensure|ensures)\b/i,
    reason:
      "Outcome promise in Patalign's own voice. Patalign measures and reports; it does not promise a customer result. State the mechanism instead.",
    exemptions: ["mechanism", "negation"],
  },
  {
    rule: "outcome-promise",
    pattern:
      /\b(guarantee|guarantees|guaranteed|promise|promises|ensures?)\b[^.!?]{0,40}\b(results?|success|outcomes?|savings?|revenue|growth|roi|return on investment|more (clients|customers|deals)|wins?)\b/i,
    reason:
      "Promise attached to a customer outcome. The corpus has no evidence for a customer's result, so Pat must never assert one — no mechanism clause makes an outcome promise acceptable.",
    exemptions: ["negation"],
  },
  {
    rule: "financial-claim",
    pattern:
      /\b(roi|return on investment|payback period|increase revenue|boost revenue|save \$|cut costs by|\d+\s?%\s?(more|increase|growth|savings|revenue))\b/i,
    reason:
      "Financial-return claim. The corpus has no evidence for a customer's financial outcome, so Pat must never assert one.",
    exemptions: ["negation"],
  },
  {
    rule: "price",
    pattern:
      /(\$\s?\d[\d,]*(\.\d+)?)|\b\d+\s?(usd|dollars)\b|\b(per (month|year|seat|user)|monthly (price|fee)|annual (price|fee)|pricing (is|starts))\b/i,
    reason:
      "Price in the corpus. Prices change independently of documentation, and a stale price stated by Pat is a quote we did not mean to give. Link to the membership page instead.",
  },
  {
    rule: "roadmap-tone",
    pattern: /\b(coming soon|launching soon|in the near future|will soon|shortly we will)\b/i,
    reason:
      "Roadmap tone. A corpus answer outlives the roadmap; describe what exists today (Block-19 copy rider).",
  },
  {
    rule: "ai-marketing",
    pattern:
      /\b(ai[- ]powered|powered by ai|ai[- ]driven|next[- ]gen(eration)?|cutting[- ]edge|revolutionary|game[- ]chang\w+)\b/i,
    reason:
      "AI-marketing vocabulary. Describe what the feature does, not what category of technology it belongs to.",
  },
];

/**
 * Competitor names, denied by default and env-extensible.
 *
 * Deliberately a small explicit list rather than a clever heuristic: the point is
 * that Pat never characterizes a named competitor to a customer, and a heuristic
 * that occasionally misses is worse than a list someone extends on purpose.
 * Extend with PAT_CORPUS_BANNED_NAMES (comma-separated).
 *
 * Banned in the HELP CORPUS only — the vendor taxonomy legitimately contains
 * real product names, which is a different surface with a different purpose.
 */
export const DEFAULT_COMPETITOR_NAMES = [
  "quickbooks",
  "xero",
  "sage intacct",
  "netsuite",
  "freshbooks",
  "wave accounting",
  "zoho books",
] as const;

/**
 * The environment this lint reads, and nothing else. Narrower than
 * `NodeJS.ProcessEnv` on purpose: a test injecting an environment should be able
 * to write `{ PAT_CORPUS_BANNED_NAMES: "..." }` without also having to satisfy
 * `NODE_ENV` and the rest of the ambient declaration. (Same reasoning as
 * VerticalEnv in lib/verticals/flag.ts.)
 */
export type CorpusLintEnv = Record<string, string | undefined>;

export function competitorNames(env: CorpusLintEnv = process.env): string[] {
  const extra = (env.PAT_CORPUS_BANNED_NAMES ?? "")
    .split(",")
    .map((name) => name.trim().toLowerCase())
    .filter(Boolean);
  return [...DEFAULT_COMPETITOR_NAMES, ...extra];
}

/** Split into sentences. Crude on purpose — the unit only has to bound context. */
export function toSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function isMechanismStatement(sentence: string): boolean {
  return MECHANISM_EXEMPTIONS.some((pattern) => pattern.test(sentence));
}

function isNegatedClaim(sentence: string): boolean {
  return NEGATION_EXEMPTIONS.some((pattern) => pattern.test(sentence));
}

export type LintableArticle = { path: string; title: string; body: string };

/** Rule 1 — banned constructs, evaluated per sentence. */
export function lintBannedConstructs(
  article: LintableArticle,
  env: CorpusLintEnv = process.env
): CorpusLintViolation[] {
  const violations: CorpusLintViolation[] = [];
  const sentences = toSentences(`${article.title}. ${article.body}`);
  const names = competitorNames(env);

  for (const sentence of sentences) {
    const exempt: Record<RuleExemption, boolean> = {
      mechanism: isMechanismStatement(sentence),
      negation: isNegatedClaim(sentence),
    };

    for (const rule of BANNED_RULES) {
      if (!rule.pattern.test(sentence)) continue;
      // Exemptions are per RULE, not global: a mechanism statement or a
      // disclaimer clears a claim rule, but neither clears a price or a
      // competitor name.
      if (rule.exemptions?.some((exemption) => exempt[exemption])) continue;
      violations.push({
        rule: rule.rule,
        severity: "error",
        path: article.path,
        excerpt: sentence,
        reason: rule.reason,
      });
    }

    const lowered = sentence.toLowerCase();
    for (const name of names) {
      if (lowered.includes(name)) {
        violations.push({
          rule: "competitor-name",
          severity: "error",
          path: article.path,
          excerpt: sentence,
          reason: `Names a competitor ("${name}"). Pat must not characterize a named competitor to a customer.`,
        });
      }
    }
  }

  return violations;
}

// --- Rule 2: near-duplicate detection ---------------------------------------

/** Word shingles (3-grams) of the normalized text — the unit of similarity. */
export function shingles(text: string, size = 3): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i + size <= words.length; i += 1) {
    out.add(words.slice(i, i + size).join(" "));
  }
  // Text shorter than one shingle is represented by itself, so two identical
  // short articles still compare as identical rather than as two empty sets.
  if (out.size === 0 && words.length > 0) {
    out.add(words.join(" "));
  }
  return out;
}

/** Jaccard similarity: |A∩B| / |A∪B|. */
export function jaccard(left: Set<string>, right: Set<string>): number {
  if (left.size === 0 && right.size === 0) return 1;
  let intersection = 0;
  for (const entry of left) {
    if (right.has(entry)) intersection += 1;
  }
  const union = left.size + right.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/**
 * The similarity above which two articles are near-duplicates.
 *
 * 0.6 on word trigrams is a high bar in practice — independently written
 * articles on related topics land well below it, because trigram overlap decays
 * fast once wording differs. Tuned to catch copy-paste-and-edit, not topic
 * overlap.
 */
export const NEAR_DUPLICATE_THRESHOLD = Number(
  process.env.PAT_CORPUS_DUPLICATE_THRESHOLD ?? 0.6
);

export type DuplicatePair = {
  rule: "near-duplicate";
  severity: CorpusLintSeverity;
  path: string;
  otherPath: string;
  similarity: number;
  reason: string;
};

/**
 * Rule 2 — every pair compared once.
 *
 * Duplication in a retrieval corpus is not merely untidy: two articles saying
 * nearly the same thing split the lexical rank between them, so a question that
 * should surface one strong answer surfaces two weak halves and may fall below
 * the cut entirely. The failure is silent — retrieval returns something, just
 * the wrong something.
 */
export function lintNearDuplicates(
  articles: readonly LintableArticle[],
  threshold = NEAR_DUPLICATE_THRESHOLD
): DuplicatePair[] {
  const prepared = articles.map((article) => ({
    path: article.path,
    grams: shingles(`${article.title} ${article.body}`),
  }));

  const pairs: DuplicatePair[] = [];
  for (let i = 0; i < prepared.length; i += 1) {
    for (let j = i + 1; j < prepared.length; j += 1) {
      const similarity = jaccard(prepared[i]!.grams, prepared[j]!.grams);
      if (similarity >= threshold) {
        pairs.push({
          rule: "near-duplicate",
          severity: "error",
          path: prepared[i]!.path,
          otherPath: prepared[j]!.path,
          similarity: Math.round(similarity * 1000) / 1000,
          reason:
            "Near-duplicate of another article. Two articles saying the same thing split the retrieval rank between them, so neither ranks where one would.",
        });
      }
    }
  }
  return pairs;
}

export type CorpusLintReport = {
  ok: boolean;
  violations: CorpusLintViolation[];
  duplicates: DuplicatePair[];
};

/** Both gates over a whole corpus. */
export function lintCorpus(
  articles: readonly LintableArticle[],
  env: CorpusLintEnv = process.env
): CorpusLintReport {
  const violations = articles.flatMap((article) => lintBannedConstructs(article, env));
  const duplicates = lintNearDuplicates(articles);
  return { ok: violations.length === 0 && duplicates.length === 0, violations, duplicates };
}

/** Human-readable report for the importer's output. */
export function formatCorpusLintReport(report: CorpusLintReport): string {
  if (report.ok) return "corpus lint: clean";
  const lines: string[] = ["corpus lint FAILED"];
  for (const violation of report.violations) {
    lines.push(`  [${violation.rule}] ${violation.path}`);
    lines.push(`      ${violation.excerpt}`);
    lines.push(`      → ${violation.reason}`);
  }
  for (const duplicate of report.duplicates) {
    lines.push(
      `  [near-duplicate] ${duplicate.path} ≈ ${duplicate.otherPath} (similarity ${duplicate.similarity})`
    );
    lines.push(`      → ${duplicate.reason}`);
  }
  return lines.join("\n");
}
