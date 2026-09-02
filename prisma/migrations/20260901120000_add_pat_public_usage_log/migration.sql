-- Public-tier usage ledger (BOX 2).
--
-- ADDITIVE ONLY. One new table and its indexes. No existing table, column,
-- index, constraint, default or type is altered, renamed or dropped, and no row
-- is rewritten. An older build keeps working unchanged against this schema.
--
-- One table serves three guardrails, because all three ask the same question of
-- the same rows over different windows: requests from this caller recently
-- (per-IP rate limit), messages in this conversation (per-session cap), and
-- spend today (global daily cost cap).
--
-- THE IP IS STORED HASHED, never raw. Rate-limiting an abuser requires
-- distinguishing callers, not identifying them; a salted hash does the first
-- without the second, and the salt lives in the runtime env so the table alone
-- cannot be reversed by whoever obtains it.
--
-- No question text, deliberately. PatDeclineLog already owns redacted questions
-- with no identity attached; question text beside an ip hash and a session id
-- would rebuild the per-visitor transcript both tables are shaped to prevent.

-- CreateTable
CREATE TABLE "PatPublicUsageLog" (
    "id" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "costUsd" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "answered" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PatPublicUsageLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PatPublicUsageLog_createdAt_idx" ON "PatPublicUsageLog"("createdAt");
CREATE INDEX "PatPublicUsageLog_ipHash_createdAt_idx" ON "PatPublicUsageLog"("ipHash", "createdAt");
CREATE INDEX "PatPublicUsageLog_sessionId_createdAt_idx" ON "PatPublicUsageLog"("sessionId", "createdAt");
