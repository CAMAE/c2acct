-- Patalign Agent System — Phase 0 foundation. See
-- PATALIGN-AGENT-PHASE-1-IMPL-SPEC.md §2 and the matching models appended to
-- prisma/schema.prisma. This is the control-plane substrate for the agent
-- runtime: AgentDefinition is synced from agents/*.yaml by the supervisor,
-- AgentRun records each invocation, AgentStep captures the per-step trace,
-- AgentAuditLogEntry is the immutable hook audit trail, and AgentApproval backs
-- the Phase 1d Telegram approval round-trip.
--
-- Migration is purely additive: no existing tables are touched. Authored by
-- hand to match the repo's `migrate deploy` convention (this repo does not run
-- `prisma migrate dev`).

-- 1. Enums.

CREATE TYPE "AgentRunStatus" AS ENUM (
    'running',
    'awaiting_approval',
    'completed',
    'failed',
    'cancelled',
    'timeout',
    'budget_exceeded',
    'circuit_open'
);

CREATE TYPE "AgentApprovalStatus" AS ENUM (
    'pending',
    'approved',
    'denied',
    'edited',
    'expired',
    'cancelled'
);

-- 2. AgentDefinition — one row per agent, synced from its YAML config.

CREATE TABLE "AgentDefinition" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "configYaml" TEXT NOT NULL,
    "verticalId" TEXT NOT NULL DEFAULT 'accounting',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AgentDefinition_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AgentDefinition_key_key" ON "AgentDefinition"("key");
CREATE INDEX "AgentDefinition_key_idx" ON "AgentDefinition"("key");
CREATE INDEX "AgentDefinition_verticalId_idx" ON "AgentDefinition"("verticalId");

-- 3. AgentRun — one row per agent invocation.

CREATE TABLE "AgentRun" (
    "id" TEXT NOT NULL,
    "agentKey" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "triggerSource" TEXT,
    "status" "AgentRunStatus" NOT NULL DEFAULT 'running',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "durationMs" INTEGER,
    "tokensInput" INTEGER,
    "tokensOutput" INTEGER,
    "estCostUsd" DECIMAL(10,6),
    "finalSummary" TEXT,
    "errorClass" TEXT,
    "errorMessage" TEXT,
    CONSTRAINT "AgentRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AgentRun_agentKey_startedAt_idx" ON "AgentRun"("agentKey", "startedAt" DESC);
CREATE INDEX "AgentRun_status_idx" ON "AgentRun"("status");

-- 4. AgentStep — per-step trace within a run.

CREATE TABLE "AgentStep" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "stepIdx" INTEGER NOT NULL,
    "kind" TEXT NOT NULL,
    "toolName" TEXT,
    "toolArgs" JSONB,
    "toolResult" JSONB,
    "modelUsed" TEXT,
    "tokensInput" INTEGER,
    "tokensOutput" INTEGER,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    CONSTRAINT "AgentStep_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AgentStep_runId_stepIdx_idx" ON "AgentStep"("runId", "stepIdx");

-- 5. AgentAuditLogEntry — immutable hook audit trail.

CREATE TABLE "AgentAuditLogEntry" (
    "id" TEXT NOT NULL,
    "runId" TEXT,
    "agentKey" TEXT,
    "hookPhase" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "outcome" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentAuditLogEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AgentAuditLogEntry_agentKey_createdAt_idx" ON "AgentAuditLogEntry"("agentKey", "createdAt" DESC);
CREATE INDEX "AgentAuditLogEntry_runId_idx" ON "AgentAuditLogEntry"("runId");
CREATE INDEX "AgentAuditLogEntry_hookPhase_idx" ON "AgentAuditLogEntry"("hookPhase");

-- 6. AgentApproval — operator approval queue (Telegram + /admin).

CREATE TABLE "AgentApproval" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "agentKey" TEXT NOT NULL,
    "proposedAction" TEXT NOT NULL,
    "proposedArgs" JSONB NOT NULL,
    "rationale" TEXT,
    "blastRadius" TEXT,
    "estCostUsd" DECIMAL(10,6),
    "status" "AgentApprovalStatus" NOT NULL DEFAULT 'pending',
    "decidedBy" TEXT,
    "decidedAt" TIMESTAMP(3),
    "decision" TEXT,
    "editedArgs" JSONB,
    "decisionNote" TEXT,
    "telegramMsgId" TEXT,
    "telegramHmac" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AgentApproval_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AgentApproval_status_createdAt_idx" ON "AgentApproval"("status", "createdAt");
CREATE INDEX "AgentApproval_agentKey_idx" ON "AgentApproval"("agentKey");
CREATE INDEX "AgentApproval_runId_idx" ON "AgentApproval"("runId");

-- 7. Foreign keys.

ALTER TABLE "AgentRun"
    ADD CONSTRAINT "AgentRun_agentKey_fkey"
    FOREIGN KEY ("agentKey") REFERENCES "AgentDefinition"("key")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AgentStep"
    ADD CONSTRAINT "AgentStep_runId_fkey"
    FOREIGN KEY ("runId") REFERENCES "AgentRun"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AgentAuditLogEntry"
    ADD CONSTRAINT "AgentAuditLogEntry_runId_fkey"
    FOREIGN KEY ("runId") REFERENCES "AgentRun"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AgentApproval"
    ADD CONSTRAINT "AgentApproval_runId_fkey"
    FOREIGN KEY ("runId") REFERENCES "AgentRun"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AgentApproval"
    ADD CONSTRAINT "AgentApproval_agentKey_fkey"
    FOREIGN KEY ("agentKey") REFERENCES "AgentDefinition"("key")
    ON DELETE RESTRICT ON UPDATE CASCADE;
