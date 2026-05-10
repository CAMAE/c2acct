-- Phase 4 — BriefEditChoice schema for bounded consultant edits. PAT 5.7
-- plan, Day 15. Per Brief Mocks v2.1 §8 decision #13: consultant edit role
-- is bounded to three choice types (PHRASING_VARIANT, EMPHASIS, ORDERING) —
-- no free-text input, no rewriting. Schema lands today so Day-17's API +
-- UI work doesn't block on migration. No reads from this table on Day 15;
-- it's pure scaffold.
--
-- Migration is additive: no existing tables modified except the inverse
-- relation to ConsultantProfile, which is a no-op at the SQL layer
-- (Prisma tracks it via the relation FK on this side only).

-- 1. Create the enum.

CREATE TYPE "BriefEditChoiceType" AS ENUM ('PHRASING_VARIANT', 'EMPHASIS', 'ORDERING');

-- 2. Create the table.

CREATE TABLE "BriefEditChoice" (
    "id" TEXT NOT NULL,
    "briefId" TEXT NOT NULL,
    "sectionKey" TEXT NOT NULL,
    "choiceType" "BriefEditChoiceType" NOT NULL,
    "choiceValue" TEXT NOT NULL,
    "consultantProfileId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BriefEditChoice_pkey" PRIMARY KEY ("id")
);

-- 3. Indexes.

CREATE UNIQUE INDEX "BriefEditChoice_briefId_sectionKey_consultantProfileId_choiceType_key"
    ON "BriefEditChoice"("briefId", "sectionKey", "consultantProfileId", "choiceType");

CREATE INDEX "BriefEditChoice_briefId_idx" ON "BriefEditChoice"("briefId");

CREATE INDEX "BriefEditChoice_consultantProfileId_idx" ON "BriefEditChoice"("consultantProfileId");

-- 4. Foreign keys.

ALTER TABLE "BriefEditChoice"
    ADD CONSTRAINT "BriefEditChoice_consultantProfileId_fkey"
    FOREIGN KEY ("consultantProfileId") REFERENCES "ConsultantProfile"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
