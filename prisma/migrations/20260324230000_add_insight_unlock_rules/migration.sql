-- CreateTable
CREATE TABLE "InsightUnlockRule" (
    "id" TEXT NOT NULL,
    "insightId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsightUnlockRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InsightUnlockRule_insightId_badgeId_key" ON "InsightUnlockRule"("insightId", "badgeId");

-- CreateIndex
CREATE INDEX "InsightUnlockRule_insightId_idx" ON "InsightUnlockRule"("insightId");

-- CreateIndex
CREATE INDEX "InsightUnlockRule_badgeId_idx" ON "InsightUnlockRule"("badgeId");

-- AddForeignKey
ALTER TABLE "InsightUnlockRule" ADD CONSTRAINT "InsightUnlockRule_insightId_fkey" FOREIGN KEY ("insightId") REFERENCES "Insight"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsightUnlockRule" ADD CONSTRAINT "InsightUnlockRule_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "Badge"("id") ON DELETE CASCADE ON UPDATE CASCADE;
