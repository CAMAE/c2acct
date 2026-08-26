-- Corpus program — retrieval depth tiers + the Pat decline (gap) log.
--
-- ADDITIVE ONLY. One new enum, one new column with a server-side default, one
-- new table, and their indexes. No existing table, column, index, constraint,
-- default or type is altered, renamed or dropped, and no row is rewritten: the
-- ADD COLUMN default backfills existing rows in place. An older build keeps
-- working unchanged against this schema, because every column it already reads
-- and writes is untouched.
--
-- depthTier defaults to CORE, which is what every existing help_doc source
-- already is. The column is therefore INERT on the day it lands: the tier
-- predicate added to lib/patAssistant/retrieveHelp.ts admits every CORE row for
-- every entitled audience, so retrieval returns exactly what it returned before.
-- ELITE only becomes reachable once a source is deliberately authored into it.
--
-- PatDeclineLog stores the question REDACTED through the audit redactor, and
-- carries no userId / companyId / subjectId. It answers "what is the corpus
-- missing for this audience?", never "what did this tenant ask?".

-- CreateEnum
CREATE TYPE "KnowledgeDepthTier" AS ENUM ('CORE', 'ELITE');

-- AlterTable (additive: new column with a default, existing rows backfilled)
ALTER TABLE "KnowledgeSource" ADD COLUMN "depthTier" "KnowledgeDepthTier" NOT NULL DEFAULT 'CORE';

-- CreateIndex
CREATE INDEX "KnowledgeSource_depthTier_idx" ON "KnowledgeSource"("depthTier");

-- CreateTable
CREATE TABLE "PatDeclineLog" (
    "id" TEXT NOT NULL,
    "questionRedacted" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "verticalId" TEXT NOT NULL DEFAULT 'accounting',
    "rungReached" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatDeclineLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatDeclineLog_createdAt_idx" ON "PatDeclineLog"("createdAt");
CREATE INDEX "PatDeclineLog_audience_createdAt_idx" ON "PatDeclineLog"("audience", "createdAt");
CREATE INDEX "PatDeclineLog_verticalId_createdAt_idx" ON "PatDeclineLog"("verticalId", "createdAt");
CREATE INDEX "PatDeclineLog_rungReached_createdAt_idx" ON "PatDeclineLog"("rungReached", "createdAt");
