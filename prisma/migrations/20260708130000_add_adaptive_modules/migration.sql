-- Adaptive firm modules schema (Sprint 4 M1, 2026-07-08).
-- Per PATALIGN-ADAPTIVE-MODULES-SPEC + PATALIGN-MODULE-METHODOLOGY-OUTLINE.
-- Additive only: four new tables + five enums. Nothing serves to customers
-- until reviewStatus = APPROVED (two-signature CPA + clarity gate), and no
-- ModuleItem may serve without a ModuleSource row (sourced-content bar).

CREATE TYPE "ModuleType" AS ENUM ('DIAGNOSTIC', 'STRENGTH', 'REMEDIATION');

CREATE TYPE "ModuleReviewStatus" AS ENUM ('DRAFT', 'CLARITY_REVIEW', 'CPA_REVIEW', 'APPROVED', 'RETIRED');

CREATE TYPE "ModuleItemKind" AS ENUM ('ENTRY', 'REVIEW', 'FINAL');

CREATE TYPE "ModuleDifficulty" AS ENUM ('EASY', 'MODERATE', 'HARD');

CREATE TYPE "ModuleSourceLicense" AS ENUM ('PUBLIC_DOMAIN', 'CITED', 'LICENSED');

CREATE TABLE "ModuleTemplate" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "targetPattern" TEXT NOT NULL,
    "moduleType" "ModuleType" NOT NULL,
    "title" TEXT NOT NULL,
    "objectives" JSONB,
    "reviewStatus" "ModuleReviewStatus" NOT NULL DEFAULT 'DRAFT',
    "cpaReviewedBy" TEXT,
    "cpaReviewedAt" TIMESTAMP(3),
    "clarityReviewedBy" TEXT,
    "clarityReviewedAt" TIMESTAMP(3),
    "verticalId" TEXT NOT NULL DEFAULT 'accounting',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ModuleTemplate_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ModuleTemplate_key_key" ON "ModuleTemplate"("key");
CREATE INDEX "ModuleTemplate_category_idx" ON "ModuleTemplate"("category");
CREATE INDEX "ModuleTemplate_moduleType_reviewStatus_idx" ON "ModuleTemplate"("moduleType", "reviewStatus");
CREATE INDEX "ModuleTemplate_verticalId_idx" ON "ModuleTemplate"("verticalId");

CREATE TABLE "ModuleItem" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "itemKind" "ModuleItemKind" NOT NULL,
    "difficulty" "ModuleDifficulty" NOT NULL,
    "isAnchor" BOOLEAN NOT NULL DEFAULT false,
    "stem" TEXT NOT NULL,
    "choices" JSONB NOT NULL,
    "correctKey" TEXT NOT NULL,
    "feedback" JSONB,
    "discriminationSeed" DOUBLE PRECISION NOT NULL DEFAULT 0.3,
    "pValueSeed" DOUBLE PRECISION,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ModuleItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ModuleItem_key_key" ON "ModuleItem"("key");
CREATE INDEX "ModuleItem_templateId_itemKind_idx" ON "ModuleItem"("templateId", "itemKind");
CREATE INDEX "ModuleItem_category_idx" ON "ModuleItem"("category");
CREATE INDEX "ModuleItem_difficulty_idx" ON "ModuleItem"("difficulty");

CREATE TABLE "ModuleSource" (
    "id" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "sourceOrg" TEXT NOT NULL,
    "sourceDoc" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "licenseType" "ModuleSourceLicense" NOT NULL,
    "accessedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ModuleSource_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ModuleSource_itemId_idx" ON "ModuleSource"("itemId");
CREATE INDEX "ModuleSource_licenseType_idx" ON "ModuleSource"("licenseType");

CREATE TABLE "ModuleUnlockRule" (
    "id" TEXT NOT NULL,
    "patternSubset" TEXT NOT NULL,
    "templateId" TEXT NOT NULL,
    "quarterOffset" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ModuleUnlockRule_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ModuleUnlockRule_patternSubset_templateId_key" ON "ModuleUnlockRule"("patternSubset", "templateId");
CREATE INDEX "ModuleUnlockRule_templateId_idx" ON "ModuleUnlockRule"("templateId");

ALTER TABLE "ModuleItem"
    ADD CONSTRAINT "ModuleItem_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "ModuleTemplate"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ModuleSource"
    ADD CONSTRAINT "ModuleSource_itemId_fkey"
    FOREIGN KEY ("itemId") REFERENCES "ModuleItem"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ModuleUnlockRule"
    ADD CONSTRAINT "ModuleUnlockRule_templateId_fkey"
    FOREIGN KEY ("templateId") REFERENCES "ModuleTemplate"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
