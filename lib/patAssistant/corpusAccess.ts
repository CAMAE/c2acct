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
 * Audience tokens live in ./audienceTokens.ts and are re-exported here so every
 * existing import keeps working.
 *
 * They moved because THIS module imports the membership resolver (for depth
 * tiers), which imports Prisma — and the web rung needs the `public` token while
 * being provably unable to reach tenant data. A leaf module with no imports is
 * the only way both can be true.
 *
 * The `public` token is a roleAccess audience reserved for an unauthenticated
 * public entry path. That path does not exist yet: the wall accepts the word, no
 * surface serves it. Two invariants keep it safe, both tested — no authenticated
 * audience resolution returns it, and public retrieval must be requested
 * explicitly via `publicEntry`, which no route passes.
 */
export {
  AUTHENTICATED_AUDIENCES,
  PUBLIC_AUDIENCE,
  isKnownAudienceToken,
} from "@/lib/patAssistant/audienceTokens";

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
