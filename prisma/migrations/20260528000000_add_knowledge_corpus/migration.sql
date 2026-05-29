-- Internal Knowledge Agent corpus (Phase 2 #2) — zero-dependency lexical search.
-- KnowledgeChunk.tsv is a STORED generated tsvector (Postgres 12+; both docker
-- PG16 and Neon support it — no pgvector extension required). Retrieval uses
-- websearch_to_tsquery + ts_rank against the GIN-indexed tsv (see
-- lib/agents/internal-knowledge/retrieve.ts). Vector RAG (pgvector) is a future
-- drop-in upgrade behind the same retrieve() interface.
--
-- Additive only.

CREATE TYPE "KnowledgeSourceKind" AS ENUM ('repo_doc', 'audit_log', 'dream_state');

CREATE TABLE "KnowledgeSource" (
    "id" TEXT NOT NULL,
    "kind" "KnowledgeSourceKind" NOT NULL,
    "path" TEXT NOT NULL,
    "contentHash" TEXT NOT NULL,
    "lastIndexedAt" TIMESTAMP(3) NOT NULL,
    "verticalId" TEXT NOT NULL DEFAULT 'accounting',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "KnowledgeSource_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KnowledgeSource_path_key" ON "KnowledgeSource"("path");
CREATE INDEX "KnowledgeSource_kind_idx" ON "KnowledgeSource"("kind");
CREATE INDEX "KnowledgeSource_verticalId_idx" ON "KnowledgeSource"("verticalId");

CREATE TABLE "KnowledgeChunk" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "chunkIdx" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "tokens" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tsv" tsvector GENERATED ALWAYS AS (to_tsvector('english', "text")) STORED,
    CONSTRAINT "KnowledgeChunk_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "KnowledgeChunk_sourceId_chunkIdx_idx" ON "KnowledgeChunk"("sourceId", "chunkIdx");
CREATE INDEX "KnowledgeChunk_tsv_idx" ON "KnowledgeChunk" USING GIN ("tsv");

ALTER TABLE "KnowledgeChunk"
    ADD CONSTRAINT "KnowledgeChunk_sourceId_fkey"
    FOREIGN KEY ("sourceId") REFERENCES "KnowledgeSource"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
