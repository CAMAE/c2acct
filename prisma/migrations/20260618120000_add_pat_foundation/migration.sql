-- Pat foundation (Phase 0, 2026-06-18). Additive only — no existing column or
-- table is altered destructively. Everything here stays dormant until the
-- PAT_ENABLE_PAT_ASSISTANT / PAT_ENABLE_PINGS flags are set.
--
--   * help_doc: a customer-safe knowledge kind, separate from the internal
--     repo_doc/audit_log/dream_state corpus (see lib/patAssistant/retrieveHelp.ts).
--   * KnowledgeSource.roleAccess: per-audience scoping for help chunks.
--   * User.lastLoginAt: enables true inactivity triggers (stale-draft proxy used
--     until populated).
--   * Notification / NotificationDelivery / NotificationPreference / NudgeEvent:
--     the in-app inbox, per-channel fan-out, preference center, and ping audit log.
--   * EngagementQuarter: quarterly completion target for deadline reminders.

-- New customer-facing knowledge kind (PG12+/Neon allow ADD VALUE in a tx as long
-- as the value is not used in the same transaction; it is not here).
ALTER TYPE "KnowledgeSourceKind" ADD VALUE IF NOT EXISTS 'help_doc';

ALTER TABLE "KnowledgeSource"
    ADD COLUMN "roleAccess" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

ALTER TABLE "User"
    ADD COLUMN "lastLoginAt" TIMESTAMP(3);

CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL');
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'FAILED', 'SUPPRESSED');
CREATE TYPE "DigestFrequency" AS ENUM ('OFF', 'DAILY', 'WEEKLY');

CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "recipientUserId" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "ctaLabel" TEXT,
    "ctaHref" TEXT,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "actorUserId" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Notification_recipientUserId_sourceType_sourceId_kind_key"
    ON "Notification"("recipientUserId", "sourceType", "sourceId", "kind");
CREATE INDEX "Notification_recipientUserId_readAt_idx"
    ON "Notification"("recipientUserId", "readAt");
CREATE INDEX "Notification_audience_idx" ON "Notification"("audience");

CREATE TABLE "NotificationDelivery" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "sentAt" TIMESTAMP(3),
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NotificationDelivery_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationDelivery_notificationId_channel_key"
    ON "NotificationDelivery"("notificationId", "channel");
CREATE INDEX "NotificationDelivery_status_idx" ON "NotificationDelivery"("status");

CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "quietHoursStart" INTEGER,
    "quietHoursEnd" INTEGER,
    "timezone" TEXT NOT NULL DEFAULT 'America/New_York',
    "digestFrequency" "DigestFrequency" NOT NULL DEFAULT 'OFF',
    "kindOptOuts" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "NotificationPreference_userId_key" ON "NotificationPreference"("userId");

CREATE TABLE "NudgeEvent" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "recipientUserId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "sourceType" TEXT,
    "sourceId" TEXT,
    "manual" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "NudgeEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "NudgeEvent_recipientUserId_createdAt_idx" ON "NudgeEvent"("recipientUserId", "createdAt");
CREATE INDEX "NudgeEvent_actorUserId_createdAt_idx" ON "NudgeEvent"("actorUserId", "createdAt");

CREATE TABLE "EngagementQuarter" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "quarter" TEXT NOT NULL,
    "targetPercent" INTEGER NOT NULL DEFAULT 100,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "EngagementQuarter_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EngagementQuarter_companyId_quarter_key" ON "EngagementQuarter"("companyId", "quarter");
CREATE INDEX "EngagementQuarter_dueDate_idx" ON "EngagementQuarter"("dueDate");

ALTER TABLE "Notification"
    ADD CONSTRAINT "Notification_recipientUserId_fkey"
    FOREIGN KEY ("recipientUserId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NotificationDelivery"
    ADD CONSTRAINT "NotificationDelivery_notificationId_fkey"
    FOREIGN KEY ("notificationId") REFERENCES "Notification"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "NotificationPreference"
    ADD CONSTRAINT "NotificationPreference_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
