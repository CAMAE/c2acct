import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export interface RetrievedChunk {
  text: string;
  sourceKind: string;
  sourcePath: string;
  chunkIdx: number;
  rank: number;
}

/**
 * Lexical retrieval over the knowledge corpus via Postgres full-text search
 * (websearch_to_tsquery + ts_rank against the GIN-indexed tsvector). No external
 * embedding/LLM calls.
 *
 * SWAP SEAM (Phase 3 upgrade): the `(query, k)` contract is the stable boundary.
 * A future vector-RAG version replaces the internals here — embed the query and
 * run a pgvector `<=>` similarity search — without changing any call site. Keep
 * the RetrievedChunk shape (text + sourceKind + sourcePath + chunkIdx + rank) so
 * citations keep working. See docs/agents/internal-knowledge.md.
 */
export async function retrieve(
  query: string,
  k = 5,
  opts?: { verticalId?: string }
): Promise<RetrievedChunk[]> {
  const q = query.trim();
  if (!q) {
    return [];
  }

  // OR the query terms so a natural-language question ("what did we decide about
  // Stripe billing?") matches chunks containing ANY significant term, then ranks
  // by ts_rank (more/closer matches score higher → top-k are the most relevant).
  // websearch_to_tsquery treats lowercase "or" as the OR operator and drops
  // stopwords + sanitizes input. A plain AND query (the default) is too strict for
  // multi-term questions — no single chunk holds every term — and returns nothing.
  const tsquery = q.split(/\s+/).filter(Boolean).join(" or ");

  // verticalId is optional — v1 knowledge is cross-vertical (operational), so we
  // don't filter by default; the seam supports per-vertical filtering later.
  const verticalFilter = opts?.verticalId
    ? Prisma.sql`AND s."verticalId" = ${opts.verticalId}`
    : Prisma.empty;

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
    WHERE c."tsv" @@ websearch_to_tsquery('english', ${tsquery})
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

/** Format a retrieved chunk's citation: [path:#idx] for docs, [audit:<id>] for audit. */
export function formatCitation(chunk: RetrievedChunk): string {
  if (chunk.sourceKind === "audit_log") {
    const match = chunk.text.match(/^\[audit:([a-z0-9]+)\]/i);
    return match ? `[audit:${match[1]}]` : "[audit_log]";
  }
  return `[${chunk.sourcePath}:#${chunk.chunkIdx}]`;
}
