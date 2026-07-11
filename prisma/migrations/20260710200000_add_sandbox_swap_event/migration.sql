-- Sandbox swap event log (Elite Insights v2, V2 demand signal). Additive only.
CREATE TABLE "SandboxSwapEvent" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "productInId" TEXT NOT NULL,
    "productOutId" TEXT,
    "vendorInId" TEXT,
    "boundary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SandboxSwapEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SandboxSwapEvent_productInId_createdAt_idx" ON "SandboxSwapEvent"("productInId", "createdAt");
CREATE INDEX "SandboxSwapEvent_vendorInId_createdAt_idx" ON "SandboxSwapEvent"("vendorInId", "createdAt");
CREATE INDEX "SandboxSwapEvent_companyId_createdAt_idx" ON "SandboxSwapEvent"("companyId", "createdAt");
