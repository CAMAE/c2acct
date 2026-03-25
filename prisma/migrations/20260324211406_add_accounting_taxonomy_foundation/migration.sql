-- CreateEnum
CREATE TYPE "ProductDeploymentModel" AS ENUM ('CLOUD', 'DESKTOP', 'HYBRID', 'MANAGED_SERVICE');

-- CreateEnum
CREATE TYPE "ProductTaxonomyFit" AS ENUM ('PRIMARY', 'SECONDARY', 'ADJACENT');

-- CreateEnum
CREATE TYPE "ProductCapabilityCoverage" AS ENUM ('CORE', 'SUPPORTING', 'ADJACENT');

-- CreateEnum
CREATE TYPE "ResearchConfidence" AS ENUM ('UNKNOWN', 'LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ResearchSourceType" AS ENUM ('MANUAL_TAXONOMY', 'SPREADSHEET', 'CSV', 'INTERVIEW', 'WEB_RESEARCH');

-- CreateEnum
CREATE TYPE "ResearchSourceStatus" AS ENUM ('PENDING', 'STAGED', 'IMPORTED', 'SEEDED', 'REVIEW_REQUIRED');

-- CreateEnum
CREATE TYPE "TaxonomyBucketKind" AS ENUM ('FUNCTION', 'WORKFLOW_STAGE', 'COMPLIANCE_DOMAIN', 'DELIVERY_MODEL');

-- CreateEnum
CREATE TYPE "VendorStatus" AS ENUM ('ACTIVE', 'EMERGING', 'DISPLACED', 'UNKNOWN');

-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_companyId_fkey";

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "deploymentModel" "ProductDeploymentModel",
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "summary" TEXT,
ADD COLUMN     "vendorId" TEXT,
ADD COLUMN     "website" TEXT,
ALTER COLUMN "companyId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "VendorProfile" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "companyId" TEXT,
    "subjectId" TEXT,
    "website" TEXT,
    "status" "VendorStatus" NOT NULL DEFAULT 'ACTIVE',
    "researchStatus" "ResearchSourceStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ResearchSource" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sourceType" "ResearchSourceType" NOT NULL,
    "status" "ResearchSourceStatus" NOT NULL DEFAULT 'PENDING',
    "artifactPath" TEXT,
    "notes" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResearchSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxonomyBucket" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "kind" "TaxonomyBucketKind" NOT NULL,
    "parentId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxonomyBucket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductTaxonomyAssignment" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "bucketId" TEXT NOT NULL,
    "fit" "ProductTaxonomyFit" NOT NULL DEFAULT 'PRIMARY',
    "confidence" "ResearchConfidence" NOT NULL DEFAULT 'UNKNOWN',
    "sourceId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductTaxonomyAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TaxonomyBucketCapability" (
    "id" TEXT NOT NULL,
    "bucketId" TEXT NOT NULL,
    "nodeId" TEXT,
    "capabilityKey" TEXT NOT NULL,
    "coverage" "ProductCapabilityCoverage" NOT NULL DEFAULT 'SUPPORTING',
    "confidence" "ResearchConfidence" NOT NULL DEFAULT 'UNKNOWN',
    "sourceId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TaxonomyBucketCapability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductCapabilityMap" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "nodeId" TEXT,
    "capabilityKey" TEXT NOT NULL,
    "coverage" "ProductCapabilityCoverage" NOT NULL DEFAULT 'CORE',
    "confidence" "ResearchConfidence" NOT NULL DEFAULT 'UNKNOWN',
    "sourceId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCapabilityMap_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VendorSignal" (
    "id" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "signalKey" TEXT NOT NULL,
    "valueText" TEXT,
    "valueNumber" DOUBLE PRECISION,
    "confidence" "ResearchConfidence" NOT NULL DEFAULT 'UNKNOWN',
    "sourceId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VendorSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductSignal" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "signalKey" TEXT NOT NULL,
    "valueText" TEXT,
    "valueNumber" DOUBLE PRECISION,
    "confidence" "ResearchConfidence" NOT NULL DEFAULT 'UNKNOWN',
    "sourceId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductSignal_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VendorProfile_key_key" ON "VendorProfile"("key");

-- CreateIndex
CREATE UNIQUE INDEX "VendorProfile_companyId_key" ON "VendorProfile"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorProfile_subjectId_key" ON "VendorProfile"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "ResearchSource_key_key" ON "ResearchSource"("key");

-- CreateIndex
CREATE UNIQUE INDEX "TaxonomyBucket_key_key" ON "TaxonomyBucket"("key");

-- CreateIndex
CREATE INDEX "TaxonomyBucket_kind_idx" ON "TaxonomyBucket"("kind");

-- CreateIndex
CREATE INDEX "TaxonomyBucket_parentId_idx" ON "TaxonomyBucket"("parentId");

-- CreateIndex
CREATE INDEX "ProductTaxonomyAssignment_bucketId_fit_idx" ON "ProductTaxonomyAssignment"("bucketId", "fit");

-- CreateIndex
CREATE INDEX "ProductTaxonomyAssignment_sourceId_idx" ON "ProductTaxonomyAssignment"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductTaxonomyAssignment_productId_bucketId_key" ON "ProductTaxonomyAssignment"("productId", "bucketId");

-- CreateIndex
CREATE INDEX "TaxonomyBucketCapability_nodeId_idx" ON "TaxonomyBucketCapability"("nodeId");

-- CreateIndex
CREATE INDEX "TaxonomyBucketCapability_sourceId_idx" ON "TaxonomyBucketCapability"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "TaxonomyBucketCapability_bucketId_capabilityKey_key" ON "TaxonomyBucketCapability"("bucketId", "capabilityKey");

-- CreateIndex
CREATE INDEX "ProductCapabilityMap_nodeId_idx" ON "ProductCapabilityMap"("nodeId");

-- CreateIndex
CREATE INDEX "ProductCapabilityMap_sourceId_idx" ON "ProductCapabilityMap"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCapabilityMap_productId_capabilityKey_key" ON "ProductCapabilityMap"("productId", "capabilityKey");

-- CreateIndex
CREATE INDEX "VendorSignal_sourceId_idx" ON "VendorSignal"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "VendorSignal_vendorId_signalKey_key" ON "VendorSignal"("vendorId", "signalKey");

-- CreateIndex
CREATE INDEX "ProductSignal_sourceId_idx" ON "ProductSignal"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductSignal_productId_signalKey_key" ON "ProductSignal"("productId", "signalKey");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_vendorId_idx" ON "Product"("vendorId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorProfile" ADD CONSTRAINT "VendorProfile_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorProfile" ADD CONSTRAINT "VendorProfile_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxonomyBucket" ADD CONSTRAINT "TaxonomyBucket_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "TaxonomyBucket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTaxonomyAssignment" ADD CONSTRAINT "ProductTaxonomyAssignment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTaxonomyAssignment" ADD CONSTRAINT "ProductTaxonomyAssignment_bucketId_fkey" FOREIGN KEY ("bucketId") REFERENCES "TaxonomyBucket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductTaxonomyAssignment" ADD CONSTRAINT "ProductTaxonomyAssignment_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ResearchSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxonomyBucketCapability" ADD CONSTRAINT "TaxonomyBucketCapability_bucketId_fkey" FOREIGN KEY ("bucketId") REFERENCES "TaxonomyBucket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxonomyBucketCapability" ADD CONSTRAINT "TaxonomyBucketCapability_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "CapabilityNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TaxonomyBucketCapability" ADD CONSTRAINT "TaxonomyBucketCapability_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ResearchSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCapabilityMap" ADD CONSTRAINT "ProductCapabilityMap_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCapabilityMap" ADD CONSTRAINT "ProductCapabilityMap_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "CapabilityNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductCapabilityMap" ADD CONSTRAINT "ProductCapabilityMap_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ResearchSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorSignal" ADD CONSTRAINT "VendorSignal_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VendorSignal" ADD CONSTRAINT "VendorSignal_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ResearchSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSignal" ADD CONSTRAINT "ProductSignal_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductSignal" ADD CONSTRAINT "ProductSignal_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "ResearchSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;

