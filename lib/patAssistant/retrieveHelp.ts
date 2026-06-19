import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { RetrievedChunk } from "@/lib/agents/internal-knowledge/retrieve";

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
 */
export async function retrieveHelp(
  query: string,
  audience: string,
  k = 5,
  opts?: { verticalId?: string }
): Promise<RetrievedChunk[]> {
  const q = query.trim();
  const aud = audience.trim();
  if (!q || !aud) {
    return [];
  }

  // OR the terms so a natural-language question matches chunks holding ANY
  // significant term, then rank by ts_rank (same approach as internal retrieve()).
  const tsquery = q.split(/\s+/).filter(Boolean).join(" or ");

  const verticalFilter = opts?.verticalId
    ? Prisma.sql`AND s."verticalId" = ${opts.verticalId}`
    : Prisma.empty;

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
      AND (cardinality(s."roleAccess") = 0 OR ${aud} = ANY(s."roleAccess"))
      AND c."tsv" @@ websearch_to_tsquery('english', ${tsquery})
      ${verticalFilter}
    ORDER BY "rank" DESC, c."chunkIdx" ASC
    LIMIT ${k}
  `);

  return rows.map((row) => ({
    text: row.text,
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
