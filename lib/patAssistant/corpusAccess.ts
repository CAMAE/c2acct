import { MEMBERSHIP_PLAN, hasMembershipAccess } from "@/lib/membership";

/**
 * Corpus access vocabulary — depth tiers and the public audience
 * (corpus program).
 *
 * Kept in its own module, free of Prisma and of `next/headers`, so the wall's
 * vocabulary can be imported by the importer, the lint, and the tests without
 * dragging a database client or a request context along.
 */

/** Mirrors the Prisma `KnowledgeDepthTier` enum, as literals. */
export const DEPTH_TIERS = ["CORE", "ELITE"] as const;
export type CorpusDepthTier = (typeof DEPTH_TIERS)[number];

/** Everything that exists today. Readable by any entitled audience. */
export const DEPTH_TIER_CORE: CorpusDepthTier = "CORE";
/** Depth that requires an ELITE membership to retrieve. */
export const DEPTH_TIER_ELITE: CorpusDepthTier = "ELITE";

/**
 * The `public` audience token (corpus program (b)).
 *
 * A roleAccess value reserved for content that an UNAUTHENTICATED public entry
 * path may retrieve. That path does not exist yet, and nothing in this box
 * serves it: the wall learns the word, no surface speaks it.
 *
 * It is deliberately a roleAccess audience rather than a new column. roleAccess
 * already means "which audiences may retrieve this", `public` is exactly such an
 * audience, and adding a parallel boolean would create two places to ask one
 * question — the failure mode that produces a source visible under one rule and
 * hidden under the other.
 *
 * Two invariants make it safe to land before its consumer exists, both tested:
 *   1. No authenticated audience resolution ever RETURNS "public"
 *      (lib/patAssistant/audience.ts), so a signed-in caller cannot match a
 *      public-only source through the normal roleAccess predicate.
 *   2. Public retrieval must be requested explicitly via `publicEntry`, and no
 *      route passes it. A grep-able contract test asserts that stays true.
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

/**
 * The highest depth tier a viewer may retrieve.
 *
 * CORE for everyone — including a signed-out public caller and a member with no
 * entitlement. ELITE only for an ELITE membership. The membership plan comes
 * from the server-side membership resolver; nothing here reads a request.
 *
 * Note the asymmetry with `unrestricted` (consultant/admin) in retrieveHelp:
 * that flag drops the AUDIENCE predicate, not the tier predicate. Being allowed
 * to ask about any audience's help is not the same entitlement as being allowed
 * to read paid depth, and collapsing the two would hand ELITE content to every
 * consultant seat.
 */
export function maxDepthTierFor(plan: string | null | undefined): CorpusDepthTier {
  return hasMembershipAccess(plan, MEMBERSHIP_PLAN.ELITE) ? DEPTH_TIER_ELITE : DEPTH_TIER_CORE;
}

/**
 * The tiers a viewer may retrieve, as a list for the SQL `IN` predicate.
 *
 * Returned as an explicit allowlist rather than a comparison, so the wall is
 * deny-by-default: a depth tier added to the enum later is invisible to every
 * existing viewer until it is named here on purpose.
 */
export function readableDepthTiers(plan: string | null | undefined): CorpusDepthTier[] {
  return maxDepthTierFor(plan) === DEPTH_TIER_ELITE
    ? [DEPTH_TIER_CORE, DEPTH_TIER_ELITE]
    : [DEPTH_TIER_CORE];
}
