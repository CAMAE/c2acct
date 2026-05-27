CREATE TABLE "RateLimitBucket" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "resetAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RateLimitBucket_scope_keyHash_key" ON "RateLimitBucket"("scope", "keyHash");

CREATE INDEX "RateLimitBucket_scope_resetAt_idx" ON "RateLimitBucket"("scope", "resetAt");
