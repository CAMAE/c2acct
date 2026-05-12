-- CreateEnum
CREATE TYPE "SubjectKind" AS ENUM ('ORGANIZATION', 'PRODUCT', 'PERSON', 'PORTAL');

-- CreateEnum
CREATE TYPE "SubjectMembershipRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'REVIEWER');

-- AlterTable
ALTER TABLE "CompanyBadge" ADD COLUMN     "subjectId" TEXT;

-- AlterTable
ALTER TABLE "SurveySubmission" ADD COLUMN     "subjectId" TEXT;

-- CreateTable
CREATE TABLE "Portal" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subjectKind" "SubjectKind",
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Portal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "kind" "SubjectKind" NOT NULL,
    "companyId" TEXT,
    "productId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubjectMembership" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "membershipRole" "SubjectMembershipRole" NOT NULL DEFAULT 'MEMBER',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubjectMembership_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Portal_key_key" ON "Portal"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_key_key" ON "Subject"("key");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_companyId_key" ON "Subject"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_productId_key" ON "Subject"("productId");

-- CreateIndex
CREATE INDEX "SubjectMembership_subjectId_active_idx" ON "SubjectMembership"("subjectId", "active");

-- CreateIndex
CREATE INDEX "SubjectMembership_userId_active_isPrimary_idx" ON "SubjectMembership"("userId", "active", "isPrimary");

-- CreateIndex
CREATE UNIQUE INDEX "SubjectMembership_subjectId_userId_key" ON "SubjectMembership"("subjectId", "userId");

-- CreateIndex
CREATE INDEX "CompanyBadge_subjectId_idx" ON "CompanyBadge"("subjectId");

-- CreateIndex
CREATE INDEX "SurveySubmission_subjectId_moduleId_createdAt_idx" ON "SurveySubmission"("subjectId", "moduleId", "createdAt");

-- AddForeignKey
ALTER TABLE "CompanyBadge" ADD CONSTRAINT "CompanyBadge_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectMembership" ADD CONSTRAINT "SubjectMembership_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectMembership" ADD CONSTRAINT "SubjectMembership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SurveySubmission" ADD CONSTRAINT "SurveySubmission_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

