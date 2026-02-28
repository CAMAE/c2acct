-- CreateTable
CREATE TABLE "Insight" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "tier" INTEGER NOT NULL DEFAULT 1,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Insight_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsightCapabilityRule" (
    "id" TEXT NOT NULL,
    "insightId" TEXT NOT NULL,
    "nodeId" TEXT NOT NULL,
    "minScore" DOUBLE PRECISION NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsightCapabilityRule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Insight_key_key" ON "Insight"("key");

-- CreateIndex
CREATE INDEX "InsightCapabilityRule_insightId_idx" ON "InsightCapabilityRule"("insightId");

-- CreateIndex
CREATE INDEX "InsightCapabilityRule_nodeId_idx" ON "InsightCapabilityRule"("nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "InsightCapabilityRule_insightId_nodeId_key" ON "InsightCapabilityRule"("insightId", "nodeId");

-- AddForeignKey
ALTER TABLE "InsightCapabilityRule" ADD CONSTRAINT "InsightCapabilityRule_insightId_fkey" FOREIGN KEY ("insightId") REFERENCES "Insight"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsightCapabilityRule" ADD CONSTRAINT "InsightCapabilityRule_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "CapabilityNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;
