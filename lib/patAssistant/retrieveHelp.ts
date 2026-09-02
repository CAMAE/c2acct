import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { frameUntrusted } from "@/lib/agents/internal-knowledge/retrieve";
import type { RetrievedChunk } from "@/lib/agents/internal-knowledge/retrieve";
import { GLOBAL_VERTICAL_ID } from "@/lib/verticals/context";
import {
  PUBLIC_AUDIENCE,
  readableDepthTiers,
  type CorpusDepthTier,
} from "@/lib/patAssistant/corpusAccess";

/**
 * Customer-facing, role-scoped help retrieval for Pat (Phase 0 foundation,
 * 2026-06-18).
 *
 * CRITICAL SECURITY BOUNDARY: this is a SEPARATE retrieval path from
 * lib/agents/internal-knowledge/retrieve.ts. That one serves internal operator
 * agents and spans repo_doc / audit_log / dream_state — content a customer must
 * never see. This path hard-filters to kind = 'help_doc' AND the caller's
 * audience/vertical IN THE SQL WHERE clause, so a vendor/firm/consultant Pat can
 * only ever retrieve customer-safe help chunks scoped to their role. The scope is
 * enforced at the data layer, never by prompting — an LLM cannot leak a chunk it
 * was never handed.
 *
 * `audience` MUST come from the server session (lib/auth/session.ts), never from
 * the client. Reuses the existing tsvector lexical search + RetrievedChunk shape,
 * so citations keep working and the documented pgvector swap-seam still applies.
 *
 * THREE walls now compose in the WHERE clause, and all three are deny-by-default:
 *
 *   1. kind = 'help_doc'  — the customer-safe corpus, always, in every mode.
 *   2. roleAccess         — the caller's audience, unless `unrestricted`.
 *   3. depthTier          — an ALLOWLIST of tiers derived from the caller's
 *                           membership plan (corpus program). CORE for everyone;
 *                           ELITE only for an ELITE member.
 *
 * The tier wall is inert on the day it lands: every existing source is CORE by
 * column default, and CORE is readable by everyone, so retrieval returns exactly
 * what it returned before. That is the point — the wall exists BEFORE the
 * content it gates, so no ELITE source can ever be authored into an unguarded
 * corpus.
 *
 * `unrestricted` (consultant/admin) drops wall 2 ONLY. Being entitled to ask
 * about any audience's help is not the same entitlement as being entitled to
 * read paid depth; collapsing the two would hand ELITE content to every
 * consultant seat.
 */
export type RetrieveHelpOptions = {
  verticalId?: string;
  /** consultant/admin: drop the AUDIENCE predicate. Never the tier predicate. */
  unrestricted?: boolean;
  /**
   * The viewer's membership plan, from the server-side membership resolver.
   * Absent/unentitled = CORE only. Never client-supplied.
   */
  membershipPlan?: string | null;
  /**
   * Set ONLY by an unauthenticated public entry path (corpus program (b)).
   *
   * That path does not exist yet and nothing passes this in this box — the wall
   * learns the word, no surface speaks it. When it does exist it will be
   * signed-out by definition, so it gets CORE depth and the `public` audience
   * and nothing else.
   */
  publicEntry?: boolean;
};

export async function retrieveHelp(
  query: string,
  audience: string,
  k = 5,
  opts?: RetrieveHelpOptions
): Promise<RetrievedChunk[]> {
  const q = query.trim();
  const aud = audience.trim();
  if (!q || !aud) {
    return [];
  }

  // A signed-in caller may never claim the public audience: `public` marks
  // content for the unauthenticated entry path, and an authenticated session
  // reaching it would be an audience escalation, not a convenience.
  if (aud === PUBLIC_AUDIENCE && !opts?.publicEntry) {
    return [];
  }

  // OR the terms so a natural-language question matches chunks holding ANY
  // significant term, then rank by ts_rank (same approach as internal retrieve()).
  const tsquery = q.split(/\s+/).filter(Boolean).join(" or ");

  // Vertical scope. A request for one vertical also admits VERTICAL-NEUTRAL
  // content (GLOBAL_VERTICAL_ID) — the B1 articles explain what PAT is and how
  // alignment is measured, which is true in every vertical. Without the OR they
  // would be stored correctly and then silently vanish the moment vertical
  // filtering was switched on.
  //
  // This only ever WIDENS to the neutral bucket; it never admits another real
  // vertical's content, so accounting can still never see legal's help.
  const verticalFilter = opts?.verticalId
    ? Prisma.sql`AND (s."verticalId" = ${opts.verticalId} OR s."verticalId" = ${GLOBAL_VERTICAL_ID})`
    : Prisma.empty;

  // Audience scoping. Strict by default: a vendor/firm caller only sees help
  // tagged for their audience (or untagged/global). `unrestricted` is reserved
  // for consultant/admin callers who, per spec, may ask anything across the help
  // corpus — it drops the roleAccess predicate but STILL never leaves kind =
  // 'help_doc', so the internal repo_doc/audit_log/dream_state corpus remains
  // unreachable. The caller (lib/patAssistant/audience.ts) decides this from the
  // server session, never the client.
  // Audience scoping.
  //
  // The empty-array wildcard means "every AUTHENTICATED audience" — that is the
  // documented semantic on KnowledgeSource.roleAccess, and it predates the
  // existence of a public audience. Once public content arrived, the wildcard
  // became a hole: a signed-out caller passing aud="public" matched
  // `cardinality = 0` and could retrieve every signed-in-global article. The B1
  // wall test caught exactly that — the public shelf returning the signed-in
  // glossary.
  //
  // So the public entry path requires EXPLICIT public membership. It never
  // benefits from a wildcard that means "any authenticated audience", because it
  // is not one.
  const roleFilter = opts?.unrestricted
    ? Prisma.empty
    : opts?.publicEntry
      ? Prisma.sql`AND ${PUBLIC_AUDIENCE} = ANY(s."roleAccess")`
      : Prisma.sql`AND (cardinality(s."roleAccess") = 0 OR ${aud} = ANY(s."roleAccess"))`;

  // Depth-tier allowlist. An ALLOWLIST rather than a `<=` comparison so the wall
  // stays deny-by-default: a tier added to the enum later is invisible to every
  // existing viewer until it is named on purpose. The public entry path is
  // signed out by definition, so it is pinned to CORE regardless of anything
  // else a caller passes.
  const tiers: CorpusDepthTier[] = opts?.publicEntry
    ? ["CORE"]
    : readableDepthTiers(opts?.membershipPlan);
  const tierFilter = Prisma.sql`AND s."depthTier"::text = ANY(${tiers}::text[])`;

  // roleAccess scoping: empty array = help visible to every authenticated audience;
  // otherwise the caller's audience must be a member. Enforced here, in SQL.
  const rows = await prisma.$queryRaw<
    Array<{ text: string; sourceKind: string; sourcePath: string; chunkIdx: number; rank: number }>
  >(Prisma.sql`
    SELECT c."text" AS "text",
           s."kind"::text AS "sourceKind",
           s."path" AS "sourcePath",
           c."chunkIdx" AS "chunkIdx",
           ts_rank(c."tsv", websearch_to_tsquery('english', ${tsquery})) AS "rank"
    FROM "KnowledgeChunk" c
    JOIN "KnowledgeSource" s ON s."id" = c."sourceId"
    WHERE s."kind" = 'help_doc'
      ${roleFilter}
      ${tierFilter}
      AND c."tsv" @@ websearch_to_tsquery('english', ${tsquery})
      ${verticalFilter}
    ORDER BY "rank" DESC, c."chunkIdx" ASC
    LIMIT ${k}
  `);

  // Same untrusted-content framing as the internal path (S6): help docs are
  // authored content, but they still enter a prompt as DATA. buildHelpContext
  // below reads `text`, so the framing travels with it by construction.
  return rows.map((row) => ({
    text: frameUntrusted(row.text, row.sourcePath, Number(row.chunkIdx)),
    rawText: row.text,
    sourceKind: row.sourceKind,
    sourcePath: row.sourcePath,
    chunkIdx: Number(row.chunkIdx),
    rank: Number(row.rank),
  }));
}

/**
 * Join retrieved help chunks into a context block for the model, with simple
 * inline citations preserved (path:#idx). Returns "" when there is nothing —
 * callers should then skip the model call and show the contact-support fallback.
 */
export function buildHelpContext(chunks: RetrievedChunk[]): string {
  return chunks
    .map((chunk) => `[${chunk.sourcePath}:#${chunk.chunkIdx}]\n${chunk.text}`)
    .join("\n\n---\n\n");
}
