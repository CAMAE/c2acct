-- CreateEnum
CREATE TYPE "CapabilityScope" AS ENUM ('FIRM', 'VENDOR', 'PRODUCT', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "CapabilityLevel" AS ENUM ('TIER1', 'TIER2', 'TIER3');

-- CreateTable
CREATE TABLE "CapabilityNode" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "scope" "CapabilityScope" NOT NULL,
    "level" "CapabilityLevel" NOT NULL DEFAULT 'TIER1',
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CapabilityNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CapabilityEdge" (
    "id" TEXT NOT NULL,
    "fromId" TEXT NOT NULL,
    "toId" TEXT NOT NULL,
    "type" TEXT,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CapabilityEdge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyCapabilityScore" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "scoreVersion" INTEGER NOT NULL DEFAULT 1,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyCapabilityScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CapabilityNode_key_key" ON "CapabilityNode"("key");

-- CreateIndex
CREATE INDEX "CapabilityEdge_fromId_idx" ON "CapabilityEdge"("fromId");

-- CreateIndex
CREATE INDEX "CapabilityEdge_toId_idx" ON "CapabilityEdge"("toId");

-- CreateIndex
CREATE UNIQUE INDEX "CapabilityEdge_fromId_toId_key" ON "CapabilityEdge"("fromId", "toId");

-- CreateIndex
CREATE INDEX "CompanyCapabilityScore_companyId_idx" ON "CompanyCapabilityScore"("companyId");

-- CreateIndex
CREATE INDEX "CompanyCapabilityScore_nodeId_idx" ON "CompanyCapabilityScore"("nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyCapabilityScore_companyId_nodeId_scoreVersion_key" ON "CompanyCapabilityScore"("companyId", "nodeId", "scoreVersion");

-- AddForeignKey
ALTER TABLE "CapabilityEdge" ADD CONSTRAINT "CapabilityEdge_fromId_fkey" FOREIGN KEY ("fromId") REFERENCES "CapabilityNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CapabilityEdge" ADD CONSTRAINT "CapabilityEdge_toId_fkey" FOREIGN KEY ("toId") REFERENCES "CapabilityNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyCapabilityScore" ADD CONSTRAINT "CompanyCapabilityScore_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyCapabilityScore" ADD CONSTRAINT "CompanyCapabilityScore_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "CapabilityNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
