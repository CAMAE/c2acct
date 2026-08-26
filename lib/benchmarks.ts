/**
 * Benchmark computation (Elite Insights v2, F1 + V1). Fills the previously-empty
 * BenchmarkRun (p10-p90 distribution per cohort/metric) and CompanyBenchmark
 * (each company's score + percentile) from REAL stored submission evidence — the
 * "dark data" the v2 verdict called for. Nothing is fabricated: every number is a
 * percentile of actual latest-per-firm scores.
 *
 * Boundary-scoped by COHORT: a firm/vendor benchmarks only against its own pool
 * (`firm:real` = PRODUCTION+PILOT, `firm:demo` = DEMO), so demo rows never enter a
 * real distribution and the demo environment still shows a full curve. Suppression
 * (n≥5) is applied by the READING surface, not here — this stores the raw curve.
 *
 * Idempotent (upsert by the schema unique keys). Runs in the demo seed and via
 * scripts/compute-benchmarks.ts; surfaces READ the tables (fast, no recompute).
 */
import { randomUUID } from "node:crypto";
import { DataBoundary, type PrismaClient, type CompanyType } from "@prisma/client";
import { FIRM_MODULE_DEFINITIONS, FIRM_PRODUCT_MODULE_KEY } from "@/lib/firmPat";
import { getSurveyFinalWhere } from "@/lib/surveyDrafts";
import {
  assertSingleVerticalCohort,
  assertVerticalPackInstalled,
  benchmarkCohortKey,
} from "@/lib/benchmarkCohortIsolation";
import { DEFAULT_VERTICAL_ID } from "@/lib/verticals/context";
import { isVerticalPacksEnabled } from "@/lib/verticals/flag";
import { verticalFilter, verticalStamp } from "@/lib/verticals/scope";

export const ALIGNMENT_INDEX_METRIC = "alignment_index";
export const BENCHMARK_VERSION = 1;

type BenchmarkClient = Pick<
  PrismaClient,
  "benchmarkCohort" | "benchmarkRun" | "companyBenchmark" | "companyBenchmarkCohort" | "surveySubmission" | "product"
>;

type Pool = { tag: "real" | "demo"; boundaries: DataBoundary[] };
const POOLS: Pool[] = [
  { tag: "real", boundaries: [DataBoundary.PRODUCTION, DataBoundary.PILOT] },
  { tag: "demo", boundaries: [DataBoundary.DEMO] },
];

/**
 * Which cohort key a viewer of the given boundary reads.
 *
 * `verticalId` defaults to accounting, and accounting's key is TODAY'S LITERAL
 * key — `firm:real`, `vendor:demo` — with no vertical segment. Existing
 * BenchmarkCohort rows are addressed by this unique key, so qualifying
 * accounting's would orphan every one of them. Another vertical gets its own
 * rows under its own key (W6); see lib/benchmarkCohortIsolation.ts.
 */
export function firmCohortKeyForBoundary(
  boundary: DataBoundary,
  verticalId: string = DEFAULT_VERTICAL_ID
): string {
  return benchmarkCohortKey(`firm:${boundary === DataBoundary.DEMO ? "demo" : "real"}`, verticalId);
}
export function vendorCohortKeyForBoundary(
  boundary: DataBoundary,
  verticalId: string = DEFAULT_VERTICAL_ID
): string {
  return benchmarkCohortKey(`vendor:${boundary === DataBoundary.DEMO ? "demo" : "real"}`, verticalId);
}

// --- percentile math (nearest-rank distribution + rank-based percentile) -------

/** p-th percentile (0–100) of ascending values, linear interpolation. */
export function percentileValue(sortedAsc: number[], p: number): number | null {
  if (sortedAsc.length === 0) return null;
  if (sortedAsc.length === 1) return sortedAsc[0];
  const rank = (p / 100) * (sortedAsc.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sortedAsc[lo];
  return sortedAsc[lo] + (rank - lo) * (sortedAsc[hi] - sortedAsc[lo]);
}

/** Percentile RANK of x within values: % of the cohort at or below x (0–100). */
export function percentileRank(values: number[], x: number): number {
  if (values.length === 0) return 0;
  const atOrBelow = values.filter((v) => v <= x).length;
  return Math.round((atOrBelow / values.length) * 100);
}

function distribution(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const n = sorted.length;
  const mean = n ? sorted.reduce((s, v) => s + v, 0) / n : 0;
  const variance = n ? sorted.reduce((s, v) => s + (v - mean) ** 2, 0) / n : 0;
  return {
    n,
    mean,
    stdev: Math.sqrt(variance),
    p10: percentileValue(sorted, 10),
    p25: percentileValue(sorted, 25),
    p50: percentileValue(sorted, 50),
    p75: percentileValue(sorted, 75),
    p90: percentileValue(sorted, 90),
  };
}

async function ensureCohort(client: BenchmarkClient, key: string, title: string, companyType: CompanyType) {
  const existing = await client.benchmarkCohort.findUnique({ where: { key }, select: { id: true } });
  if (existing) return existing.id;
  const created = await client.benchmarkCohort.create({
    data: { id: randomUUID(), key, title, companyType, updatedAt: new Date() },
    select: { id: true },
  });
  return created.id;
}

async function writeRun(client: BenchmarkClient, cohortId: string, metricKey: string, values: number[]) {
  const d = distribution(values);
  await client.benchmarkRun.upsert({
    where: { cohortId_metricKey_version: { cohortId, metricKey, version: BENCHMARK_VERSION } },
    create: { id: randomUUID(), cohortId, metricKey, version: BENCHMARK_VERSION, ...d },
    update: { ...d, computedAt: new Date() },
  });
}

async function writeCompany(
  client: BenchmarkClient,
  companyId: string,
  cohortId: string,
  metricKey: string,
  score: number,
  values: number[],
  verticalId?: string
) {
  const percentile = percentileRank(values, score);
  // Flag off, the stamp names no column and the W5 database default supplies
  // "accounting" — the two upserts are the upserts that shipped before PF-2.
  const stamp = verticalStamp({ verticalId });
  await client.companyBenchmark.upsert({
    where: { companyId_cohortId_metricKey_version: { companyId, cohortId, metricKey, version: BENCHMARK_VERSION } },
    create: {
      id: randomUUID(),
      companyId,
      cohortId,
      metricKey,
      version: BENCHMARK_VERSION,
      score,
      percentile,
      ...stamp,
    },
    update: { score, percentile, computedAt: new Date() },
  });
  await client.companyBenchmarkCohort.upsert({
    where: { companyId_cohortId: { companyId, cohortId } },
    create: { id: randomUUID(), companyId, cohortId, ...stamp },
    update: {},
  });
}

// --- firm benchmarks (F1): alignment_index + 5 modules, per pool ---------------

async function computeFirmBenchmarks(client: BenchmarkClient, verticalId?: string): Promise<number> {
  const moduleKeys = FIRM_MODULE_DEFINITIONS.map((m) => m.key);
  const scope = verticalFilter({ verticalId });
  const cohortVertical = verticalId ?? DEFAULT_VERTICAL_ID;
  let written = 0;

  for (const pool of POOLS) {
    const cohortId = await ensureCohort(
      client,
      benchmarkCohortKey(`firm:${pool.tag}`, cohortVertical),
      `Firms (${pool.tag})`,
      "FIRM"
    );

    const submissions = await client.surveySubmission.findMany({
      where: getSurveyFinalWhere({
        SurveyModule: { key: { in: moduleKeys } },
        Company: { is: { dataBoundary: { in: pool.boundaries } } },
        ...scope,
      }),
      orderBy: { createdAt: "desc" },
      select: {
        companyId: true,
        score: true,
        ...(scope.verticalId === undefined ? {} : { verticalId: true as const }),
        SurveyModule: { select: { key: true } },
      },
    });

    // The isolation invariant, asserted at the point rows become a cohort. The
    // query above already scopes flag-on, so this can only fire if a caller
    // reaches the write path another way — which is exactly the case worth
    // failing loudly on. It is a no-op flag off, where `scope` is `{}`.
    if (scope.verticalId !== undefined) {
      assertSingleVerticalCohort(
        scope.verticalId,
        submissions.map((s) => ({
          companyId: s.companyId,
          verticalId: (s as { verticalId?: string }).verticalId ?? "",
        }))
      );
    }

    // latest score per (firm, module)
    const latest = new Map<string, number>();
    for (const s of submissions) {
      const mk = s.SurveyModule?.key;
      if (!s.companyId || !mk || typeof s.score !== "number") continue;
      const key = `${s.companyId}::${mk}`;
      if (!latest.has(key)) latest.set(key, s.score);
    }

    const scoresByMetric = new Map<string, Array<{ companyId: string; score: number }>>();
    const firmModuleScores = new Map<string, number[]>();
    for (const [key, score] of latest) {
      const sep = key.lastIndexOf("::");
      const companyId = key.slice(0, sep);
      const metric = key.slice(sep + 2);
      (scoresByMetric.get(metric) ?? scoresByMetric.set(metric, []).get(metric)!).push({ companyId, score });
      (firmModuleScores.get(companyId) ?? firmModuleScores.set(companyId, []).get(companyId)!).push(score);
    }
    // alignment index = mean of a firm's module scores
    const alignmentRows = Array.from(firmModuleScores.entries()).map(([companyId, arr]) => ({
      companyId,
      score: Math.round(arr.reduce((s, v) => s + v, 0) / arr.length),
    }));
    scoresByMetric.set(ALIGNMENT_INDEX_METRIC, alignmentRows);

    for (const [metricKey, rows] of scoresByMetric) {
      if (rows.length === 0) continue;
      const values = rows.map((r) => r.score);
      await writeRun(client, cohortId, metricKey, values);
      for (const row of rows) {
        await writeCompany(client, row.companyId, cohortId, metricKey, row.score, values, verticalId);
      }
      written += 1;
    }
  }
  return written;
}

// --- vendor benchmarks (V1): firm-reviewed product strength per category -------

async function computeVendorBenchmarks(client: BenchmarkClient, verticalId?: string): Promise<number> {
  const scope = verticalFilter({ verticalId });
  const cohortVertical = verticalId ?? DEFAULT_VERTICAL_ID;
  let written = 0;

  for (const pool of POOLS) {
    const cohortId = await ensureCohort(
      client,
      benchmarkCohortKey(`vendor:${pool.tag}`, cohortVertical),
      `Vendors (${pool.tag})`,
      "VENDOR"
    );

    // firm-reviewed product submissions in this pool (firms review vendor products)
    const reviews = await client.surveySubmission.findMany({
      where: getSurveyFinalWhere({
        SurveyModule: { key: FIRM_PRODUCT_MODULE_KEY },
        Subject: { productId: { not: null } },
        Company: { is: { dataBoundary: { in: pool.boundaries } } },
        ...scope,
      }),
      select: { score: true, Subject: { select: { productId: true } } },
    });
    const scoresByProduct = new Map<string, number[]>();
    for (const r of reviews) {
      const pid = r.Subject?.productId;
      if (!pid || typeof r.score !== "number") continue;
      (scoresByProduct.get(pid) ?? scoresByProduct.set(pid, []).get(pid)!).push(r.score);
    }
    if (scoresByProduct.size === 0) continue;

    // map product -> {vendor, category}
    const products = await client.product.findMany({
      where: { id: { in: [...scoresByProduct.keys()] }, ...scope },
      select: { id: true, companyId: true, category: true },
    });
    // per (vendor, category): mean firm-reviewed strength across the vendor's products
    const byVendorCategory = new Map<string, number[]>(); // `${vendorId}::${category}` -> product means
    for (const p of products) {
      if (!p.companyId) continue;
      const category = p.category ?? "uncategorized";
      const scores = scoresByProduct.get(p.id) ?? [];
      if (scores.length === 0) continue;
      const productMean = scores.reduce((s, v) => s + v, 0) / scores.length;
      const key = `${p.companyId}::${category}`;
      (byVendorCategory.get(key) ?? byVendorCategory.set(key, []).get(key)!).push(productMean);
    }
    // per category: distribution across vendors + each vendor's percentile
    const vendorsByCategory = new Map<string, Array<{ vendorId: string; score: number }>>();
    for (const [key, means] of byVendorCategory) {
      const sep = key.lastIndexOf("::");
      const vendorId = key.slice(0, sep);
      const category = key.slice(sep + 2);
      const vendorScore = Math.round(means.reduce((s, v) => s + v, 0) / means.length);
      (vendorsByCategory.get(category) ?? vendorsByCategory.set(category, []).get(category)!).push({ vendorId, score: vendorScore });
    }
    for (const [category, rows] of vendorsByCategory) {
      const values = rows.map((r) => r.score);
      await writeRun(client, cohortId, category, values);
      for (const row of rows) {
        await writeCompany(client, row.vendorId, cohortId, category, row.score, values, verticalId);
      }
      written += 1;
    }
  }
  return written;
}

/**
 * Compute every benchmark distribution.
 *
 * `verticalId` is the cohort's vertical (W6). Flag off it is ignored entirely:
 * the queries keep their plans, the writes name no new column, and the cohort
 * keys are the literal keys that already exist — accounting's cohorts are
 * byte-identical flag-off and flag-on-with-only-accounting-data, which is the
 * point of accounting keeping the unqualified key.
 *
 * Flag on with an explicit vertical, that vertical's pack must be installed. A
 * packless vertical is a caller with a bad id, not an empty cohort: computing
 * it would write real benchmark rows under a vertical nothing can resolve.
 */
export async function computeBenchmarks(
  client: BenchmarkClient,
  options: { verticalId?: string } = {}
): Promise<{ firmRuns: number; vendorRuns: number }> {
  const verticalId = isVerticalPacksEnabled() ? options.verticalId : undefined;
  if (verticalId !== undefined) {
    await assertVerticalPackInstalled(verticalId);
  }
  const firmRuns = await computeFirmBenchmarks(client, verticalId);
  const vendorRuns = await computeVendorBenchmarks(client, verticalId);
  return { firmRuns, vendorRuns };
}

// --- readers (surfaces read these; no recompute at request time) ---------------

export type BenchmarkReading = {
  metricKey: string;
  n: number;
  mean: number | null;
  stdev: number | null;
  p10: number | null;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  p90: number | null;
  /** This company's stored score for the metric (null if not benchmarked). */
  score: number | null;
  /** Percentile rank 0–100 (% of the cohort at or below this company). */
  percentile: number | null;
  /** Ordinal rank from the top (1 = best), derived from percentile + n. */
  rankFromTop: number | null;
};

type ReaderClient = Pick<PrismaClient, "benchmarkCohort" | "benchmarkRun" | "companyBenchmark">;

async function readCohort(
  client: ReaderClient,
  cohortKey: string,
  companyId: string
): Promise<BenchmarkReading[]> {
  const cohort = await client.benchmarkCohort.findUnique({ where: { key: cohortKey }, select: { id: true } });
  if (!cohort) return [];
  const [runs, company] = await Promise.all([
    client.benchmarkRun.findMany({
      where: { cohortId: cohort.id, version: BENCHMARK_VERSION },
      select: { metricKey: true, n: true, mean: true, stdev: true, p10: true, p25: true, p50: true, p75: true, p90: true },
    }),
    client.companyBenchmark.findMany({
      where: { companyId, cohortId: cohort.id, version: BENCHMARK_VERSION },
      select: { metricKey: true, score: true, percentile: true },
    }),
  ]);
  const companyByMetric = new Map(company.map((c) => [c.metricKey, c]));
  // Block 10a: only the categories/metrics this company actually participates in
  // (has a CompanyBenchmark score for). A vendor's Category Position must show its
  // OWN categories — never every cohort category, which surfaced suppressed cards
  // for categories the vendor has no product in (P2 root cause). F1 is unaffected:
  // a scored firm has a CompanyBenchmark for each of its modules.
  return runs
    .filter((run) => companyByMetric.has(run.metricKey))
    .map((run) => {
    const c = companyByMetric.get(run.metricKey);
    const percentile = c ? Math.round(c.percentile) : null;
    const rankFromTop =
      c && run.n > 0 ? Math.min(run.n, Math.max(1, run.n - Math.round((percentile ?? 0) / 100 * run.n) + 1)) : null;
    return {
      metricKey: run.metricKey,
      n: run.n,
      mean: run.mean,
      stdev: run.stdev,
      p10: run.p10,
      p25: run.p25,
      p50: run.p50,
      p75: run.p75,
      p90: run.p90,
      score: c ? Math.round(c.score) : null,
      percentile,
      rankFromTop,
    };
  });
}

/** F1 reader: the firm's alignment-index + per-module benchmark readings. */
export function getFirmPeerReadings(client: ReaderClient, companyId: string, boundary: DataBoundary) {
  return readCohort(client, firmCohortKeyForBoundary(boundary), companyId);
}

/**
 * The peer cohort size as DISTINCT firms actually scored in the benchmark table
 * (Block 12f) — the honest N to display, not BenchmarkRun.n (which can drift from
 * the distinct-company count after reseeds / stale rows).
 */
export async function getFirmCohortFirmCount(client: ReaderClient, boundary: DataBoundary): Promise<number> {
  const cohort = await client.benchmarkCohort.findUnique({
    where: { key: firmCohortKeyForBoundary(boundary) },
    select: { id: true },
  });
  if (!cohort) return 0;
  const rows = await client.companyBenchmark.findMany({
    where: { cohortId: cohort.id, metricKey: ALIGNMENT_INDEX_METRIC, version: BENCHMARK_VERSION },
    select: { companyId: true },
    distinct: ["companyId"],
  });
  return rows.length;
}

/** V1 reader: the vendor's per-category benchmark readings. */
export function getVendorCategoryReadings(client: ReaderClient, companyId: string, boundary: DataBoundary) {
  return readCohort(client, vendorCohortKeyForBoundary(boundary), companyId);
}
