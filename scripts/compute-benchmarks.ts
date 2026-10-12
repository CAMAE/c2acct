import { applyRepoEnv } from "@/lib/env/repoEnv";
import { computeBenchmarks, defaultBenchmarkCutoff } from "@/lib/benchmarks";

/**
 * Compute + persist BenchmarkRun (p10-p90 distributions) and CompanyBenchmark
 * (per-company percentile) from stored submission evidence, boundary-scoped by
 * cohort. Idempotent. The run's CUTOFF is a parameter (enforce-core, R62): only
 * FINAL submissions created at or before it count, and it is stored on every
 * BenchmarkRun row written.
 *
 *   pnpm compute:benchmarks --cutoff 2026-09-30
 *   PAT_ENABLE_VERTICAL_PACKS=1 pnpm compute:benchmarks --cutoff 2026-09-30 --vertical legal
 *
 * Without --cutoff the run uses the last instant of the current calendar quarter
 * (the rule the methodology page publishes today). The scheduler box adds the
 * one-quarter publication lag; until then the run is started by hand.
 */
/** legal-load (R64): `--vertical <id>` computes one vertical's cohorts (flag on only; off, the option is ignored by computeBenchmarks). */
function parseVertical(argv: string[]): string | undefined {
  const flag = argv.indexOf("--vertical");
  if (flag === -1) return undefined;
  const raw = argv[flag + 1]?.trim();
  if (!raw) throw new Error("--vertical needs a pack id (e.g. legal)");
  return raw;
}

function parseCutoff(argv: string[]): Date {
  const flag = argv.indexOf("--cutoff");
  if (flag === -1) return defaultBenchmarkCutoff();
  const raw = argv[flag + 1];
  if (!raw) throw new Error("--cutoff needs a date (YYYY-MM-DD or ISO 8601)");
  // A bare date means the last instant of that day, UTC — the published rule.
  const value = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T23:59:59.999Z`) : new Date(raw);
  if (Number.isNaN(value.getTime())) throw new Error(`--cutoff "${raw}" is not a date`);
  return value;
}

async function main() {
  applyRepoEnv();
  const cutoff = parseCutoff(process.argv.slice(2));
  const verticalId = parseVertical(process.argv.slice(2));
  const { default: prisma } = await import("@/lib/prisma");
  const result = await computeBenchmarks(prisma, { cutoff, ...(verticalId ? { verticalId } : {}) });
  console.log(`Benchmarks computed at cutoff ${cutoff.toISOString()}${verticalId ? ` for vertical ${verticalId}` : ""}: ${result.firmRuns} firm runs, ${result.vendorRuns} vendor runs.`);
  for (const row of result.vendorCategories) {
    const s = row.suppression;
    console.log(
      `  vendor:${row.pool} ${row.category}: ${s.contributorCount} vendors, max share ${Math.round(s.maxContributorShare * 100)}% → ${s.suppressed ? `SUPPRESSED (${s.reason})` : "published"}`
    );
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
