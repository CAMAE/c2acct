-- Registry ensure marker (R49, 2026-09-16).
--
-- ADDITIVE ONLY. One new table and two indexes. No existing table, column,
-- index, constraint, default or type is altered, renamed or dropped, and no
-- row is rewritten.
--
-- One row per registry seed version that ensureFirmAlignmentSystem has fully
-- applied (seedVersion = "firm-alignment-system@<sha256 of the seed
-- definitions>"). Behind PAT_ENABLE_REGISTRY_MEMO=1 a fresh serverless
-- instance reads the latest row and skips the ~660-upsert ensure when the
-- deployed seed hash is already recorded; a differing hash or no row still
-- runs the ensure, which then records its row. Flag off, nothing reads or
-- writes this table.

-- CreateTable
CREATE TABLE "RegistryEnsure" (
    "id" TEXT NOT NULL,
    "seedVersion" TEXT NOT NULL,
    "ensuredAt" TIMESTAMP(3) NOT NULL,
    "ensuredBy" TEXT NOT NULL,

    CONSTRAINT "RegistryEnsure_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RegistryEnsure_seedVersion_key" ON "RegistryEnsure"("seedVersion");

-- CreateIndex
CREATE INDEX "RegistryEnsure_ensuredAt_idx" ON "RegistryEnsure"("ensuredAt");
