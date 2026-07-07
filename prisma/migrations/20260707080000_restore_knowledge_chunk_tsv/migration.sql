-- Restore KnowledgeChunk.tsv — the STORED generated tsvector + its GIN index
-- that retrieveHelp (lib/patAssistant/retrieveHelp.ts) queries via
-- websearch_to_tsquery + ts_rank. It was dropped as collateral by
-- 20260611185016_add_report_narrative_cache: the column is defined in raw SQL
-- (Postgres generated column — not expressible in schema.prisma), so a Prisma
-- auto-migration reconciled it away, silently breaking customer-facing Pat
-- help retrieval. Do NOT let a future `prisma migrate diff` drop it again;
-- these two statements are the source of truth for the FTS column.
--
-- IF NOT EXISTS keeps this safe to apply on any environment (e.g. prod may still
-- have the column if the drop was never deployed there).

ALTER TABLE "KnowledgeChunk"
  ADD COLUMN IF NOT EXISTS "tsv" tsvector
  GENERATED ALWAYS AS (to_tsvector('english', "text")) STORED;

CREATE INDEX IF NOT EXISTS "KnowledgeChunk_tsv_idx" ON "KnowledgeChunk" USING GIN ("tsv");
