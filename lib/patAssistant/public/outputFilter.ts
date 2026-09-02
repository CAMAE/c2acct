/**
 * Output filtering for PUBLIC answers (BOX 2).
 *
 * The public tier answers unauthenticated strangers in Patalign's voice, from a
 * corpus it does not control the phrasing of at generation time. Three things
 * must never leave through it, and each is REFUSED rather than scrubbed:
 *
 *   - an email address — a scrubbed answer that still reads fluently hides the
 *     fact that something tried to emit one, and the interesting event is the
 *     attempt, not the string;
 *   - a URL to anywhere but patalign.com — a public assistant linking offsite is
 *     an endorsement we did not make and cannot audit;
 *   - a long verbatim quote from the corpus — the public shelf is published
 *     marketing, not a scrapeable archive, and an assistant that will recite
 *     3,000-word articles on request is a content exfiltration endpoint with a
 *     chat box on it.
 *
 * REFUSE, DON'T REDACT, and the reason is the same one the web-tier renderer
 * refuses uncited answers for: a redacted answer is a silent partial failure
 * that looks like success. A refusal is visible, loggable, and forces the corpus
 * or the prompt to be fixed rather than papered over.
 *
 * Pure — no network, no database, no request context — so every rule is testable
 * exhaustively and cannot be bypassed by a caller that forgot a step.
 */

export type PublicOutputViolation =
  | "email_address"
  | "offsite_url"
  | "verbatim_quote"
  | "empty_answer";

export type PublicOutputVerdict =
  | { ok: true; text: string }
  | { ok: false; violation: PublicOutputViolation; detail: string };

/** The only host a public answer may link to. */
export const ALLOWED_PUBLIC_HOST = "patalign.com";

const EMAIL_PATTERN = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/;

/** Bare hosts and full URLs both count — "see example.com/x" is still a link. */
const URL_PATTERN = /\b(?:https?:\/\/)?((?:[a-z0-9-]+\.)+[a-z]{2,})(?:\/[^\s)>\]]*)?/gi;

/**
 * Longest run of consecutive words shared with a source, in words.
 *
 * 40 words is roughly two sentences: long enough that ordinary grounded
 * paraphrase and short quoted definitions pass, short enough that reciting a
 * section does not. Set deliberately in WORDS rather than characters so it does
 * not vary with vocabulary length.
 */
export const VERBATIM_MAX_WORDS = Number(process.env.PAT_PUBLIC_VERBATIM_MAX_WORDS ?? 40);

function words(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Longest common run of words between an answer and one source.
 *
 * Classic LCS-substring over word arrays, rolling two rows so a 3,000-word
 * source against a 400-word answer stays linear in memory rather than
 * allocating a full matrix per source on every request.
 */
export function longestSharedRun(answer: string, source: string): number {
  const a = words(answer);
  const b = words(source);
  if (a.length === 0 || b.length === 0) return 0;

  let previous = new Array<number>(b.length + 1).fill(0);
  let current = new Array<number>(b.length + 1).fill(0);
  let best = 0;

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      current[j] = a[i - 1] === b[j - 1] ? previous[j - 1]! + 1 : 0;
      if (current[j]! > best) best = current[j]!;
    }
    const swap = previous;
    previous = current;
    current = swap;
    current.fill(0);
  }
  return best;
}

/** Every offsite host referenced by the answer, deduped. */
export function offsiteHosts(text: string): string[] {
  const hosts = new Set<string>();
  for (const match of text.matchAll(URL_PATTERN)) {
    const host = match[1]!.toLowerCase().replace(/^www\./, "");
    // Label-anchored, so "notpatalign.com" and "patalign.com.evil.com" are both
    // offsite — the same trap the web tier's allowlist guards against.
    if (host === ALLOWED_PUBLIC_HOST || host.endsWith(`.${ALLOWED_PUBLIC_HOST}`)) continue;
    hosts.add(host);
  }
  return [...hosts];
}

/**
 * Check a public answer before it is shown.
 *
 * `sources` are the raw texts the answer was grounded in — the verbatim rule
 * needs them, and it is checked against each source separately so a long run
 * cannot hide by being split across two of them.
 */
export function filterPublicAnswer(
  text: string,
  sources: readonly string[] = [],
  maxVerbatimWords: number = VERBATIM_MAX_WORDS
): PublicOutputVerdict {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, violation: "empty_answer", detail: "the model produced no text" };
  }

  const email = trimmed.match(EMAIL_PATTERN);
  if (email) {
    return { ok: false, violation: "email_address", detail: email[0] };
  }

  const offsite = offsiteHosts(trimmed);
  if (offsite.length > 0) {
    return { ok: false, violation: "offsite_url", detail: offsite.join(", ") };
  }

  for (const source of sources) {
    const run = longestSharedRun(trimmed, source);
    if (run > maxVerbatimWords) {
      return {
        ok: false,
        violation: "verbatim_quote",
        detail: `${run} consecutive words shared with a source (limit ${maxVerbatimWords})`,
      };
    }
  }

  return { ok: true, text: trimmed };
}
