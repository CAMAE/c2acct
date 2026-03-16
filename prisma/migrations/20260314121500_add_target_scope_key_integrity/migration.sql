ALTER TABLE "CompanyBadge"
ADD COLUMN "targetScopeKey" TEXT;

ALTER TABLE "CompanyCapabilityScore"
ADD COLUMN "targetScopeKey" TEXT;

ALTER TABLE "ExternalObservedSignalRollup"
ADD COLUMN "targetScopeKey" TEXT;

UPDATE "CompanyBadge"
SET "targetScopeKey" = CASE
  WHEN "productId" IS NULL THEN 'company:' || "companyId"
  ELSE 'company:' || "companyId" || ':product:' || "productId"
END
WHERE "targetScopeKey" IS NULL;

UPDATE "CompanyCapabilityScore"
SET "targetScopeKey" = CASE
  WHEN "productId" IS NULL THEN 'company:' || "companyId"
  ELSE 'company:' || "companyId" || ':product:' || "productId"
END
WHERE "targetScopeKey" IS NULL;

UPDATE "ExternalObservedSignalRollup"
SET "targetScopeKey" = CASE
  WHEN "subjectProductId" IS NULL THEN 'company:' || "subjectCompanyId"
  ELSE 'company:' || "subjectCompanyId" || ':product:' || "subjectProductId"
END
WHERE "targetScopeKey" IS NULL;

WITH ranked_badges AS (
  SELECT
    "id",
    FIRST_VALUE("id") OVER (
      PARTITION BY "targetScopeKey", "badgeId", "moduleId"
      ORDER BY "awardedAt" ASC, "id" ASC
    ) AS keep_id,
    ROW_NUMBER() OVER (
      PARTITION BY "targetScopeKey", "badgeId", "moduleId"
      ORDER BY "awardedAt" ASC, "id" ASC
    ) AS row_number
  FROM "CompanyBadge"
),
duplicate_badges AS (
  SELECT "id", keep_id
  FROM ranked_badges
  WHERE row_number > 1
)
UPDATE "UnlockEvidence" AS ue
SET "companyBadgeId" = db.keep_id
FROM duplicate_badges AS db
WHERE ue."companyBadgeId" = db."id";

WITH ranked_badges AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "targetScopeKey", "badgeId", "moduleId"
      ORDER BY "awardedAt" ASC, "id" ASC
    ) AS row_number
  FROM "CompanyBadge"
)
DELETE FROM "CompanyBadge" AS cb
USING ranked_badges AS rb
WHERE cb."id" = rb."id"
  AND rb.row_number > 1;

WITH ranked_rollups AS (
  SELECT
    "id",
    FIRST_VALUE("id") OVER (
      PARTITION BY "targetScopeKey", "moduleId", "rollupVersion"
      ORDER BY "updatedAt" DESC, "createdAt" DESC, "id" DESC
    ) AS keep_id,
    ROW_NUMBER() OVER (
      PARTITION BY "targetScopeKey", "moduleId", "rollupVersion"
      ORDER BY "updatedAt" DESC, "createdAt" DESC, "id" DESC
    ) AS row_number
  FROM "ExternalObservedSignalRollup"
),
duplicate_rollups AS (
  SELECT "id", keep_id
  FROM ranked_rollups
  WHERE row_number > 1
)
UPDATE "CompanyCapabilityScore" AS ccs
SET "externalObservedSignalRollupId" = dr.keep_id
FROM duplicate_rollups AS dr
WHERE ccs."externalObservedSignalRollupId" = dr."id";

WITH ranked_rollups AS (
  SELECT
    "id",
    FIRST_VALUE("id") OVER (
      PARTITION BY "targetScopeKey", "moduleId", "rollupVersion"
      ORDER BY "updatedAt" DESC, "createdAt" DESC, "id" DESC
    ) AS keep_id,
    ROW_NUMBER() OVER (
      PARTITION BY "targetScopeKey", "moduleId", "rollupVersion"
      ORDER BY "updatedAt" DESC, "createdAt" DESC, "id" DESC
    ) AS row_number
  FROM "ExternalObservedSignalRollup"
),
duplicate_rollups AS (
  SELECT "id", keep_id
  FROM ranked_rollups
  WHERE row_number > 1
)
UPDATE "UnlockEvidence" AS ue
SET "externalObservedSignalRollupId" = dr.keep_id
FROM duplicate_rollups AS dr
WHERE ue."externalObservedSignalRollupId" = dr."id";

WITH ranked_rollups AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "targetScopeKey", "moduleId", "rollupVersion"
      ORDER BY "updatedAt" DESC, "createdAt" DESC, "id" DESC
    ) AS row_number
  FROM "ExternalObservedSignalRollup"
)
DELETE FROM "ExternalObservedSignalRollup" AS eosr
USING ranked_rollups AS rr
WHERE eosr."id" = rr."id"
  AND rr.row_number > 1;

WITH ranked_capability_scores AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "targetScopeKey", "moduleId", "nodeId", "scoreVersion", "sourceType"
      ORDER BY "computedAt" DESC, "id" DESC
    ) AS row_number
  FROM "CompanyCapabilityScore"
)
DELETE FROM "CompanyCapabilityScore" AS ccs
USING ranked_capability_scores AS rcs
WHERE ccs."id" = rcs."id"
  AND rcs.row_number > 1;

ALTER TABLE "CompanyBadge"
ALTER COLUMN "targetScopeKey" SET NOT NULL;

ALTER TABLE "CompanyCapabilityScore"
ALTER COLUMN "targetScopeKey" SET NOT NULL;

ALTER TABLE "ExternalObservedSignalRollup"
ALTER COLUMN "targetScopeKey" SET NOT NULL;

DROP INDEX IF EXISTS "CompanyBadge_companyId_productId_badgeId_moduleId_key";
DROP INDEX IF EXISTS "CompanyCapabilityScore_companyId_productId_moduleId_nodeId_scoreVersion_sourceType_key";
DROP INDEX IF EXISTS "ExternalObservedSignalRollup_moduleId_subjectCompanyId_subjectProductId_rollupVersion_key";

CREATE INDEX "CompanyBadge_targetScopeKey_idx" ON "CompanyBadge"("targetScopeKey");
CREATE UNIQUE INDEX "CompanyBadge_targetScopeKey_badgeId_moduleId_key"
ON "CompanyBadge"("targetScopeKey", "badgeId", "moduleId");

CREATE INDEX "CompanyCapabilityScore_targetScopeKey_idx" ON "CompanyCapabilityScore"("targetScopeKey");
CREATE UNIQUE INDEX "CompanyCapabilityScore_targetScopeKey_moduleId_nodeId_scoreVersion_sourceType_key"
ON "CompanyCapabilityScore"("targetScopeKey", "moduleId", "nodeId", "scoreVersion", "sourceType");

CREATE INDEX "ExternalObservedSignalRollup_targetScopeKey_idx"
ON "ExternalObservedSignalRollup"("targetScopeKey");
CREATE UNIQUE INDEX "ExternalObservedSignalRollup_targetScopeKey_moduleId_rollupVersion_key"
ON "ExternalObservedSignalRollup"("targetScopeKey", "moduleId", "rollupVersion");
