-- CreateTable
CREATE TABLE "OperatorAuditEvent" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT,
    "summary" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OperatorAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OperatorAuditEvent_actorUserId_createdAt_idx" ON "OperatorAuditEvent"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "OperatorAuditEvent_entityType_createdAt_idx" ON "OperatorAuditEvent"("entityType", "createdAt");

-- CreateIndex
CREATE INDEX "OperatorAuditEvent_action_createdAt_idx" ON "OperatorAuditEvent"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "OperatorAuditEvent" ADD CONSTRAINT "OperatorAuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
