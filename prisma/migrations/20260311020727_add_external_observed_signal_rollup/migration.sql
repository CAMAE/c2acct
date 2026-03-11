-- CreateTable
CREATE TABLE "ExternalObservedSignalRollup" (
    "id" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "subjectCompanyId" TEXT NOT NULL,
    "subjectProductId" TEXT,
    "reviewCount" INTEGER NOT NULL,
    "scoreAvg" DOUBLE PRECISION,
    "weightedAvgAvg" DOUBLE PRECISION,
    "signalIntegrityAvg" DOUBLE PRECISION,
    "latestReviewAt" TIMESTAMP(3),
    "rollupVersion" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalObservedSignalRollup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ExternalObservedSignalRollup_subjectCompanyId_subjectProduc_idx" ON "ExternalObservedSignalRollup"("subjectCompanyId", "subjectProductId");

-- CreateIndex
CREATE INDEX "ExternalObservedSignalRollup_moduleId_latestReviewAt_idx" ON "ExternalObservedSignalRollup"("moduleId", "latestReviewAt");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalObservedSignalRollup_moduleId_subjectCompanyId_subj_key" ON "ExternalObservedSignalRollup"("moduleId", "subjectCompanyId", "subjectProductId", "rollupVersion");

-- AddForeignKey
ALTER TABLE "ExternalObservedSignalRollup" ADD CONSTRAINT "ExternalObservedSignalRollup_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "SurveyModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalObservedSignalRollup" ADD CONSTRAINT "ExternalObservedSignalRollup_subjectCompanyId_fkey" FOREIGN KEY ("subjectCompanyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalObservedSignalRollup" ADD CONSTRAINT "ExternalObservedSignalRollup_subjectProductId_fkey" FOREIGN KEY ("subjectProductId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
