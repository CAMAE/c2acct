-- Agent hardening (S1/S2): async approval pause/resume + idempotency keys.
-- Strictly additive: one new enum value, three nullable columns, one nullable
-- column on the trigger queue. No column is dropped, renamed, or backfilled, so
-- an older supervisor keeps working against this schema.

-- 1. Run status for "suspended, no live process, waiting on a human".
ALTER TYPE "AgentRunStatus" ADD VALUE IF NOT EXISTS 'paused_approval';

-- 2. Idempotency guard on the approval row. idempotencyKey is unique so the
--    check-and-set below can never admit two executions of one approved action.
ALTER TABLE "AgentApproval" ADD COLUMN IF NOT EXISTS "toolName" TEXT;
ALTER TABLE "AgentApproval" ADD COLUMN IF NOT EXISTS "idempotencyKey" TEXT;
ALTER TABLE "AgentApproval" ADD COLUMN IF NOT EXISTS "consumedAt" TIMESTAMP(3);

CREATE UNIQUE INDEX IF NOT EXISTS "AgentApproval_idempotencyKey_key"
  ON "AgentApproval"("idempotencyKey");

-- 3. Resume pointer on the trigger queue: which paused run to re-enter.
ALTER TABLE "AgentTriggerRequest" ADD COLUMN IF NOT EXISTS "resumeRunId" TEXT;
