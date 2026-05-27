-- CreateTable
CREATE TABLE "ConsultantProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultantProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsultantAssignment" (
    "id" TEXT NOT NULL,
    "consultantProfileId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ConsultantAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ConsultantProfile_userId_key" ON "ConsultantProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ConsultantAssignment_consultantProfileId_companyId_key" ON "ConsultantAssignment"("consultantProfileId", "companyId");

-- CreateIndex
CREATE INDEX "ConsultantAssignment_companyId_active_idx" ON "ConsultantAssignment"("companyId", "active");

-- CreateIndex
CREATE INDEX "ConsultantAssignment_consultantProfileId_active_idx" ON "ConsultantAssignment"("consultantProfileId", "active");

-- AddForeignKey
ALTER TABLE "ConsultantProfile" ADD CONSTRAINT "ConsultantProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantAssignment" ADD CONSTRAINT "ConsultantAssignment_consultantProfileId_fkey" FOREIGN KEY ("consultantProfileId") REFERENCES "ConsultantProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsultantAssignment" ADD CONSTRAINT "ConsultantAssignment_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;
