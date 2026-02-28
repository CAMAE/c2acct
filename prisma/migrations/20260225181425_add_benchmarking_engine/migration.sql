-- CreateTable
CREATE TABLE "BenchmarkCohort" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "companyType" "CompanyType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BenchmarkCohort_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyBenchmarkCohort" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyBenchmarkCohort_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BenchmarkRun" (
    "id" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "metricKey" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "n" INTEGER NOT NULL DEFAULT 0,
    "mean" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stdev" DOUBLE PRECISION,
    "p10" DOUBLE PRECISION,
    "p25" DOUBLE PRECISION,
    "p50" DOUBLE PRECISION,
    "p75" DOUBLE PRECISION,
    "p90" DOUBLE PRECISION,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BenchmarkRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CompanyBenchmark" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "cohortId" TEXT NOT NULL,
    "metricKey" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "percentile" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyBenchmark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BenchmarkCohort_key_key" ON "BenchmarkCohort"("key");

-- CreateIndex
CREATE INDEX "CompanyBenchmarkCohort_companyId_idx" ON "CompanyBenchmarkCohort"("companyId");

-- CreateIndex
CREATE INDEX "CompanyBenchmarkCohort_cohortId_idx" ON "CompanyBenchmarkCohort"("cohortId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyBenchmarkCohort_companyId_cohortId_key" ON "CompanyBenchmarkCohort"("companyId", "cohortId");

-- CreateIndex
CREATE INDEX "BenchmarkRun_cohortId_idx" ON "BenchmarkRun"("cohortId");

-- CreateIndex
CREATE INDEX "BenchmarkRun_metricKey_idx" ON "BenchmarkRun"("metricKey");

-- CreateIndex
CREATE UNIQUE INDEX "BenchmarkRun_cohortId_metricKey_version_key" ON "BenchmarkRun"("cohortId", "metricKey", "version");

-- CreateIndex
CREATE INDEX "CompanyBenchmark_companyId_idx" ON "CompanyBenchmark"("companyId");

-- CreateIndex
CREATE INDEX "CompanyBenchmark_cohortId_idx" ON "CompanyBenchmark"("cohortId");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyBenchmark_companyId_cohortId_metricKey_version_key" ON "CompanyBenchmark"("companyId", "cohortId", "metricKey", "version");

-- AddForeignKey
ALTER TABLE "CompanyBenchmarkCohort" ADD CONSTRAINT "CompanyBenchmarkCohort_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyBenchmarkCohort" ADD CONSTRAINT "CompanyBenchmarkCohort_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "BenchmarkCohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BenchmarkRun" ADD CONSTRAINT "BenchmarkRun_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "BenchmarkCohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyBenchmark" ADD CONSTRAINT "CompanyBenchmark_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyBenchmark" ADD CONSTRAINT "CompanyBenchmark_cohortId_fkey" FOREIGN KEY ("cohortId") REFERENCES "BenchmarkCohort"("id") ON DELETE CASCADE ON UPDATE CASCADE;
