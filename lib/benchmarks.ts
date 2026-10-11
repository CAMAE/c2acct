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
 * (n≥5, no contributor above 25%) is applied by the READING surface, not here —
 * this stores the raw curve.
 *
 * enforce-core (R62): the run keeps the methodology page.
 *  - CUTOFF: only FINAL submissions created at or before the run's cutoff count;
 *    the cutoff is a parameter of the run and is stored on the BenchmarkRun row,
 *    so every reader can say which cut it shows and never recomputes live.
 *  - ONE FIRM ONE VOTE: a product's average counts the latest final per
 *    (firm, product); a firm's module score is its latest final per module.
 *  - DOMINANCE: the vendor category cohort's contributor weights (firm-reviewed
 *    products per vendor) are exposed to the reader through
 *    `vendorCategoryContributorWeights`, which evaluates MAX_CONTRIBUTOR_SHARE.
 *
 * Idempotent (upsert by the schema unique keys). Runs via
 * scripts/compute-benchmarks.ts --cutoff <date>; surfaces READ the tables.
 */
import { randomUUID } from "node:crypto";
import { DataBoundary, type PrismaClient, type CompanyType } from "@prisma/client";
import { alignmentIndex, latestFinalPerFirm, percentileRank, rankFromTop } from "@/lib/assessmentCore";
// scoring-core (R63): percentileRank is defined once, in lib/assessmentCore; re-exported for the readers that import it from here.
export { percentileRank };
import { evaluateBenchmarkSuppression, type BenchmarkSuppression } from "@/lib/benchmarkSuppression";
import { quarterCutoff } from "@/lib/consultantFreshness";
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

/**
 * scoring-core (R63): a company that left a (cohort, metric) between runs (a firm
 * under the three-module index floor, a vendor with no firm-reviewed product in
 * a category) must not keep last run's row, or the distinct-company count the
 * readers show (getFirmCohortFirmCount) would still count it. The run is the
 * truth; rows for companies not in this run's set go.
 */
async function removeDepartedCompanies(client: BenchmarkClient, cohortId: string, metricKey: string, companyIds: string[]) {
  await client.companyBenchmark.deleteMany({
    where: { cohortId, metricKey, version: BENCHMARK_VERSION, companyId: { notIn: companyIds } },
  });
}

type Pool = { tag: "real" | "demo"; boundaries: DataBoundary[] };
const POOLS: Pool[] = [
  { tag: "real", boundaries: [DataBoundary.PRODUCTION, DataBoundary.PILOT] },
  { tag: "demo", boundaries: [DataBoundary.DEMO] },
];

/** The pool a viewer of the given boundary reads (the cohort's own boundaries). */
export function poolBoundariesFor(boundary: DataBoundary): DataBoundary[] {
  return boundary === DataBoundary.DEMO ? POOLS[1].boundaries : POOLS[0].boundaries;
}

/**
 * The cutoff a run uses when none is given: the last instant of the calendar
 * quarter `now` falls in — the rule the methodology page publishes today (ruling 1
 * default). The scheduler box adds the one-quarter publication lag.
 */
export function defaultBenchmarkCutoff(now: Date = new Date()): Date {
  return quarterCutoff(now);
}

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

async function writeRun(client: BenchmarkClient, cohortId: string, metricKey: string, values: number[], cutoff: Date) {
  const d = distribution(values);
  await client.benchmarkRun.upsert({
    where: { cohortId_metricKey_version: { cohortId, metricKey, version: BENCHMARK_VERSION } },
    create: { id: randomUUID(), cohortId, metricKey, version: BENCHMARK_VERSION, cutoff, ...d },
    update: { ...d, cutoff, computedAt: new Date() },
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

async function computeFirmBenchmarks(client: BenchmarkClient, cutoff: Date, verticalId?: string): Promise<number> {
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
        createdAt: { lte: cutoff },
        ...scope,
      }),
      orderBy: { createdAt: "desc" },
      select: {
        companyId: true,
        score: true,
        createdAt: true,
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

    // one firm one vote: latest final per (firm, module)
    const votes = latestFinalPerFirm(
      submissions.filter((s) => typeof s.score === "number"),
      { firmId: (s) => s.companyId, groupKey: (s) => s.SurveyModule?.key, createdAt: (s) => s.createdAt }
    );

    const scoresByMetric = new Map<string, Array<{ companyId: string; score: number }>>();
    const firmModuleScores = new Map<string, number[]>();
    for (const vote of votes) {
      const companyId = vote.companyId as string;
      const metric = vote.SurveyModule?.key as string;
      const score = vote.score as number;
      (scoresByMetric.get(metric) ?? scoresByMetric.set(metric, []).get(metric)!).push({ companyId, score });
      (firmModuleScores.get(companyId) ?? firmModuleScores.set(companyId, []).get(companyId)!).push(score);
    }
    // alignment index = the one computation (equal weight; a firm under three
    // final modules has no index this run and is not in the index cohort).
    const alignmentRows = Array.from(firmModuleScores.entries())
      .map(([companyId, arr]) => ({ companyId, score: alignmentIndex(arr) }))
      .filter((row): row is { companyId: string; score: number } => row.score !== null);
    scoresByMetric.set(ALIGNMENT_INDEX_METRIC, alignmentRows);

    for (const [metricKey, rows] of scoresByMetric) {
      if (rows.length === 0) continue;
      const values = rows.map((r) => r.score);
      await writeRun(client, cohortId, metricKey, values, cutoff);
      for (const row of rows) {
        await writeCompany(client, row.companyId, cohortId, metricKey, row.score, values, verticalId);
      }
      await removeDepartedCompanies(client, cohortId, metricKey, rows.map((r) => r.companyId));
      written += 1;
    }
  }
  return written;
}

// --- vendor benchmarks (V1): firm-reviewed product strength per category -------

export type FirmProductReviewRow = {
  /** The reviewing firm. */
  companyId: string;
  productId: string;
  score: number;
  createdAt: Date;
};

type ReviewClient = Pick<PrismaClient, "surveySubmission">;

/**
 * Every FINAL firm product review in the pool at or before the cutoff — the one
 * query behind the vendor pass and the reader's dominance weights, so both see
 * the same rows under the same predicate.
 */
export async function loadFirmProductReviews(
  client: ReviewClient,
  input: { boundaries: DataBoundary[]; cutoff: Date; verticalId?: string; productIds?: string[] }
): Promise<FirmProductReviewRow[]> {
  const scope = verticalFilter({ verticalId: input.verticalId });
  const reviews = await client.surveySubmission.findMany({
    where: getSurveyFinalWhere({
      SurveyModule: { key: FIRM_PRODUCT_MODULE_KEY },
      Subject: input.productIds ? { productId: { in: input.productIds } } : { productId: { not: null } },
      Company: { is: { dataBoundary: { in: input.boundaries } } },
      createdAt: { lte: input.cutoff },
      ...scope,
    }),
    select: { companyId: true, score: true, createdAt: true, Subject: { select: { productId: true } } },
  });
  const rows: FirmProductReviewRow[] = [];
  for (const r of reviews) {
    const productId = r.Subject?.productId;
    if (!productId || !r.companyId || typeof r.score !== "number") continue;
    rows.push({ companyId: r.companyId, productId, score: r.score, createdAt: r.createdAt });
  }
  return rows;
}

/**
 * One firm one vote per product: the latest final per (firm, product) is the
 * vote; the product's strength is the mean of its votes. Pure.
 */
export function productVotes(rows: readonly FirmProductReviewRow[]): Map<string, FirmProductReviewRow[]> {
  const votes = latestFinalPerFirm(rows, {
    firmId: (r) => r.companyId,
    groupKey: (r) => r.productId,
    createdAt: (r) => r.createdAt,
  });
  const byProduct = new Map<string, FirmProductReviewRow[]>();
  for (const vote of votes) {
    (byProduct.get(vote.productId) ?? byProduct.set(vote.productId, []).get(vote.productId)!).push(vote);
  }
  return byProduct;
}

export function productMeans(rows: readonly FirmProductReviewRow[]): Map<string, { mean: number; firmCount: number }> {
  const out = new Map<string, { mean: number; firmCount: number }>();
  for (const [productId, votes] of productVotes(rows)) {
    out.set(productId, {
      mean: votes.reduce((s, v) => s + v.score, 0) / votes.length,
      firmCount: votes.length,
    });
  }
  return out;
}

/**
 * The vendor category cohort's contributors and their weights: each vendor with
 * at least one firm-reviewed product in the category is a contributor, weighted
 * by how many of its products carry a vote. MAX_CONTRIBUTOR_SHARE is evaluated
 * over these weights (ruling 3) — by the compute for its report and by the
 * Category Position reader, which suppresses a dominated category with the same
 * label the count rule uses. Pure.
 */
export function vendorCategoryContributorWeights(
  reviewedProducts: ReadonlyArray<{ id: string; companyId: string | null; category: string | null }>,
  productMeanById: ReadonlyMap<string, { mean: number }>
): Map<string, { weights: number[]; vendors: Array<{ vendorId: string; score: number; productCount: number }> }> {
  const byCategory = new Map<string, Map<string, number[]>>(); // category -> vendor -> product means
  for (const p of reviewedProducts) {
    if (!p.companyId) continue;
    const m = productMeanById.get(p.id);
    if (!m) continue;
    const category = p.category ?? "uncategorized";
    const vendors = byCategory.get(category) ?? byCategory.set(category, new Map()).get(category)!;
    (vendors.get(p.companyId) ?? vendors.set(p.companyId, []).get(p.companyId)!).push(m.mean);
  }
  const out = new Map<string, { weights: number[]; vendors: Array<{ vendorId: string; score: number; productCount: number }> }>();
  for (const [category, vendors] of byCategory) {
    const rows = Array.from(vendors.entries()).map(([vendorId, means]) => ({
      vendorId,
      score: Math.round(means.reduce((s, v) => s + v, 0) / means.length),
      productCount: means.length,
    }));
    out.set(category, { weights: rows.map((r) => r.productCount), vendors: rows });
  }
  return out;
}

export function evaluateVendorCategorySuppression(weights: readonly number[]): BenchmarkSuppression {
  return evaluateBenchmarkSuppression(weights);
}

export type VendorCategoryRunReport = { category: string; pool: "real" | "demo"; suppression: BenchmarkSuppression };

async function computeVendorBenchmarks(
  client: BenchmarkClient,
  cutoff: Date,
  verticalId: string | undefined,
  report: VendorCategoryRunReport[]
): Promise<number> {
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
    const reviews = await loadFirmProductReviews(client, { boundaries: pool.boundaries, cutoff, verticalId });
    const means = productMeans(reviews);
    if (means.size === 0) continue;

    // map product -> {vendor, category}
    const products = await client.product.findMany({
      where: { id: { in: [...means.keys()] }, ...scope },
      select: { id: true, companyId: true, category: true },
    });
    // per (vendor, category): mean firm-reviewed strength across the vendor's products;
    // per category: distribution across vendors + each vendor's percentile.
    for (const [category, cohort] of vendorCategoryContributorWeights(products, means)) {
      report.push({ category, pool: pool.tag, suppression: evaluateVendorCategorySuppression(cohort.weights) });
      const values = cohort.vendors.map((r) => r.score);
      await writeRun(client, cohortId, category, values, cutoff);
      for (const row of cohort.vendors) {
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
  options: { verticalId?: string; cutoff?: Date } = {}
): Promise<{ firmRuns: number; vendorRuns: number; cutoff: Date; vendorCategories: VendorCategoryRunReport[] }> {
  const verticalId = isVerticalPacksEnabled() ? options.verticalId : undefined;
  if (verticalId !== undefined) {
    await assertVerticalPackInstalled(verticalId);
  }
  const cutoff = options.cutoff ?? defaultBenchmarkCutoff();
  const vendorCategories: VendorCategoryRunReport[] = [];
  const firmRuns = await computeFirmBenchmarks(client, cutoff, verticalId);
  const vendorRuns = await computeVendorBenchmarks(client, cutoff, verticalId, vendorCategories);
  return { firmRuns, vendorRuns, cutoff, vendorCategories };
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
  /** The run's cutoff: only finals created at or before it count. Null on a run written before enforce-core. */
  cutoff: Date | null;
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
      select: { metricKey: true, n: true, mean: true, stdev: true, p10: true, p25: true, p50: true, p75: true, p90: true, cutoff: true },
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
    const rank = c && run.n > 0 ? rankFromTop(percentile ?? 0, run.n) : null;
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
      rankFromTop: rank,
      cutoff: run.cutoff ?? null,
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
