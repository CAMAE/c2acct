-- 3e Enterprise portal v0 (R51, 2026-09-25).
--
-- ADDITIVE ONLY. Two new tables, one nullable column on Company with its index
-- and foreign key, two indexes and one unique constraint. No existing column,
-- default, index, constraint or type is altered, renamed or dropped, and no row
-- is rewritten (Company.enterpriseId is NULL for every existing row).

-- CreateTable
CREATE TABLE "Enterprise" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Enterprise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnterpriseMembership" (
    "id" TEXT NOT NULL,
    "enterpriseId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EnterpriseMembership_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "Company" ADD COLUMN "enterpriseId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Enterprise_slug_key" ON "Enterprise"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "EnterpriseMembership_enterpriseId_userId_key" ON "EnterpriseMembership"("enterpriseId", "userId");

-- CreateIndex
CREATE INDEX "EnterpriseMembership_userId_idx" ON "EnterpriseMembership"("userId");

-- CreateIndex
CREATE INDEX "Company_enterpriseId_idx" ON "Company"("enterpriseId");

-- AddForeignKey
ALTER TABLE "Company" ADD CONSTRAINT "Company_enterpriseId_fkey" FOREIGN KEY ("enterpriseId") REFERENCES "Enterprise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseMembership" ADD CONSTRAINT "EnterpriseMembership_enterpriseId_fkey" FOREIGN KEY ("enterpriseId") REFERENCES "Enterprise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnterpriseMembership" ADD CONSTRAINT "EnterpriseMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
