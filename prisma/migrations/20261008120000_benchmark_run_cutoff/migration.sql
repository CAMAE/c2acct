-- enforce-core (R62, 2026-10-08): the benchmark run stores its cutoff.
--
-- ADDITIVE ONLY. One nullable column on BenchmarkRun. No existing column,
-- default, index, constraint or type is altered, renamed or dropped, and no row
-- is rewritten (cutoff is NULL for every run written before this box).

-- AlterTable
ALTER TABLE "BenchmarkRun" ADD COLUMN "cutoff" TIMESTAMP(3);
