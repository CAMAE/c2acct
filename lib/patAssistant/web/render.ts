import { filterAllowedUrls } from "@/lib/patAssistant/web/allowlist";
import type { WebSource } from "@/lib/patAssistant/web/provider";

/**
 * The web answer renderer (LADDER-2).
 *
 * Two rules are CODE-ENFORCED here rather than prompted, because a prompt is a
 * request and this is a guarantee:
 *
 *   1. A web answer with ZERO clickable citations is never displayed. Not
 *      displayed-with-a-warning: refused, and the ladder declines instead.
 *   2. Every web answer carries the visible provenance label, verbatim.
 *
 * Prompting for either would work almost always, and "almost always" is the
 * failure mode that matters: the one uncited answer is precisely the one that
 * was hallucinated, and the one unlabelled answer is precisely the one a firm
 * mistakes for Patalign's own documentation.
 *
 * Pure — no network, no database, no request context — so the guarantee is
 * testable exhaustively and cannot be bypassed by a caller that forgot a step.
 */

/**
 * The provenance label. Verbatim, and pinned by contract test.
 *
 * It says what the answer is NOT as well as what it is, because the risk being
 * managed is a firm treating a web claim as Patalign's documented position.
 */
export const WEB_ANSWER_LABEL =
  "This comes from the web, not PAT's documentation.";

export type WebCitation = {
  url: string;
  title: string;
};

export type RenderedWebAnswer = {
  /** Answer prose. Never shown without `citations` and `label`. */
  text: string;
  citations: WebCitation[];
  label: string;
};

export type WebRenderFailure = {
  reason: "no_citations" | "empty_answer";
};

export type WebRenderResult =
  | { ok: true; answer: RenderedWebAnswer }
  | { ok: false; failure: WebRenderFailure };

/**
 * Build a displayable web answer, or refuse.
 *
 * Sources are re-filtered against the allowlist HERE, after the provider has
 * already been told to respect it. That is deliberate belt-and-braces: the
 * provider's filtering governs what the model READS, and this one governs what
 * Pat may CITE. If the two ever disagree, the stricter local rule wins, and if
 * filtering leaves nothing, the answer is refused rather than shown uncited.
 */
export function renderWebAnswer(
  text: string,
  sources: readonly WebSource[],
  env: Record<string, string | undefined> = process.env
): WebRenderResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { ok: false, failure: { reason: "empty_answer" } };
  }

  const allowed = filterAllowedUrls(sources, env);

  // Dedupe by URL, preserving provider order — the same page cited twice is one
  // citation, and a citation list padded with repeats reads as more corroborated
  // than it is.
  const seen = new Set<string>();
  const citations: WebCitation[] = [];
  for (const source of allowed) {
    if (seen.has(source.url)) continue;
    seen.add(source.url);
    citations.push({ url: source.url, title: source.title || source.url });
  }

  if (citations.length === 0) {
    // THE rule. An uncited web answer is refused, not downgraded.
    return { ok: false, failure: { reason: "no_citations" } };
  }

  return { ok: true, answer: { text: trimmed, citations, label: WEB_ANSWER_LABEL } };
}
