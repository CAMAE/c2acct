-- Product maturity trajectory (per-product mirror of the firm maturity models).
-- Additive only. The KnowledgeChunk.tsv drift that `migrate diff` surfaces is a
-- manually-managed tsvector column and is intentionally NOT touched here.

-- CreateTable
CREATE TABLE "ProductMaturityIndex" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bandMax" DOUBLE PRECISION NOT NULL DEFAULT 25,
    "bandMin" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tier" TEXT NOT NULL DEFAULT 'FOUNDATIONAL',

    CONSTRAINT "ProductMaturityIndex_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductMaturityMomentum" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "windowN" INTEGER NOT NULL DEFAULT 3,
    "delta1" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "delta2" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "accel" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgDelta" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "volatility" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "trend" TEXT NOT NULL DEFAULT 'FLAT',
    "velocity" TEXT NOT NULL DEFAULT 'STABLE',
    "stability" TEXT NOT NULL DEFAULT 'STABLE',
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductMaturityMomentum_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductMaturitySnapshot" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "tier" TEXT NOT NULL,
    "bandMin" DOUBLE PRECISION NOT NULL,
    "bandMax" DOUBLE PRECISION NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductMaturitySnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductMaturityIndex_productId_idx" ON "ProductMaturityIndex"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductMaturityIndex_productId_version_key" ON "ProductMaturityIndex"("productId", "version");

-- CreateIndex
CREATE INDEX "ProductMaturityMomentum_productId_idx" ON "ProductMaturityMomentum"("productId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductMaturityMomentum_productId_version_key" ON "ProductMaturityMomentum"("productId", "version");

-- CreateIndex
CREATE INDEX "ProductMaturitySnapshot_productId_computedAt_idx" ON "ProductMaturitySnapshot"("productId", "computedAt");

-- CreateIndex
CREATE INDEX "ProductMaturitySnapshot_productId_version_idx" ON "ProductMaturitySnapshot"("productId", "version");

-- AddForeignKey
ALTER TABLE "ProductMaturityIndex" ADD CONSTRAINT "ProductMaturityIndex_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMaturityMomentum" ADD CONSTRAINT "ProductMaturityMomentum_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductMaturitySnapshot" ADD CONSTRAINT "ProductMaturitySnapshot_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
