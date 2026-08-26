import { resolveCurrentVertical, type ResolveVerticalOptions } from "./context";
import { isVerticalPacksEnabled } from "./flag";

/**
 * Display-layer lexicon — class (d) of VERTICAL-READINESS-AUDIT-2026-08 §2:
 * "same structure, different words".
 *
 * The seam is introduced by replacing a literal like `"accounting ecosystem"`
 * with `lexicon("ecosystem")`, where the accounting pack's value *is that
 * string*. Nothing about sentence structure, punctuation or casing moves into a
 * pack: a pack supplies the industry nouns, the surface keeps its own prose.
 *
 * Two rules make flag-off safe rather than merely intended:
 *
 *   1. Flag off short-circuits to {@link ACCOUNTING_LEXICON}, a frozen in-code
 *      map, with no pack load and no filesystem access.
 *   2. `ACCOUNTING_LEXICON` is pinned to `verticals/accounting/pack.yaml`'s
 *      `lexicon:` block by a contract test, so the in-code copy and the pack can
 *      never drift apart.
 *
 * Both are proved by `tests/vertical-lexicon-byte-identity.contract.test.ts`,
 * which reassembles every guarded surface flag-off and compares it
 * character-for-character with the strings that shipped before the seam existed.
 */
export const LEXICON_KEYS = [
  /** The market as a whole, lowercase: "accounting ecosystem". */
  "ecosystem",
  /** One customer firm, singular, lowercase: "accounting firm". */
  "firm",
  /** The indefinite article `firm` takes — English does not derive this. */
  "firmArticle",
  /** Customer firms, plural, lowercase: "accounting firms". */
  "firmPlural",
  /** The buy-side market, attributive: "accounting-firm market". */
  "firmMarket",
  /** What a vendor in this vertical builds: "software for accounting firms". */
  "vendorAudience",
] as const;

export type LexiconKey = (typeof LEXICON_KEYS)[number];

export type VerticalLexicon = Readonly<Record<LexiconKey, string>>;

/**
 * Accounting's values ARE the literal strings that were in the code before this
 * seam existed. Do not "improve" them here — a wording change is a copy change
 * and belongs in a copy review, not in a framework file.
 */
export const ACCOUNTING_LEXICON: VerticalLexicon = Object.freeze({
  ecosystem: "accounting ecosystem",
  firm: "accounting firm",
  firmArticle: "an",
  firmPlural: "accounting firms",
  firmMarket: "accounting-firm market",
  vendorAudience: "software for accounting firms",
});

const primed = new Map<string, VerticalLexicon>();

/** Every key present and non-blank, or a loud error naming what is missing. */
export function assertCompleteLexicon(
  verticalId: string,
  values: Partial<Record<string, unknown>>
): VerticalLexicon {
  const resolved: Record<string, string> = {};
  const missing: string[] = [];

  for (const key of LEXICON_KEYS) {
    const value = values[key];
    if (typeof value !== "string" || value.trim().length === 0) {
      missing.push(key);
      continue;
    }
    resolved[key] = value;
  }

  if (missing.length > 0) {
    throw new Error(
      `Vertical Pack "${verticalId}" lexicon is missing: ${missing.join(", ")}. ` +
        "A partial lexicon would render another vertical's nouns on this vertical's surfaces."
    );
  }

  return Object.freeze(resolved as Record<LexiconKey, string>);
}

/**
 * Make a pack's lexicon available to the synchronous {@link lexicon} lookup.
 *
 * `lexicon()` has to be a drop-in for a string literal, so it cannot be async
 * and cannot read the filesystem in a render path. Pack loading stays async and
 * happens at a request/job boundary; this is where its result is handed over.
 */
export function primeVerticalLexicon(
  verticalId: string,
  values: Partial<Record<string, unknown>>
): VerticalLexicon {
  const complete = assertCompleteLexicon(verticalId, values);
  primed.set(verticalId, complete);
  return complete;
}

/** Test/teardown helper — drops every primed pack lexicon. */
export function clearPrimedLexicons(): void {
  primed.clear();
}

export function getPrimedLexicon(verticalId: string): VerticalLexicon | null {
  return primed.get(verticalId) ?? null;
}

/** The whole map for one vertical, resolved under the same rules as {@link lexicon}. */
export function resolveLexicon(options: ResolveVerticalOptions = {}): VerticalLexicon {
  // Flag off: the in-code literals, before any pack load. See ./flag.ts.
  if (!isVerticalPacksEnabled(options.env ?? process.env)) {
    return ACCOUNTING_LEXICON;
  }

  const verticalId = resolveCurrentVertical(options);
  const packLexicon = primed.get(verticalId);
  if (packLexicon) {
    return packLexicon;
  }

  // Accounting's lexicon is in-code truth, so an unprimed accounting request is
  // still correct. Any other vertical is not: falling back would silently print
  // accounting nouns on, say, a legal surface. Fail loudly instead.
  if (verticalId === "accounting") {
    return ACCOUNTING_LEXICON;
  }
  throw new Error(
    `Vertical "${verticalId}" lexicon was never primed. Call primeVerticalLexicon() ` +
      "with the pack's lexicon at the request boundary before rendering its surfaces."
  );
}

/** Look up one display-layer term for the current vertical. */
export function lexicon(key: LexiconKey, options: ResolveVerticalOptions = {}): string {
  return resolveLexicon(options)[key];
}
