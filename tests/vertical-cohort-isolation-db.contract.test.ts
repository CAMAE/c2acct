import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { DataBoundary } from "@prisma/client";
import { applyRepoEnv } from "@/lib/env/repoEnv";
import { FIRM_MODULE_DEFINITIONS } from "@/lib/firmPat";
import { ALIGNMENT_INDEX_METRIC, BENCHMARK_VERSION, computeBenchmarks } from "@/lib/benchmarks";
import { DEFAULT_VERTICAL_ID } from "@/lib/verticals/context";
import { VERTICAL_PACKS_FLAG_ENV } from "@/lib/verticals/flag";

/**
 * W6 isolation, against REAL Postgres (VERTICAL-READINESS-AUDIT-2026-08 §5.1).
 *
 * The pure-function suite (tests/vertical-cohort-isolation.contract.test.ts)
 * proves the invariant. This one proves the WIRING: that computeBenchmarks
 * actually routes through it, that the flag-off write path is unchanged, and
 * that a second vertical's firm genuinely never lands in an accounting cohort
 * row. An invariant nothing calls is not an invariant.
 *
 * Skips visibly when no database is reachable, matching the Block A suites.
 */

applyRepoEnv();

/**
 * computeBenchmarks() sweeps every firm in the pool, not just this namespace's,
 * so these cases do real work against a shared database. Under full-suite
 * parallelism that comfortably exceeds vitest's 5s default.
 */
const DB_TIMEOUT_MS = 120_000;

const NS = "test-w6-isolation";
const FIXTURE = "test-fixture";
const MODULE_KEY = FIRM_MODULE_DEFINITIONS[0]!.key;

let prisma: typeof import("@/lib/prisma").default;
let dbAvailable = false;
let moduleId: string | null = null;

const savedFlag = process.env[VERTICAL_PACKS_FLAG_ENV];

async function cleanup() {
  if (!dbAvailable) return;
  await prisma.companyBenchmark.deleteMany({ where: { companyId: { startsWith: NS } } });
  await prisma.companyBenchmarkCohort.deleteMany({ where: { companyId: { startsWith: NS } } });
  await prisma.surveySubmission.deleteMany({ where: { companyId: { startsWith: NS } } });
  await prisma.company.deleteMany({ where: { id: { startsWith: NS } } });
  await prisma.benchmarkRun.deleteMany({ where: { BenchmarkCohort: { key: { contains: FIXTURE } } } });
  await prisma.benchmarkCohort.deleteMany({ where: { key: { contains: FIXTURE } } });
}

/** One firm with one final submission, in the given vertical. */
async function seedFirm(suffix: string, verticalId: string, score: number) {
  const companyId = `${NS}-${verticalId}-${suffix}`;
  await prisma.company.create({
    data: {
      id: companyId,
      name: `W6 ${verticalId} ${suffix}`,
      type: "FIRM",
      dataBoundary: DataBoundary.DEMO,
      verticalId,
      updatedAt: new Date(),
    },
  });
  await prisma.surveySubmission.create({
    data: {
      id: `${companyId}-submission`,
      companyId,
      moduleId: moduleId!,
      answers: {},
      score,
      verticalId,
    },
  });
  return companyId;
}

/**
 * Run computeBenchmarks, tolerating a company deleted by ANOTHER suite mid-run.
 *
 * computeBenchmarks sweeps every firm in the pool, not just this namespace's,
 * and vitest runs test FILES in parallel against one shared dev database. The
 * Block A suites (`module-history`, `module-unlock`) create and delete their own
 * companies throughout. If one of theirs vanishes between this sweep's read and
 * its write, Postgres raises P2003 on CompanyBenchmark.companyId — a foreign key
 * pointing at a row that existed a moment ago.
 *
 * That is test-environment interference, not a cohort-isolation defect: it is
 * another suite's company, in another namespace, and it fails on the FK rather
 * than landing anywhere it should not. Retrying the sweep is the honest
 * response — the subject here is vertical isolation, not concurrent-deletion
 * resilience, and swallowing the error instead of retrying would let a real
 * failure pass. Any OTHER error propagates untouched.
 */
async function computeBenchmarksTolerantOfConcurrentDeletes(
  options: { verticalId?: string } = {}
) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await computeBenchmarks(prisma, options);
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code !== "P2003") {
        throw error;
      }
      lastError = error;
    }
  }
  throw lastError;
}

/** Every accounting-cohort membership row this namespace produced, ordered. */
async function accountingCohortRows() {
  const rows = await prisma.companyBenchmark.findMany({
    where: {
      companyId: { startsWith: NS },
      BenchmarkCohort: { key: "firm:demo" },
      version: BENCHMARK_VERSION,
    },
    orderBy: [{ companyId: "asc" }, { metricKey: "asc" }],
    select: { companyId: true, metricKey: true, score: true, percentile: true, verticalId: true },
  });
  return rows;
}

beforeAll(async () => {
  prisma = (await import("@/lib/prisma")).default;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbAvailable = true;
  } catch {
    dbAvailable = false;
    return;
  }
  const surveyModule = await prisma.surveyModule.findUnique({
    where: { key: MODULE_KEY },
    select: { id: true },
  });
  moduleId = surveyModule?.id ?? null;
  if (!moduleId) {
    // No seeded firm modules: the fixtures below cannot be built honestly.
    dbAvailable = false;
    return;
  }
  await cleanup();
}, DB_TIMEOUT_MS);

afterAll(async () => {
  await cleanup();
  if (savedFlag === undefined) delete process.env[VERTICAL_PACKS_FLAG_ENV];
  else process.env[VERTICAL_PACKS_FLAG_ENV] = savedFlag;
  if (dbAvailable) await prisma.$disconnect();
}, DB_TIMEOUT_MS);

describe("W6 wiring — accounting cohorts against real Postgres", () => {
  it("writes identical accounting cohort rows flag-off and flag-on-with-only-accounting-data", async (ctx) => {
    if (!dbAvailable) return ctx.skip();

    // Five accounting firms, so the cut is a real one rather than a degenerate
    // single-row case.
    for (let i = 0; i < 5; i += 1) {
      await seedFirm(`byte-${i}`, DEFAULT_VERTICAL_ID, 40 + i * 5);
    }

    delete process.env[VERTICAL_PACKS_FLAG_ENV];
    await computeBenchmarksTolerantOfConcurrentDeletes();
    const flagOff = await accountingCohortRows();

    // Flag on, with accounting explicitly named and only accounting data
    // present. The cohort key is unqualified for accounting, so this addresses
    // the SAME BenchmarkCohort row rather than a parallel one.
    process.env[VERTICAL_PACKS_FLAG_ENV] = "1";
    await computeBenchmarksTolerantOfConcurrentDeletes({ verticalId: DEFAULT_VERTICAL_ID });
    const flagOn = await accountingCohortRows();

    expect(flagOff.length).toBeGreaterThan(0);
    expect(flagOn).toEqual(flagOff);
    // Every row carries accounting — flag off by database default, flag on by
    // explicit stamp. Both spellings of the same true value.
    expect(flagOn.every((row) => row.verticalId === DEFAULT_VERTICAL_ID)).toBe(true);
    // And the alignment index was actually computed, so this is a real cut.
    expect(flagOn.some((row) => row.metricKey === ALIGNMENT_INDEX_METRIC)).toBe(true);
  }, DB_TIMEOUT_MS);

  it("never lets a second-vertical firm into the accounting cohort row", async (ctx) => {
    if (!dbAvailable) return ctx.skip();

    // Fixture firms now exist in the same database, in the same DEMO boundary,
    // answering the same module. Before W6 they would have joined `firm:demo`
    // and moved every accounting percentile in it — and nothing would have
    // failed, because the suppression counts still pass.
    const fixtureIds: string[] = [];
    for (let i = 0; i < 5; i += 1) {
      fixtureIds.push(await seedFirm(`foreign-${i}`, FIXTURE, 90 + i));
    }

    process.env[VERTICAL_PACKS_FLAG_ENV] = "1";
    await computeBenchmarksTolerantOfConcurrentDeletes({ verticalId: DEFAULT_VERTICAL_ID });

    const accountingRows = await accountingCohortRows();
    const accountingMembers = new Set(accountingRows.map((row) => row.companyId));
    for (const fixtureId of fixtureIds) {
      expect(accountingMembers.has(fixtureId)).toBe(false);
    }
    expect(accountingRows.every((row) => row.verticalId === DEFAULT_VERTICAL_ID)).toBe(true);
  }, DB_TIMEOUT_MS);

  it("gives the second vertical its own cohort ROW, not a filtered view of accounting's", async (ctx) => {
    if (!dbAvailable) return ctx.skip();

    process.env[VERTICAL_PACKS_FLAG_ENV] = "1";
    await computeBenchmarksTolerantOfConcurrentDeletes({ verticalId: FIXTURE });

    const fixtureCohort = await prisma.benchmarkCohort.findUnique({
      where: { key: `firm:demo:${FIXTURE}` },
      select: { id: true },
    });
    expect(fixtureCohort).not.toBeNull();

    const fixtureRows = await prisma.companyBenchmark.findMany({
      where: { cohortId: fixtureCohort!.id, companyId: { startsWith: NS } },
      select: { companyId: true, verticalId: true },
    });
    expect(fixtureRows.length).toBeGreaterThan(0);
    // Separate rows, separate cohort, no accounting firm anywhere in it.
    expect(fixtureRows.every((row) => row.verticalId === FIXTURE)).toBe(true);
    expect(fixtureRows.every((row) => row.companyId.includes(FIXTURE))).toBe(true);
  }, DB_TIMEOUT_MS);

  it("refuses to compute a cohort for a vertical with no installed pack", async (ctx) => {
    if (!dbAvailable) return ctx.skip();
    process.env[VERTICAL_PACKS_FLAG_ENV] = "1";
    await expect(computeBenchmarks(prisma, { verticalId: "no-such-vertical" })).rejects.toThrow(
      /No Vertical Pack is installed/i
    );
  }, DB_TIMEOUT_MS);

  it("ignores an explicit vertical entirely with the flag off", async (ctx) => {
    if (!dbAvailable) return ctx.skip();
    // Flag off is byte-identical: even a caller naming a vertical gets today's
    // behaviour, and no packless-vertical error, because the argument is never
    // consulted.
    delete process.env[VERTICAL_PACKS_FLAG_ENV];
    await expect(computeBenchmarks(prisma, { verticalId: "no-such-vertical" })).resolves.toEqual(
      expect.objectContaining({ firmRuns: expect.any(Number) })
    );
    const rows = await accountingCohortRows();
    expect(rows.every((row) => row.verticalId === DEFAULT_VERTICAL_ID)).toBe(true);
  }, DB_TIMEOUT_MS);
});
