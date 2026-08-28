-- Web-tier search ledger (LADDER-2).
--
-- ADDITIVE ONLY. One new table and its indexes. No existing table, column,
-- index, constraint, default or type is altered, renamed or dropped, and no row
-- is rewritten. An older build keeps working unchanged against this schema.
--
-- This is a SPEND CONTROL, not analytics. It answers "how much has the web tier
-- cost today?" and "has this user already had their allowance?" — neither of
-- which is answerable without a per-row cost and a per-row userId. That is why
-- this table carries an identity when PatDeclineLog deliberately does not: you
-- cannot rate-limit per user without knowing the user.
--
-- The QUESTION TEXT IS ABSENT ON PURPOSE. PatDeclineLog already owns the
-- redacted question with no identity attached; storing the question beside the
-- userId here would reconstruct exactly the per-tenant question history that the
-- decline log's no-identity rule exists to prevent. Rows are prunable on any
-- schedule — nothing reads them beyond the current day's window.

-- CreateTable
CREATE TABLE "PatWebSearchLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "verticalId" TEXT NOT NULL DEFAULT 'accounting',
    "provider" TEXT NOT NULL,
    "costUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "answered" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatWebSearchLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatWebSearchLog_createdAt_idx" ON "PatWebSearchLog"("createdAt");
CREATE INDEX "PatWebSearchLog_userId_createdAt_idx" ON "PatWebSearchLog"("userId", "createdAt");
CREATE INDEX "PatWebSearchLog_audience_createdAt_idx" ON "PatWebSearchLog"("audience", "createdAt");
