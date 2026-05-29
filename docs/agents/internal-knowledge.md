# Internal Knowledge Agent (Phase 2 #2)

Answers operator questions over Patalign's **operational** corpus with **citations**.
v1 is **zero-dependency lexical search** (Postgres full-text search) — no embedding
or LLM API, no new packages, no pgvector. It returns the top-k most relevant
passages, each cited; it does **not** synthesize prose (that's the Phase 3 upgrade).

## Corpus (v1)

Indexed by `scripts/agents/index-knowledge.ts` into `KnowledgeSource` / `KnowledgeChunk`:
- **repo docs** — `README.md`, `CLAUDE.md`, `docs/**/*.md`, `lib/**/*.md` (excludes
  `archive/`, `node_modules`, `.next`).
- **audit log** — the last 30 days of `AgentAuditLogEntry`, one chunk per row.
- **deferred:** Dream State (it's a `.rtfd` bundle; index it once extracted to text
  as a `dream_state` source).

Chunking: ~500 tokens, paragraph-boundary, 1-paragraph overlap. `contentHash` per
source makes re-runs idempotent (unchanged sources skipped). NOT indexed:
code files, Neon transactional/customer data (vendor profiles, survey responses).

## Retrieval

`lib/agents/internal-knowledge/retrieve.ts` → `retrieve(query, k)`:
`websearch_to_tsquery('english', …)` + `ts_rank` against the GIN-indexed generated
`tsv` column. Returns `{ text, sourceKind, sourcePath, chunkIdx, rank }[]`. Citations:
`[<path>:#<chunkIdx>]` for docs, `[audit:<id>]` for audit rows (`formatCitation`).
v1 is cross-vertical (operational knowledge); the optional `verticalId` filter is
the seam for future per-vertical knowledge.

## Triggers

On-demand (no cron). The agent reads its query from `PAT_KNOWLEDGE_QUERY` and returns
the cited answer in its run summary (audited like every agent):
- **Telegram:** `/knowledge <question>` (works now).
- **/admin command bar:** routes to `/api/agents/internal-knowledge/run` with the
  message → `PAT_KNOWLEDGE_QUERY` (dev only; prod is the Phase 2.5 trigger-queue gap).
- **CLI:** `PAT_KNOWLEDGE_QUERY="…" pnpm agent:run internal-knowledge`.

## Phase 3 upgrade: vector RAG (the drop-in path)

The `retrieve(query, k)` contract is the stable seam. To upgrade to semantic RAG
**without changing any call site**:
1. Provision an embedding key (e.g. OpenAI `text-embedding-3-small`) + add the SDK.
2. Add a `pgvector` column to `KnowledgeChunk` (Neon supports `CREATE EXTENSION vector`;
   for local dev use a pgvector-enabled Postgres image or keep FTS locally).
3. Re-index: compute + store embeddings in `index-knowledge.ts`.
4. Swap `retrieve()`'s internals to embed the query and run a `<=>` similarity search.
   Keep the `RetrievedChunk` shape so citations keep working.
5. Add **LLM synthesis** (needs `ANTHROPIC_API_KEY` — see the Phase 2.5 backlog in
   `operations.md`): feed the retrieved chunks to Claude to produce a synthesized,
   citation-backed answer instead of raw passages. This also unlocks Claude reasoning
   for every future agent (Customer Comms drafts, Support Triage, …).

Until then, v1 is honest "cited knowledge search," not generative synthesis.
