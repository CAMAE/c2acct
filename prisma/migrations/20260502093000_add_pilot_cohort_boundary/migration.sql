CREATE TYPE "DataBoundary" AS ENUM ('DEMO', 'PILOT', 'PRODUCTION');
CREATE TYPE "PilotCohortMemberKind" AS ENUM ('VENDOR', 'FIRM', 'USER');
CREATE TYPE "PilotProvisioningState" AS ENUM ('INVITED', 'PROVISIONING', 'ACTIVE', 'BLOCKED', 'ARCHIVED');

CREATE TABLE "PilotCohort" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dataBoundary" "DataBoundary" NOT NULL DEFAULT 'PILOT',
    "startsAt" TIMESTAMP(3),
    "ownerContactName" TEXT,
    "ownerContactEmail" TEXT,
    "supportContactName" TEXT,
    "supportContactEmail" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PilotCohort_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PilotCohortMember" (
    "id" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "memberKind" "PilotCohortMemberKind" NOT NULL,
    "dataBoundary" "DataBoundary" NOT NULL DEFAULT 'PILOT',
    "provisioningState" "PilotProvisioningState" NOT NULL DEFAULT 'INVITED',
    "companyId" TEXT,
    "subjectId" TEXT,
    "userId" TEXT,
    "inviteEmail" TEXT,
    "ownerContactName" TEXT,
    "ownerContactEmail" TEXT,
    "supportContactName" TEXT,
    "supportContactEmail" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PilotCohortMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PilotCohort_key_key" ON "PilotCohort"("key");
CREATE INDEX "PilotCohort_dataBoundary_idx" ON "PilotCohort"("dataBoundary");
CREATE INDEX "PilotCohort_startsAt_idx" ON "PilotCohort"("startsAt");
CREATE UNIQUE INDEX "PilotCohortMember_cohortId_memberKind_companyId_key" ON "PilotCohortMember"("cohortId", "memberKind", "companyId");
CREATE UNIQUE INDEX "PilotCohortMember_cohortId_memberKind_userId_key" ON "PilotCohortMember"("cohortId", "memberKind", "userId");
CREATE INDEX "PilotCohortMember_cohortId_idx" ON "PilotCohortMember"("cohortId");
CREATE INDEX "PilotCohortMember_memberKind_dataBoundary_idx" ON "PilotCohortMember"("memberKind", "dataBoundary");
CREATE INDEX "PilotCohortMember_provisioningState_idx" ON "PilotCohortMember"("provisioningState");
CREATE INDEX "PilotCohortMember_companyId_idx" ON "PilotCohortMember"("companyId");
CREATE INDEX "PilotCohortMember_subjectId_idx" ON "PilotCohortMember"("subjectId");
CREATE INDEX "PilotCohortMember_userId_idx" ON "PilotCohortMember"("userId");

ALTER TABLE "PilotCohortMember" ADD CONSTRAINT "PilotCohortMember_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "PilotCohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PilotCohortMember" ADD CONSTRAINT "PilotCohortMember_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PilotCohortMember" ADD CONSTRAINT "PilotCohortMember_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "PilotCohortMember" ADD CONSTRAINT "PilotCohortMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
