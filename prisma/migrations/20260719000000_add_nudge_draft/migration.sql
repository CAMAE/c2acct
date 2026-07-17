-- 16c: Pat-drafted nudge awaiting consultant approval (HITL). Purely additive,
-- zero backfill. A draft only becomes a firm Notification via decideNudgeDraft's
-- approve branch (lib/notifications/nudgeDraft.ts) — no auto-send path exists.

-- CreateTable
CREATE TABLE "NudgeDraft" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "ctaLabel" TEXT,
    "ctaHref" TEXT,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "edited" BOOLEAN NOT NULL DEFAULT false,
    "decidedByUserId" TEXT,
    "decidedAt" TIMESTAMP(3),
    "recipientsNotified" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NudgeDraft_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NudgeDraft_companyId_status_idx" ON "NudgeDraft"("companyId", "status");

-- CreateIndex
CREATE INDEX "NudgeDraft_actorUserId_status_idx" ON "NudgeDraft"("actorUserId", "status");

-- AddForeignKey
ALTER TABLE "NudgeDraft" ADD CONSTRAINT "NudgeDraft_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
