/**
 * PAT_ENABLE_VERTICAL_PACKS — the master switch for the Vertical Pack framework
 * (VERTICAL-READINESS-AUDIT-2026-08 §3.3).
 *
 * OFF (default) must be byte-identical to pre-framework behaviour, and the
 * mechanism that makes that credible is a short-circuit, not a careful pack:
 *
 *   - `resolveCurrentVertical()` returns the `"accounting"` constant *before*
 *     any pack load, so a pack-loading bug cannot reach a flag-off tenant.
 *   - `lexicon()` returns the literal strings already in the code, from a frozen
 *     in-code map, without consulting a pack.
 *   - Content queries gain `verticalId` filters only when the flag is on, so no
 *     query plan changes for the default tenant.
 *
 * The proof obligation is a test, not a promise — see
 * `tests/vertical-lexicon-byte-identity.contract.test.ts` and
 * `tests/vertical-resolver.contract.test.ts`.
 */
export const VERTICAL_PACKS_FLAG_ENV = "PAT_ENABLE_VERTICAL_PACKS";

/**
 * The two variables this framework reads, and nothing else. Narrower than
 * `NodeJS.ProcessEnv` on purpose: a test injecting an environment should be
 * able to write `{ PAT_DEFAULT_VERTICAL: "legal" }` without also having to
 * satisfy `NODE_ENV` and the rest of the ambient declaration.
 */
export type VerticalEnv = Record<string, string | undefined>;

export function isVerticalPacksEnabled(env: VerticalEnv = process.env): boolean {
  return env[VERTICAL_PACKS_FLAG_ENV] === "1";
}
