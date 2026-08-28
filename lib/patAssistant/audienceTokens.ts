/**
 * Audience tokens, with NO dependencies.
 *
 * Split out of `corpusAccess.ts` because that module imports the membership
 * resolver (for depth tiers), which imports Prisma. Anything that needs only the
 * vocabulary should not inherit a database client to get it.
 *
 * The web rung is the concrete reason: it must be provably unable to reach
 * tenant data, and it needs exactly one thing from this area — the name of the
 * public audience. `tests/pat-web-tier.contract.test.ts` walks its import graph
 * and caught the original `corpusAccess` import, which pulled in membership,
 * Prisma, and the session reader behind it.
 *
 * Keep this file free of imports. That is its entire job.
 */

/**
 * The `public` audience token — content an UNAUTHENTICATED public entry path may
 * retrieve. No authenticated resolver ever returns it (enforced at compile time
 * in lib/patAssistant/audience.ts), and no paid rung ever serves it.
 */
export const PUBLIC_AUDIENCE = "public";

/**
 * Audiences the authenticated resolver may produce. `public` is absent by
 * design — it is the one audience that can only come from an unauthenticated
 * path, and an authenticated session must never be able to claim it.
 */
export const AUTHENTICATED_AUDIENCES = [
  "admin",
  "consultant",
  "vendor",
  "firm",
  "individual",
  "invitee",
] as const;

/** Is this roleAccess token one the corpus is allowed to carry? */
export function isKnownAudienceToken(token: string): boolean {
  return (
    token === PUBLIC_AUDIENCE ||
    (AUTHENTICATED_AUDIENCES as readonly string[]).includes(token)
  );
}
