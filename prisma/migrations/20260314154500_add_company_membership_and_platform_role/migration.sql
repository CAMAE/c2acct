CREATE TYPE "MembershipStatus" AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TYPE "PlatformRole" AS ENUM ('NONE', 'PLATFORM_ADMIN', 'PLATFORM_OWNER');

ALTER TABLE "User"
ADD COLUMN "platformRole" "PlatformRole" NOT NULL DEFAULT 'NONE';

CREATE TABLE "CompanyMembership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyMembership_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CompanyMembership_userId_companyId_key"
ON "CompanyMembership"("userId", "companyId");

CREATE INDEX "CompanyMembership_companyId_status_idx"
ON "CompanyMembership"("companyId", "status");

CREATE INDEX "CompanyMembership_userId_status_idx"
ON "CompanyMembership"("userId", "status");

ALTER TABLE "CompanyMembership"
ADD CONSTRAINT "CompanyMembership_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CompanyMembership"
ADD CONSTRAINT "CompanyMembership_companyId_fkey"
FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "CompanyMembership" ("id", "userId", "companyId", "role", "status", "createdAt", "updatedAt")
SELECT
  'cm:' || u."id" || ':' || u."companyId",
  u."id",
  u."companyId",
  u."role",
  'ACTIVE'::"MembershipStatus",
  COALESCE(u."createdAt", CURRENT_TIMESTAMP),
  CURRENT_TIMESTAMP
FROM "User" AS u
WHERE u."companyId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "CompanyMembership" AS cm
    WHERE cm."userId" = u."id"
      AND cm."companyId" = u."companyId"
  );
