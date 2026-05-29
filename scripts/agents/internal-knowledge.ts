// Internal Knowledge Agent (Phase 2 #2) — v1 zero-dependency lexical search.
// Receives a query (PAT_KNOWLEDGE_QUERY env, set by the /knowledge Telegram
// command, the /admin command bar via /api/agents/.../run, or CLI), retrieves the
// top-k matching corpus chunks via Postgres FTS, and returns an EXTRACTIVE,
// citation-backed answer in the run summary. No embedding/LLM calls — the Phase 3
// upgrade adds LLM synthesis behind the same retrieve() seam (needs ANTHROPIC_API_KEY;
// see docs/agents/internal-knowledge.md + the Phase 2.5 backlog in operations.md).
import { registerAgent } from "@/lib/agents/registry";
import { formatCitation, retrieve } from "@/lib/agents/internal-knowledge/retrieve";
import { loadVerticalPack } from "@/lib/verticals/loader";
import type { AgentHandler } from "@/lib/agents/types";

export const INTERNAL_KNOWLEDGE_KEY = "internal-knowledge";
const TOP_K = 5;
const SNIPPET_CHARS = 500;

const internalKnowledgeHandler: AgentHandler = async (ctx) => {
  const query = (process.env.PAT_KNOWLEDGE_QUERY ?? "").trim();

  // Vertical Pack resolution (pattern parity with every agent). v1 retrieval is
  // cross-vertical, so we load the pack but don't filter retrieval by it.
  const pack = await loadVerticalPack(ctx.config.vertical_id ?? "accounting");
  await ctx.log("knowledge query received", { query, vertical: pack.id });

  if (!query) {
    return { summary: "Internal Knowledge: no query provided (set PAT_KNOWLEDGE_QUERY)." };
  }

  const chunks = await ctx.useTool("knowledge.retrieve", { query, k: TOP_K }, async (args) =>
    retrieve(String(args.query), Number(args.k) || TOP_K)
  );

  if (chunks.length === 0) {
    return { summary: `No knowledge found for "${query}".` };
  }

  const body = chunks
    .map((chunk, index) => {
      const snippet = chunk.text.length > SNIPPET_CHARS ? `${chunk.text.slice(0, SNIPPET_CHARS)}…` : chunk.text;
      return `${index + 1}. ${formatCitation(chunk)}\n${snippet}`;
    })
    .join("\n\n");

  return {
    summary: `Here's what I found about "${query}" (${chunks.length} passage(s)):\n\n${body}`,
  };
};

registerAgent(INTERNAL_KNOWLEDGE_KEY, internalKnowledgeHandler);
