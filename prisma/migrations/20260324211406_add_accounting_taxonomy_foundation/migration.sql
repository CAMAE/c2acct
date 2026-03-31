-- This migration must be safe to re-run on drifted local PostgreSQL databases.
-- Some local environments already have part of the accounting taxonomy layer,
-- including Product.slug, before this migration is recorded as fully applied.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProductDeploymentModel') THEN
    CREATE TYPE "ProductDeploymentModel" AS ENUM ('CLOUD', 'DESKTOP', 'HYBRID', 'MANAGED_SERVICE');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProductTaxonomyFit') THEN
    CREATE TYPE "ProductTaxonomyFit" AS ENUM ('PRIMARY', 'SECONDARY', 'ADJACENT');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProductCapabilityCoverage') THEN
    CREATE TYPE "ProductCapabilityCoverage" AS ENUM ('CORE', 'SUPPORTING', 'ADJACENT');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ResearchConfidence') THEN
    CREATE TYPE "ResearchConfidence" AS ENUM ('UNKNOWN', 'LOW', 'MEDIUM', 'HIGH');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ResearchSourceType') THEN
    CREATE TYPE "ResearchSourceType" AS ENUM ('MANUAL_TAXONOMY', 'SPREADSHEET', 'CSV', 'INTERVIEW', 'WEB_RESEARCH');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ResearchSourceStatus') THEN
    CREATE TYPE "ResearchSourceStatus" AS ENUM ('PENDING', 'STAGED', 'IMPORTED', 'SEEDED', 'REVIEW_REQUIRED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TaxonomyBucketKind') THEN
    CREATE TYPE "TaxonomyBucketKind" AS ENUM ('FUNCTION', 'WORKFLOW_STAGE', 'COMPLIANCE_DOMAIN', 'DELIVERY_MODEL');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'VendorStatus') THEN
    CREATE TYPE "VendorStatus" AS ENUM ('ACTIVE', 'EMERGING', 'DISPLACED', 'UNKNOWN');
  END IF;
END $$;

ALTER TABLE "Product" DROP CONSTRAINT IF EXISTS "Product_companyId_fkey";

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "active" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "deploymentModel" "ProductDeploymentModel";
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "slug" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "summary" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "vendorId" TEXT;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "website" TEXT;
ALTER TABLE "Product" ALTER COLUMN "companyId" DROP NOT NULL;

CREATE TABLE IF NOT EXISTS "VendorProfile" (
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

CREATE TABLE IF NOT EXISTS "ResearchSource" (
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

CREATE TABLE IF NOT EXISTS "TaxonomyBucket" (
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

CREATE TABLE IF NOT EXISTS "ProductTaxonomyAssignment" (
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

CREATE TABLE IF NOT EXISTS "TaxonomyBucketCapability" (
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

CREATE TABLE IF NOT EXISTS "ProductCapabilityMap" (
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

CREATE TABLE IF NOT EXISTS "VendorSignal" (
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

CREATE TABLE IF NOT EXISTS "ProductSignal" (
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

CREATE UNIQUE INDEX IF NOT EXISTS "VendorProfile_key_key" ON "VendorProfile"("key");
CREATE UNIQUE INDEX IF NOT EXISTS "VendorProfile_companyId_key" ON "VendorProfile"("companyId");
CREATE UNIQUE INDEX IF NOT EXISTS "VendorProfile_subjectId_key" ON "VendorProfile"("subjectId");
CREATE UNIQUE INDEX IF NOT EXISTS "ResearchSource_key_key" ON "ResearchSource"("key");
CREATE UNIQUE INDEX IF NOT EXISTS "TaxonomyBucket_key_key" ON "TaxonomyBucket"("key");
CREATE INDEX IF NOT EXISTS "TaxonomyBucket_kind_idx" ON "TaxonomyBucket"("kind");
CREATE INDEX IF NOT EXISTS "TaxonomyBucket_parentId_idx" ON "TaxonomyBucket"("parentId");
CREATE INDEX IF NOT EXISTS "ProductTaxonomyAssignment_bucketId_fit_idx" ON "ProductTaxonomyAssignment"("bucketId", "fit");
CREATE INDEX IF NOT EXISTS "ProductTaxonomyAssignment_sourceId_idx" ON "ProductTaxonomyAssignment"("sourceId");
CREATE UNIQUE INDEX IF NOT EXISTS "ProductTaxonomyAssignment_productId_bucketId_key" ON "ProductTaxonomyAssignment"("productId", "bucketId");
CREATE INDEX IF NOT EXISTS "TaxonomyBucketCapability_nodeId_idx" ON "TaxonomyBucketCapability"("nodeId");
CREATE INDEX IF NOT EXISTS "TaxonomyBucketCapability_sourceId_idx" ON "TaxonomyBucketCapability"("sourceId");
CREATE UNIQUE INDEX IF NOT EXISTS "TaxonomyBucketCapability_bucketId_capabilityKey_key" ON "TaxonomyBucketCapability"("bucketId", "capabilityKey");
CREATE INDEX IF NOT EXISTS "ProductCapabilityMap_nodeId_idx" ON "ProductCapabilityMap"("nodeId");
CREATE INDEX IF NOT EXISTS "ProductCapabilityMap_sourceId_idx" ON "ProductCapabilityMap"("sourceId");
CREATE UNIQUE INDEX IF NOT EXISTS "ProductCapabilityMap_productId_capabilityKey_key" ON "ProductCapabilityMap"("productId", "capabilityKey");
CREATE INDEX IF NOT EXISTS "VendorSignal_sourceId_idx" ON "VendorSignal"("sourceId");
CREATE UNIQUE INDEX IF NOT EXISTS "VendorSignal_vendorId_signalKey_key" ON "VendorSignal"("vendorId", "signalKey");
CREATE INDEX IF NOT EXISTS "ProductSignal_sourceId_idx" ON "ProductSignal"("sourceId");
CREATE UNIQUE INDEX IF NOT EXISTS "ProductSignal_productId_signalKey_key" ON "ProductSignal"("productId", "signalKey");
CREATE UNIQUE INDEX IF NOT EXISTS "Product_slug_key" ON "Product"("slug");
CREATE INDEX IF NOT EXISTS "Product_vendorId_idx" ON "Product"("vendorId");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Product_companyId_fkey') THEN
    ALTER TABLE "Product"
      ADD CONSTRAINT "Product_companyId_fkey"
      FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Product_vendorId_fkey') THEN
    ALTER TABLE "Product"
      ADD CONSTRAINT "Product_vendorId_fkey"
      FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VendorProfile_companyId_fkey') THEN
    ALTER TABLE "VendorProfile"
      ADD CONSTRAINT "VendorProfile_companyId_fkey"
      FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VendorProfile_subjectId_fkey') THEN
    ALTER TABLE "VendorProfile"
      ADD CONSTRAINT "VendorProfile_subjectId_fkey"
      FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TaxonomyBucket_parentId_fkey') THEN
    ALTER TABLE "TaxonomyBucket"
      ADD CONSTRAINT "TaxonomyBucket_parentId_fkey"
      FOREIGN KEY ("parentId") REFERENCES "TaxonomyBucket"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductTaxonomyAssignment_productId_fkey') THEN
    ALTER TABLE "ProductTaxonomyAssignment"
      ADD CONSTRAINT "ProductTaxonomyAssignment_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductTaxonomyAssignment_bucketId_fkey') THEN
    ALTER TABLE "ProductTaxonomyAssignment"
      ADD CONSTRAINT "ProductTaxonomyAssignment_bucketId_fkey"
      FOREIGN KEY ("bucketId") REFERENCES "TaxonomyBucket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductTaxonomyAssignment_sourceId_fkey') THEN
    ALTER TABLE "ProductTaxonomyAssignment"
      ADD CONSTRAINT "ProductTaxonomyAssignment_sourceId_fkey"
      FOREIGN KEY ("sourceId") REFERENCES "ResearchSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TaxonomyBucketCapability_bucketId_fkey') THEN
    ALTER TABLE "TaxonomyBucketCapability"
      ADD CONSTRAINT "TaxonomyBucketCapability_bucketId_fkey"
      FOREIGN KEY ("bucketId") REFERENCES "TaxonomyBucket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TaxonomyBucketCapability_nodeId_fkey') THEN
    ALTER TABLE "TaxonomyBucketCapability"
      ADD CONSTRAINT "TaxonomyBucketCapability_nodeId_fkey"
      FOREIGN KEY ("nodeId") REFERENCES "CapabilityNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'TaxonomyBucketCapability_sourceId_fkey') THEN
    ALTER TABLE "TaxonomyBucketCapability"
      ADD CONSTRAINT "TaxonomyBucketCapability_sourceId_fkey"
      FOREIGN KEY ("sourceId") REFERENCES "ResearchSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductCapabilityMap_productId_fkey') THEN
    ALTER TABLE "ProductCapabilityMap"
      ADD CONSTRAINT "ProductCapabilityMap_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductCapabilityMap_nodeId_fkey') THEN
    ALTER TABLE "ProductCapabilityMap"
      ADD CONSTRAINT "ProductCapabilityMap_nodeId_fkey"
      FOREIGN KEY ("nodeId") REFERENCES "CapabilityNode"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductCapabilityMap_sourceId_fkey') THEN
    ALTER TABLE "ProductCapabilityMap"
      ADD CONSTRAINT "ProductCapabilityMap_sourceId_fkey"
      FOREIGN KEY ("sourceId") REFERENCES "ResearchSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VendorSignal_vendorId_fkey') THEN
    ALTER TABLE "VendorSignal"
      ADD CONSTRAINT "VendorSignal_vendorId_fkey"
      FOREIGN KEY ("vendorId") REFERENCES "VendorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'VendorSignal_sourceId_fkey') THEN
    ALTER TABLE "VendorSignal"
      ADD CONSTRAINT "VendorSignal_sourceId_fkey"
      FOREIGN KEY ("sourceId") REFERENCES "ResearchSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductSignal_productId_fkey') THEN
    ALTER TABLE "ProductSignal"
      ADD CONSTRAINT "ProductSignal_productId_fkey"
      FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ProductSignal_sourceId_fkey') THEN
    ALTER TABLE "ProductSignal"
      ADD CONSTRAINT "ProductSignal_sourceId_fkey"
      FOREIGN KEY ("sourceId") REFERENCES "ResearchSource"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
