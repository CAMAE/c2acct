-- Phase 2.5 #5: production trigger queue for the /admin command bar.
-- The Vercel runtime enqueues; the Mac mini supervisor polls + claims.

-- CreateEnum
CREATE TYPE "AgentTriggerStatus" AS ENUM ('pending', 'claimed', 'completed', 'failed', 'expired');

-- CreateTable
CREATE TABLE "AgentTriggerRequest" (
    "id" TEXT NOT NULL,
    "agentKey" TEXT NOT NULL,
    "message" TEXT,
    "taskEnv" JSONB,
    "requestedBy" TEXT,
    "status" "AgentTriggerStatus" NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "claimedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "runId" TEXT,
    "error" TEXT,

    CONSTRAINT "AgentTriggerRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AgentTriggerRequest_status_createdAt_idx" ON "AgentTriggerRequest"("status", "createdAt");

-- CreateIndex
CREATE INDEX "AgentTriggerRequest_agentKey_createdAt_idx" ON "AgentTriggerRequest"("agentKey", "createdAt" DESC);
