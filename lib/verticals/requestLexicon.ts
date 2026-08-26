import { ACCOUNTING_LEXICON, getPrimedLexicon, primeVerticalLexicon, resolveLexicon, type VerticalLexicon } from "./lexicon";
import { isVerticalPacksEnabled } from "./flag";
import { loadVerticalPack } from "./loader";
import { resolveVerticalForSession, type VerticalSessionDeps } from "./session";

/**
 * Resolve the display-layer lexicon for one request, SERVER-SIDE.
 *
 * This is the async boundary `lexicon()` cannot be. `lexicon()` has to be a
 * drop-in for a string literal, so it is synchronous and reads a primed map;
 * pack loading is async and touches the filesystem. This function is where the
 * two meet: resolve the tenant's vertical, load its pack once, prime it, and
 * hand back a plain object of strings.
 *
 * ## The client rule
 *
 * A client component must NEVER resolve its own vertical. Two reasons, and the
 * second is the one that bites:
 *
 *   1. `process.env.PAT_ENABLE_VERTICAL_PACKS` read from client code is
 *      inlined at BUILD time, not read at request time. One build serves every
 *      tenant, so a build-time flag read cannot be per-tenant — it would freeze
 *      whatever value the builder happened to have.
 *   2. Pack loading is filesystem access. There is no filesystem in a browser,
 *      and shipping a pack to the client would ship every vertical's nouns to
 *      every tenant.
 *
 * So: resolve here, in a server component, and pass the result DOWN — as props,
 * or through `<VerticalLexiconProvider>` (app/components/verticals/) when the
 * value has to cross several client components. The returned object is a frozen
 * record of plain strings, which serializes across the RSC boundary as-is.
 *
 * `tests/vertical-client-lexicon.contract.test.ts` holds the rule: no `"use
 * client"` file may name the flag, the env override, or the pack loader.
 *
 * Flag off this returns the frozen in-code map with no session read, no company
 * read and no filesystem access — the same short-circuit as everywhere else in
 * this framework.
 */
export async function resolveLexiconForRequest(
  deps: VerticalSessionDeps = {}
): Promise<VerticalLexicon> {
  const env = deps.env ?? process.env;

  if (!isVerticalPacksEnabled(env)) {
    return ACCOUNTING_LEXICON;
  }

  const verticalId = await resolveVerticalForSession(deps);

  // Prime once per vertical per process. An already-primed vertical costs
  // nothing; a missing pack throws here, at the boundary, rather than in the
  // middle of rendering a sentence.
  if (!getPrimedLexicon(verticalId)) {
    const pack = await loadVerticalPack(verticalId);
    primeVerticalLexicon(verticalId, pack.lexicon);
  }

  return resolveLexicon({ verticalId, env });
}
