/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `Company` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[companyId,slug]` on the table `Product` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "ProductKind" AS ENUM ('PLATFORM', 'SUITE', 'MODULE', 'POINT_SOLUTION', 'SERVICE');

-- AlterTable
ALTER TABLE "Company" ADD COLUMN     "externalStatus" TEXT,
ADD COLUMN     "hqCountry" TEXT,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "longDescription" TEXT,
ADD COLUMN     "primaryMarket" TEXT,
ADD COLUMN     "profileStatus" TEXT,
ADD COLUMN     "shortDescription" TEXT,
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "verticalKey" TEXT NOT NULL DEFAULT 'ACCOUNTING',
ADD COLUMN     "websiteUrl" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "externalStatus" TEXT,
ADD COLUMN     "logoUrl" TEXT,
ADD COLUMN     "longDescription" TEXT,
ADD COLUMN     "parentProductId" TEXT,
ADD COLUMN     "primaryMarket" TEXT,
ADD COLUMN     "productKind" "ProductKind" NOT NULL DEFAULT 'POINT_SOLUTION',
ADD COLUMN     "profileStatus" TEXT,
ADD COLUMN     "shortDescription" TEXT,
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "verticalKey" TEXT NOT NULL DEFAULT 'ACCOUNTING',
ADD COLUMN     "websiteUrl" TEXT;

-- CreateTable
CREATE TABLE "OrganizationContact" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "email" TEXT,
    "contactRole" TEXT,
    "source" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalProfileLink" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "externalEntityType" TEXT NOT NULL,
    "externalRecordId" TEXT NOT NULL,
    "externalSlug" TEXT,
    "canonicalUrl" TEXT,
    "companyId" TEXT,
    "productId" TEXT,
    "claimStatus" TEXT,
    "syncMode" TEXT,
    "lastSyncedAt" TIMESTAMP(3),
    "rawSnapshotJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalProfileLink_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OrganizationContact_companyId_idx" ON "OrganizationContact"("companyId");

-- CreateIndex
CREATE INDEX "OrganizationContact_email_idx" ON "OrganizationContact"("email");

-- CreateIndex
CREATE INDEX "ExternalProfileLink_companyId_idx" ON "ExternalProfileLink"("companyId");

-- CreateIndex
CREATE INDEX "ExternalProfileLink_productId_idx" ON "ExternalProfileLink"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalProfileLink_source_externalEntityType_externalRecor_key" ON "ExternalProfileLink"("source", "externalEntityType", "externalRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");

-- CreateIndex
CREATE INDEX "Product_parentProductId_idx" ON "Product"("parentProductId");

-- CreateIndex
CREATE UNIQUE INDEX "Product_companyId_slug_key" ON "Product"("companyId", "slug");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_parentProductId_fkey" FOREIGN KEY ("parentProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationContact" ADD CONSTRAINT "OrganizationContact_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalProfileLink" ADD CONSTRAINT "ExternalProfileLink_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalProfileLink" ADD CONSTRAINT "ExternalProfileLink_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
