-- Patalign Agent System — per-agent key/value state store (Phase 1c). Agents
-- persist baselines here between runs (the Cloudflare/Domain watcher stores its
-- last-known DNS snapshot, keyed per agent). This is runtime plumbing like
-- AgentRun/AgentAuditLogEntry, not production business data, and is written
-- directly via lib/agents/state.ts rather than through an agent tool.
--
-- Additive only; no existing tables touched.

CREATE TABLE "AgentState" (
    "id" TEXT NOT NULL,
    "agentKey" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AgentState_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AgentState_agentKey_key_key" ON "AgentState"("agentKey", "key");
CREATE INDEX "AgentState_agentKey_idx" ON "AgentState"("agentKey");
