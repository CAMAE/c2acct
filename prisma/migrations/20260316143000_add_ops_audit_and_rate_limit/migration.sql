CREATE TABLE "ApiRateLimitBucket" (
    "id" TEXT NOT NULL,
    "bucketKey" TEXT NOT NULL,
    "windowStart" TIMESTAMP(3) NOT NULL,
    "windowMs" INTEGER NOT NULL,
    "requestCount" INTEGER NOT NULL DEFAULT 0,
    "lastRequestAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ApiRateLimitBucket_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "eventKey" TEXT NOT NULL,
    "eventCategory" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorCompanyId" TEXT,
    "subjectCompanyId" TEXT,
    "subjectProductId" TEXT,
    "requestPath" TEXT,
    "requestMethod" TEXT,
    "outcome" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'INFO',
    "detailsJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ApiRateLimitBucket_bucketKey_windowStart_windowMs_key"
ON "ApiRateLimitBucket"("bucketKey", "windowStart", "windowMs");

CREATE INDEX "ApiRateLimitBucket_bucketKey_lastRequestAt_idx"
ON "ApiRateLimitBucket"("bucketKey", "lastRequestAt");

CREATE INDEX "AuditEvent_eventCategory_createdAt_idx"
ON "AuditEvent"("eventCategory", "createdAt");

CREATE INDEX "AuditEvent_actorUserId_createdAt_idx"
ON "AuditEvent"("actorUserId", "createdAt");

CREATE INDEX "AuditEvent_actorCompanyId_createdAt_idx"
ON "AuditEvent"("actorCompanyId", "createdAt");

CREATE INDEX "AuditEvent_subjectCompanyId_createdAt_idx"
ON "AuditEvent"("subjectCompanyId", "createdAt");
