import { applyRepoEnv } from "@/lib/env/repoEnv";
import { computeBenchmarks } from "@/lib/benchmarks";

/**
 * Compute + persist BenchmarkRun (p10-p90 distributions) and CompanyBenchmark
 * (per-company percentile) from stored submission evidence, boundary-scoped by
 * cohort. Idempotent. Runs in the demo seed and on demand:
 *   pnpm compute:benchmarks
 */
async function main() {
  applyRepoEnv();
  const { default: prisma } = await import("@/lib/prisma");
  const result = await computeBenchmarks(prisma);
  console.log(`Benchmarks computed: ${result.firmRuns} firm runs, ${result.vendorRuns} vendor runs.`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
