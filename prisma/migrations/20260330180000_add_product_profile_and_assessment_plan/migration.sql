-- CreateEnum
CREATE TYPE "ProductAssessmentPerspective" AS ENUM ('VENDOR', 'FIRM', 'INDIVIDUAL');

-- CreateTable
CREATE TABLE "ProductProfile" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "logoUrl" TEXT,
    "logoAssetRef" TEXT,
    "positioning" TEXT,
    "targetCustomer" TEXT,
    "targetUseContext" TEXT,
    "implementationStyle" TEXT,
    "operatingModelFit" TEXT,
    "primaryBuyer" TEXT,
    "integrationPosture" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductAssessmentPlan" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "perspective" "ProductAssessmentPerspective" NOT NULL,
    "registryVersion" TEXT NOT NULL,
    "selectedUtilityKeys" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "generatedQuestionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "profileQuestionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "scoredQuestionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "openEndedQuestionIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "moduleOrder" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "modulePlan" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductAssessmentPlan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductProfile_productId_key" ON "ProductProfile"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductAssessmentPlan_productId_perspective_key" ON "ProductAssessmentPlan"("productId", "perspective");

-- CreateIndex
CREATE INDEX "ProductAssessmentPlan_perspective_idx" ON "ProductAssessmentPlan"("perspective");

-- CreateIndex
CREATE INDEX "ProductAssessmentPlan_productId_idx" ON "ProductAssessmentPlan"("productId");

-- AddForeignKey
ALTER TABLE "ProductProfile" ADD CONSTRAINT "ProductProfile_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductAssessmentPlan" ADD CONSTRAINT "ProductAssessmentPlan_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
