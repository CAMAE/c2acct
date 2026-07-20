/**
 * Elite Insights v2 (verdict §4) — the SIX decision products. Each builder reads
 * real stored evidence (benchmarks, capability gaps, snapshot history, per-utility
 * divergence, sandbox swap events) and returns chart-ready data. Rank/percentile,
 * not averages. Suppression (n≥5), divergence floor (≥3), boundary wall, and
 * confidence bands are all applied here; every projection is flagged directional.
 *
 * Pure-ish: each builder takes a prisma client + ids and returns plain data the
 * server card components render. See app/components/insights/elite/*.
 */
import type { PrismaClient, DataBoundary } from "@prisma/client";
import { FIRM_MODULE_DEFINITIONS, FIRM_PRODUCT_MODULE_KEY } from "@/lib/firmPat";
import {
  getFirmPeerReadings,
  getFirmCohortFirmCount,
  getVendorCategoryReadings,
  ALIGNMENT_INDEX_METRIC,
  percentileRank,
  percentileValue,
  type BenchmarkReading,
} from "@/lib/benchmarks";
import type { FirmAlignmentSignal } from "@/lib/firmAlignmentSignal";
import { readFreshness, type FreshnessReading } from "@/lib/freshness";
import { getSurveyFinalWhere } from "@/lib/surveyDrafts";
import { MIN_CONTRIBUTORS } from "@/lib/benchmarkSuppression";
import type { PercentileRow } from "@/app/components/charts/PercentileBand";
import { ordinal } from "@/lib/ordinal";

const MODULE_TITLE = new Map<string, string>(FIRM_MODULE_DEFINITIONS.map((m) => [m.key, m.title]));

/**
 * v2 entry-card metadata (B5-1) — title + one specific description per surface,
 * keyed by the unchanged route key. The Elite tab cards render these so they
 * match their interior pages exactly (v1 names retired). No boilerplate.
 */
export type EliteCardMeta = { title: string; description: string };

export const FIRM_ELITE_V2_META: Record<string, EliteCardMeta> = {
  firm_tier2_benchmark: {
    title: "Peer Position Report",
    description: "Where your firm ranks against peer firms, module by module — a percentile, not an average.",
  },
  firm_tier2_recommendation: {
    title: "Gap-to-Top-Quartile Plan",
    description: "The capabilities holding your alignment index down, ranked by point deficit — fix these first.",
  },
  firm_tier2_projection: {
    title: "Trajectory",
    description: "Your alignment index over time, with momentum and a directional projection of where you are heading.",
  },
};

export const VENDOR_ELITE_V2_META: Record<string, EliteCardMeta> = {
  "benchmark-comparison": {
    title: "Category Position",
    description: "Where your products rank in their category's distribution of firm-reviewed strength.",
  },
  "forward-projection": {
    title: "Demand Signals",
    description: "How firms move your products in and out of their simulated stacks — pipeline and churn risk.",
  },
  "scenario-simulation": {
    title: "Alignment Gap Map",
    description: "Per product-fit dimension, where firms confirm your story and where they read you lower.",
  },
};

function suppressed(reading: BenchmarkReading): boolean {
  return reading.n < MIN_CONTRIBUTORS;
}

// ── F1 · Peer Position Report ────────────────────────────────────────────────

/** Inverse percentile: approximate percentile rank of value `v` from p-anchors. */
function percentileForValue(
  anchors: Array<{ p: number; v: number }>,
  v: number
): number {
  const pts = anchors.filter((a) => typeof a.v === "number").sort((a, b) => a.v - b.v);
  if (pts.length === 0) return 0;
  if (v <= pts[0].v) return pts[0].p;
  if (v >= pts[pts.length - 1].v) return pts[pts.length - 1].p;
  for (let i = 1; i < pts.length; i += 1) {
    if (v <= pts[i].v) {
      const lo = pts[i - 1];
      const hi = pts[i];
      const t = hi.v === lo.v ? 0 : (v - lo.v) / (hi.v - lo.v);
      return Math.round(lo.p + t * (hi.p - lo.p));
    }
  }
  return pts[pts.length - 1].p;
}

export type FirmPeerPosition = {
  available: boolean;
  overall: { percentile: number; rankFromTop: number; n: number; score: number } | null;
  /** Largest single lever: closing the biggest module deficit vs the peer top quartile. */
  bestAction: { moduleLabel: string; deficit: number; fromPercentile: number; toPercentile: number } | null;
  rows: PercentileRow[];
  reportCard: Array<{
    key: string;
    label: string;
    you: number | null;
    peerLow: number | null;
    peerHigh: number | null;
    verdict: "ahead" | "on par" | "behind" | "withheld";
  }>;
  emptyReason: string | null;
};

type ReaderClient = Pick<PrismaClient, "benchmarkCohort" | "benchmarkRun" | "companyBenchmark">;

/** anchors for a benchmark reading's distribution, for percentile recomputation. */
function distributionAnchors(r: BenchmarkReading): Array<{ p: number; v: number }> {
  return [
    { p: 10, v: r.p10 as number },
    { p: 25, v: r.p25 as number },
    { p: 50, v: r.p50 as number },
    { p: 75, v: r.p75 as number },
    { p: 90, v: r.p90 as number },
  ].filter((a) => typeof a.v === "number");
}

export async function buildFirmPeerPosition(
  client: ReaderClient,
  companyId: string,
  boundary: DataBoundary,
  liveSignal: FirmAlignmentSignal
): Promise<FirmPeerPosition> {
  // Block 12f — number integrity: the DISTRIBUTION (p25..p90, mean) comes from the
  // benchmark, but the firm's OWN "you" scores + alignment index come from the
  // ONE shared live reader (getFirmAlignmentSignal), so the Elite pane reads the
  // exact same module values as the Pro pane. Percentiles are recomputed from the
  // live score against the benchmark distribution. Cohort N = distinct firms.
  const [readings, cohortN] = await Promise.all([
    getFirmPeerReadings(client, companyId, boundary),
    getFirmCohortFirmCount(client, boundary),
  ]);
  const overallReading = readings.find((r) => r.metricKey === ALIGNMENT_INDEX_METRIC);
  const liveIndex = liveSignal.alignmentIndex;

  if (!overallReading || liveIndex === null) {
    return {
      available: false,
      overall: null,
      bestAction: null,
      rows: [],
      reportCard: [],
      emptyReason:
        "Your peer position opens once your alignment index is live and the benchmark has enough contributing firms to place you against the cohort.",
    };
  }
  const moduleReadings = readings.filter((r) => r.metricKey !== ALIGNMENT_INDEX_METRIC);

  const overallSuppressed = suppressed(overallReading);
  const youFor = (metricKey: string, fallback: number | null): number | null => {
    const live = liveSignal.moduleScores.get(metricKey);
    return typeof live === "number" ? live : fallback;
  };

  const rows: PercentileRow[] = moduleReadings.map((r) => {
    const you = youFor(r.metricKey, r.score);
    const anchors = distributionAnchors(r);
    return {
      key: r.metricKey,
      label: MODULE_TITLE.get(r.metricKey) ?? r.metricKey,
      p25: r.p25,
      p50: r.p50,
      p75: r.p75,
      p90: r.p90,
      score: you,
      percentile: you !== null && anchors.length ? percentileForValue(anchors, you) : r.percentile,
      suppressed: suppressed(r),
    };
  });

  const reportCard = moduleReadings.map((r) => {
    const you = youFor(r.metricKey, r.score);
    const withheld = suppressed(r) || you === null;
    let verdict: FirmPeerPosition["reportCard"][number]["verdict"] = "withheld";
    if (!withheld && typeof you === "number" && typeof r.p75 === "number" && typeof r.p25 === "number") {
      if (you >= r.p75) verdict = "ahead";
      else if (you < r.p25) verdict = "behind";
      else verdict = "on par";
    }
    return {
      key: r.metricKey,
      label: MODULE_TITLE.get(r.metricKey) ?? r.metricKey,
      you,
      peerLow: r.p25,
      peerHigh: r.p75,
      verdict,
    };
  });

  // Ranked action (B5-2): the module with the largest deficit to the peer top
  // quartile (p75) is the biggest single lever. Uses the LIVE "you" scores.
  let bestAction: FirmPeerPosition["bestAction"] = null;
  const overallAnchors = distributionAnchors(overallReading);
  const overallPercentile = overallAnchors.length
    ? percentileForValue(overallAnchors, liveIndex)
    : overallReading.percentile ?? 0;
  if (!overallSuppressed) {
    const candidates = moduleReadings
      .map((r) => ({ r, you: youFor(r.metricKey, r.score) }))
      .filter((c) => !suppressed(c.r) && typeof c.you === "number" && typeof c.r.p75 === "number")
      .map((c) => ({ r: c.r, deficit: Math.round((c.r.p75 as number) - (c.you as number)) }))
      .filter((c) => c.deficit > 0)
      .sort((a, b) => b.deficit - a.deficit);
    if (candidates.length > 0) {
      const top = candidates[0];
      const newIndex = liveIndex + top.deficit / FIRM_MODULE_DEFINITIONS.length;
      const toPercentile = Math.max(overallPercentile, percentileForValue(overallAnchors, newIndex));
      bestAction = {
        moduleLabel: MODULE_TITLE.get(top.r.metricKey) ?? top.r.metricKey,
        deficit: top.deficit,
        fromPercentile: overallPercentile,
        toPercentile,
      };
    }
  }

  const n = cohortN > 0 ? cohortN : overallReading.n;
  return {
    available: true,
    overall: overallSuppressed
      ? null
      : {
          percentile: overallPercentile,
          rankFromTop: Math.min(n, Math.max(1, n - Math.round((overallPercentile / 100) * n) + 1)),
          n,
          score: liveIndex,
        },
    bestAction,
    rows,
    reportCard,
    emptyReason: overallSuppressed
      ? `Insufficient peer data — the benchmark needs at least ${MIN_CONTRIBUTORS} contributing firms (currently ${n}).`
      : null,
  };
}

export function describePercentile(percentile: number, n: number): string {
  return `${ordinal(percentile)} percentile of ${n} firms`;
}

// ── F2 · Gap-to-Top-Quartile Plan ────────────────────────────────────────────

/** 15a: capability key → module KEY; the label resolves from the canonical
 *  MODULE_TITLE map (no hardcoded title drift). */
const MODULE_DOMAIN_TOKENS: Array<[RegExp, string]> = [
  [/data_flow|integration|data/, "firm_alignment_data_flow_v1"],
  [/governance|control|vendor|risk/, "firm_alignment_governance_v1"],
  [/automation|_ai|ai_/, "firm_alignment_automation_ai_v1"],
  [/strategy|change|market/, "firm_alignment_strategy_v1"],
  [/operating|workflow|model/, "firm_alignment_operating_model_v1"],
];
function moduleForCapability(key: string): string {
  for (const [re, moduleKey] of MODULE_DOMAIN_TOKENS)
    if (re.test(key)) return MODULE_TITLE.get(moduleKey) ?? "the related alignment modules";
  return "the related alignment modules";
}

export type GapItem = {
  key: string;
  title: string;
  score: number;
  threshold: number;
  gap: number;
  moduleLabel: string;
  narrative: string;
};

export type FirmGapPlan = {
  available: boolean;
  gaps: GapItem[];
  /** Closest-to-the-bar capabilities when nothing is below threshold (chart still renders). */
  watchList: GapItem[];
  clearedCount: number;
  totalCount: number;
  emptyReason: string | null;
};

type FirmReportsClient = { getFirmInsightReports: (companyId: string) => Promise<Map<string, {
  contributingCapabilities: Array<{ key: string; title: string; score: number | null; threshold: number; meetsThreshold: boolean }>;
}>> };

export async function buildFirmGapPlan(engine: FirmReportsClient, companyId: string): Promise<FirmGapPlan> {
  const reports = await engine.getFirmInsightReports(companyId);
  const byKey = new Map<string, { key: string; title: string; score: number | null; threshold: number; meetsThreshold: boolean }>();
  for (const report of reports.values()) {
    for (const cap of report.contributingCapabilities) {
      if (!byKey.has(cap.key)) byKey.set(cap.key, cap);
    }
  }
  const all = [...byKey.values()];
  const scored = all.filter((c) => typeof c.score === "number");
  if (scored.length === 0) {
    return {
      available: false,
      gaps: [],
      watchList: [],
      clearedCount: 0,
      totalCount: all.length,
      emptyReason: "Complete more alignment modules to open your gap-to-top-quartile plan.",
    };
  }
  const toItem = (c: (typeof scored)[number], belowBar: boolean): GapItem => {
    const score = Math.round(c.score as number);
    const gap = Math.round(c.threshold - score);
    const moduleLabel = moduleForCapability(c.key);
    return {
      key: c.key,
      title: c.title,
      score,
      threshold: c.threshold,
      gap,
      moduleLabel,
      narrative: belowBar
        ? `You are ${gap} point${gap === 1 ? "" : "s"} under the ${c.threshold}% bar on ${c.title.toLowerCase()}. The fastest lever is ${moduleLabel} — close that and this deficit moves first.`
        : `You clear the ${c.threshold}% bar on ${c.title.toLowerCase()} by ${-gap} point${-gap === 1 ? "" : "s"} — the thinnest margin. Watch ${moduleLabel} so it does not slip.`,
    };
  };
  const gaps = scored
    .filter((c) => (c.score as number) < c.threshold)
    .map((c) => toItem(c, true))
    .sort((a, b) => b.gap - a.gap);
  // closest-to-the-bar cleared capabilities (smallest headroom first) — keeps the
  // chart populated for a top-quartile firm with no gaps.
  const watchList = scored
    .filter((c) => (c.score as number) >= c.threshold)
    .map((c) => toItem(c, false))
    .sort((a, b) => a.gap - b.gap) // gap is negative (headroom); closest to 0 first
    .slice(-5)
    .reverse();
  return {
    available: true,
    gaps,
    watchList,
    clearedCount: scored.filter((c) => c.meetsThreshold).length,
    totalCount: scored.length,
    emptyReason: gaps.length === 0 ? "Every measured capability clears its threshold — here are the ones sitting closest to the bar." : null,
  };
}

// ── F3 · Trajectory ──────────────────────────────────────────────────────────

export type FirmTrajectory = {
  available: boolean;
  history: Array<{ label: string; score: number }>;
  projection: { score: number; low: number; high: number; label: string } | null;
  momentum: { trend: string; velocity: string; volatility: number; avgDelta: number } | null;
  /** "your best available swap moves you 48th → 71st percentile" */
  swapMovement: { fromPercentile: number; toPercentile: number } | null;
  /** Block 12d: what the projection is built from — the evidence + window, so the
   *  directional band is explained, never presented as a forecast-as-fact. */
  provenance: {
    snapshotCount: number;
    firstLabel: string;
    lastLabel: string;
    avgDelta: number;
    volatility: number;
  } | null;
  emptyReason: string | null;
};

type TrajectoryClient = Pick<PrismaClient, "firmMaturitySnapshot" | "firmMaturityMomentum">;

/**
 * 15d/16a — display-only evidence freshness: how recent the firm's newest
 * alignment snapshot is. Both Trajectory and Peer Position read the SAME
 * underlying firm assessment recency, so one helper feeds both surfaces. Age is
 * resolved by the canonical reader (lib/freshness) — no bespoke thresholds here.
 * Honest age only — no decay math, no staleness penalty on the numbers.
 */
export async function getFirmEvidenceFreshness(
  client: TrajectoryClient,
  companyId: string
): Promise<FreshnessReading | null> {
  const newest = await client.firmMaturitySnapshot.findFirst({
    where: { companyId },
    orderBy: { computedAt: "desc" },
    select: { computedAt: true },
  });
  return readFreshness(newest?.computedAt ?? null);
}

export async function buildFirmTrajectory(
  client: TrajectoryClient,
  companyId: string,
  options?: { currentPercentile?: number | null; bestSwapPercentile?: number | null; currentIndex?: number | null }
): Promise<FirmTrajectory> {
  const [snapshots, momentum] = await Promise.all([
    client.firmMaturitySnapshot.findMany({
      where: { companyId },
      orderBy: { computedAt: "asc" },
      select: { score: true, computedAt: true },
    }),
    client.firmMaturityMomentum.findFirst({ where: { companyId }, orderBy: { computedAt: "desc" } }),
  ]);

  if (snapshots.length < 2) {
    return {
      available: false,
      history: [],
      projection: null,
      momentum: null,
      swapMovement: null,
      provenance: null,
      emptyReason: "Your trajectory opens once PAT has at least two alignment snapshots over time.",
    };
  }

  const history = snapshots.map((s) => ({
    label: s.computedAt.toLocaleDateString("en-US", { month: "short" }),
    score: Math.round(s.score),
  }));
  // Block 12f — number integrity: the newest point (and therefore the face-card
  // "current index") is the ONE shared live alignment index, not the last stored
  // maturity snapshot, so Trajectory "current" == the alignment index everywhere.
  if (typeof options?.currentIndex === "number") {
    history[history.length - 1] = { label: history[history.length - 1].label, score: options.currentIndex };
  }

  // Directional projection: extend the recent average delta one step, band = ±volatility.
  const last = history[history.length - 1].score;
  const avgDelta = momentum?.avgDelta ?? (history[history.length - 1].score - history[0].score) / (history.length - 1);
  const vol = momentum?.volatility ?? 2;
  const projScore = Math.max(0, Math.min(100, Math.round(last + avgDelta)));
  const projection = {
    score: projScore,
    low: Math.max(0, Math.round(projScore - Math.max(1.5, vol))),
    high: Math.min(100, Math.round(projScore + Math.max(1.5, vol))),
    label: "next",
  };

  const swapMovement =
    typeof options?.currentPercentile === "number" && typeof options?.bestSwapPercentile === "number"
      ? { fromPercentile: options.currentPercentile, toPercentile: options.bestSwapPercentile }
      : null;

  return {
    available: true,
    history,
    projection,
    momentum: momentum
      ? { trend: momentum.trend, velocity: momentum.velocity, volatility: momentum.volatility, avgDelta: momentum.avgDelta }
      : null,
    swapMovement,
    provenance: {
      snapshotCount: history.length,
      firstLabel: history[0].label,
      lastLabel: history[history.length - 1].label,
      avgDelta: Math.round(avgDelta * 10) / 10,
      volatility: Math.round(Math.max(1.5, vol) * 10) / 10,
    },
    emptyReason: null,
  };
}

// ── V1 · Category Position ───────────────────────────────────────────────────

export type VendorCategoryPosition = {
  available: boolean;
  categories: Array<{
    category: string;
    mean: number;
    stdev: number;
    p25: number | null;
    p75: number | null;
    score: number;
    percentile: number;
    rankFromTop: number;
    n: number;
    quartile: 1 | 2 | 3 | 4;
    suppressed: boolean;
  }>;
  /** Ranked action: the published category with the largest gap to Q1 (p75). */
  topAction: { category: string; gap: number; n: number } | null;
  emptyReason: string | null;
};

function quartileOf(percentile: number): 1 | 2 | 3 | 4 {
  if (percentile >= 75) return 4;
  if (percentile >= 50) return 3;
  if (percentile >= 25) return 2;
  return 1;
}

export async function buildVendorCategoryPosition(
  client: ReaderClient,
  companyId: string,
  boundary: DataBoundary
): Promise<VendorCategoryPosition> {
  const readings = await getVendorCategoryReadings(client, companyId, boundary);
  const rated = readings.filter((r) => typeof r.score === "number");
  if (rated.length === 0) {
    return {
      available: false,
      categories: [],
      topAction: null,
      emptyReason: "Category position opens once firms have reviewed your products enough to place you in a category distribution.",
    };
  }
  const categories = rated.map((r) => ({
    category: r.metricKey,
    mean: r.mean ?? r.score ?? 0,
    stdev: r.stdev ?? 0,
    p25: r.p25,
    p75: r.p75,
    score: r.score as number,
    percentile: r.percentile ?? 0,
    rankFromTop: r.rankFromTop ?? 0,
    n: r.n,
    quartile: quartileOf(r.percentile ?? 0) as 1 | 2 | 3 | 4,
    suppressed: r.n < MIN_CONTRIBUTORS,
  }));
  // Ranked action: published category with the largest gap to Q1 (p75).
  const topAction = categories
    .filter((c) => !c.suppressed && typeof c.p75 === "number" && c.score < (c.p75 as number))
    .map((c) => ({ category: c.category, gap: Math.round((c.p75 as number) - c.score), n: c.n }))
    .sort((a, b) => b.gap - a.gap)[0] ?? null;
  return { available: true, categories, topAction, emptyReason: null };
}

// ── Hybrid Elite depth · Product cohort position ─────────────────────────────
// Where a SINGLE product ranks in its category's cohort of peer vendor products
// (percentile + band), computed from the same firm-reviewed product evidence the
// vendor benchmark uses — but at the product grain the offline benchmark stops
// at (it aggregates to vendor-per-category). This is a bounded read-time query
// (one category's products), only on the entitled Elite product-insight page.

export type ProductCohortPosition = {
  available: boolean;
  category: string;
  /** This product's firm-reviewed mean strength (0-100). */
  score: number;
  mean: number;
  p25: number | null;
  p75: number | null;
  percentile: number;
  rankFromTop: number;
  /** Distinct peer products (incl. this one) in the category cohort. */
  n: number;
  quartile: 1 | 2 | 3 | 4;
  suppressed: boolean;
  /** Ranked action: points to reach the category's top quartile (p75), or null when already there. */
  gapToTopQuartile: number | null;
  emptyReason: string | null;
};

type ProductCohortClient = Pick<PrismaClient, "product" | "surveySubmission">;

export async function buildProductCohortPosition(
  client: ProductCohortClient,
  input: { productId: string; category: string | null; boundaries: DataBoundary[] },
): Promise<ProductCohortPosition> {
  const empty = (reason: string): ProductCohortPosition => ({
    available: false,
    category: input.category ?? "Uncategorized",
    score: 0,
    mean: 0,
    p25: null,
    p75: null,
    percentile: 0,
    rankFromTop: 0,
    n: 0,
    quartile: 1,
    suppressed: false,
    gapToTopQuartile: null,
    emptyReason: reason,
  });

  if (!input.category) {
    return empty("Cohort position opens once this product is placed in a product category.");
  }

  // Peer products in the same category (across vendors) within the pool boundary.
  const peers = await client.product.findMany({
    where: { category: input.category, companyId: { not: null }, Company: { is: { dataBoundary: { in: input.boundaries } } } },
    select: { id: true },
  });
  const peerIds = peers.map((p) => p.id);
  if (!peerIds.includes(input.productId)) peerIds.push(input.productId);

  // Firm-reviewed strength per peer product = mean of its firm product-review scores.
  const reviews = await client.surveySubmission.findMany({
    where: getSurveyFinalWhere({
      SurveyModule: { is: { key: FIRM_PRODUCT_MODULE_KEY } },
      Subject: { is: { productId: { in: peerIds } } },
    }),
    select: { score: true, Subject: { select: { productId: true } } },
  });
  const scoresByProduct = new Map<string, number[]>();
  for (const r of reviews) {
    const pid = r.Subject?.productId;
    if (!pid || typeof r.score !== "number") continue;
    (scoresByProduct.get(pid) ?? scoresByProduct.set(pid, []).get(pid)!).push(r.score);
  }

  const productMeans: number[] = [];
  let thisScore: number | null = null;
  for (const [pid, scores] of scoresByProduct) {
    if (scores.length === 0) continue;
    const mean = scores.reduce((s, v) => s + v, 0) / scores.length;
    productMeans.push(mean);
    if (pid === input.productId) thisScore = mean;
  }

  if (thisScore === null) {
    return empty("Cohort position opens after firms review this product.");
  }

  const n = productMeans.length;
  const sorted = [...productMeans].sort((a, b) => a - b);
  const mean = sorted.reduce((s, v) => s + v, 0) / n;
  const p25 = percentileValue(sorted, 25);
  const p75 = percentileValue(sorted, 75);
  const percentile = Math.round(percentileRank(productMeans, thisScore));
  const rankFromTop = Math.max(1, n - Math.round((percentile / 100) * n) + 1);
  const score = Math.round(thisScore);
  const gapToTopQuartile =
    typeof p75 === "number" && score < p75 ? Math.round(p75 - score) : null;

  return {
    available: true,
    category: input.category,
    score,
    mean: Math.round(mean),
    p25,
    p75,
    percentile,
    rankFromTop: Math.min(n, rankFromTop),
    n,
    quartile: quartileOf(percentile) as 1 | 2 | 3 | 4,
    suppressed: n < MIN_CONTRIBUTORS,
    gapToTopQuartile,
    emptyReason: null,
  };
}

// ── Hybrid Elite depth · Product trajectory (mirror of F3 firm trajectory) ───
// Charts a product's firm-reviewed strength over time from real ProductMaturity
// snapshots. Opens only at >=2 points — until then the Trend pane stays honestly
// pending; never a fabricated line.

export type ProductTrajectory = {
  available: boolean;
  history: Array<{ label: string; score: number }>;
  projection: { score: number; low: number; high: number; label: string } | null;
  momentum: { trend: string; velocity: string; volatility: number; avgDelta: number } | null;
  emptyReason: string | null;
};

type ProductTrajectoryClient = Pick<PrismaClient, "productMaturitySnapshot" | "productMaturityMomentum">;

export async function buildProductTrajectory(
  client: ProductTrajectoryClient,
  productId: string
): Promise<ProductTrajectory> {
  const [snapshots, momentum] = await Promise.all([
    client.productMaturitySnapshot.findMany({
      where: { productId },
      orderBy: { computedAt: "asc" },
      select: { score: true, computedAt: true },
    }),
    client.productMaturityMomentum.findFirst({ where: { productId }, orderBy: { computedAt: "desc" } }),
  ]);

  if (snapshots.length < 2) {
    return {
      available: false,
      history: [],
      projection: null,
      momentum: null,
      emptyReason:
        "A product trajectory needs repeat firm reviews over time. PAT holds this back until there is real time-series evidence rather than showing a fabricated line — it opens as review history builds.",
    };
  }

  const history = snapshots.map((s) => ({
    label: s.computedAt.toLocaleDateString("en-US", { month: "short" }),
    score: Math.round(s.score),
  }));

  const last = history[history.length - 1].score;
  const avgDelta = momentum?.avgDelta ?? (last - history[0].score) / (history.length - 1);
  const vol = momentum?.volatility ?? 2;
  const projScore = Math.max(0, Math.min(100, Math.round(last + avgDelta)));
  const projection = {
    score: projScore,
    low: Math.max(0, Math.round(projScore - Math.max(1.5, vol))),
    high: Math.min(100, Math.round(projScore + Math.max(1.5, vol))),
    label: "next",
  };

  return {
    available: true,
    history,
    projection,
    momentum: momentum
      ? { trend: momentum.trend, velocity: momentum.velocity, volatility: momentum.volatility, avgDelta: momentum.avgDelta }
      : null,
    emptyReason: null,
  };
}

// ── V2 · Demand Signals ──────────────────────────────────────────────────────

/**
 * One demand row = one canonical product category the vendor competes in.
 *
 * Data classification (Cam 2026-07-12, [[project_demand_signals_data_classification]]):
 *   - `count` (per-category swap volume) is PRO-tier — the teaser that sells Elite.
 *   - `trend` and `topProduct` are ELITE-classified identity/motion. They are
 *     `null` on the Pro projection (identityAllowed=false), so a non-entitled
 *     caller never even receives them.
 */
export type DemandTrend = "up" | "down" | "flat";
export type DemandCategoryRow = {
  key: string;
  category: string;
  /** Current-window swap count for this category (Pro-tier). */
  count: number;
  /** Direction vs the prior equal window — ELITE only, null on the Pro projection. */
  trend: DemandTrend | null;
  /** The vendor's product most involved in this category this window — ELITE only. */
  topProduct: string | null;
};

export type VendorDemandSignals = {
  available: boolean;
  /** True → this projection carries Elite identity (trend/topProduct/rankedAction). */
  identityAllowed: boolean;
  windowLabel: string;
  earlySignal: boolean;
  totalIn: number;
  totalOut: number;
  /** swapped-IN categories (pipeline), ranked by count. */
  swappedIn: DemandCategoryRow[];
  /** swapped-OUT categories (churn risk), ranked by count. */
  swappedOut: DemandCategoryRow[];
  /** One ranked next step — ELITE only, null on the Pro projection. */
  rankedAction: string | null;
  emptyReason: string | null;
};

const DEMAND_WINDOW_DAYS = 90;
const DEMAND_EARLY_SIGNAL_FLOOR = 5;
const DEMAND_DEFAULT_CATEGORY = "Uncategorized";

type DemandClient = Pick<PrismaClient, "product" | "sandboxSwapEvent">;

type DemandProduct = { id: string; name: string; category: string | null };
type DemandEvent = { productId: string | null; createdAt: Date };

/** Bucket a side (in/out) of the demand flow into per-category rows. */
function buildDemandRows(
  events: DemandEvent[],
  productById: Map<string, DemandProduct>,
  currentSince: Date
): DemandCategoryRow[] {
  // category -> { current, prior, per-product current counts }
  const byCategory = new Map<string, { current: number; prior: number; products: Map<string, number> }>();
  for (const event of events) {
    if (!event.productId) continue;
    const product = productById.get(event.productId);
    if (!product) continue;
    const category = product.category ?? DEMAND_DEFAULT_CATEGORY;
    let bucket = byCategory.get(category);
    if (!bucket) {
      bucket = { current: 0, prior: 0, products: new Map() };
      byCategory.set(category, bucket);
    }
    if (event.createdAt >= currentSince) {
      bucket.current += 1;
      bucket.products.set(product.name, (bucket.products.get(product.name) ?? 0) + 1);
    } else {
      bucket.prior += 1;
    }
  }

  const rows: DemandCategoryRow[] = [];
  for (const [category, bucket] of byCategory) {
    if (bucket.current === 0) continue; // only surface categories active this window
    let topProduct: string | null = null;
    let topCount = -1;
    for (const [name, count] of bucket.products) {
      if (count > topCount) {
        topCount = count;
        topProduct = name;
      }
    }
    const trend: DemandTrend =
      bucket.current > bucket.prior ? "up" : bucket.current < bucket.prior ? "down" : "flat";
    rows.push({ key: category, category, count: bucket.current, trend, topProduct });
  }
  rows.sort((a, b) => b.count - a.count || a.category.localeCompare(b.category));
  return rows;
}

/**
 * V2 · Demand Signals — first-party intent from the Alignment Sandbox, grouped by
 * canonical product category. Swapped-IN is pipeline; swapped-OUT is churn risk.
 *
 * `identityAllowed` gates the Elite classification: a Pro caller passes false and
 * receives counts only (trend/topProduct/rankedAction stripped to null) so the
 * P0 direct-route wall holds — non-entitled never receives Elite-classified data.
 */
export async function buildVendorDemandSignals(
  client: DemandClient,
  companyId: string,
  poolBoundaries: DataBoundary[],
  options: { identityAllowed: boolean }
): Promise<VendorDemandSignals> {
  const products = (await client.product.findMany({
    where: { companyId },
    select: { id: true, name: true, category: true },
  })) as DemandProduct[];
  const productById = new Map(products.map((p) => [p.id, p]));
  const productIds = products.map((p) => p.id);
  const boundaries = poolBoundaries.map((b) => String(b));
  const currentSince = new Date(Date.now() - DEMAND_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const priorSince = new Date(Date.now() - 2 * DEMAND_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  // Read both windows (current + prior) so the trend arrow is computed, not guessed.
  const [inEvents, outEvents] = await Promise.all([
    client.sandboxSwapEvent.findMany({
      where: { vendorInId: companyId, boundary: { in: boundaries }, createdAt: { gte: priorSince } },
      select: { productInId: true, createdAt: true },
    }),
    productIds.length
      ? client.sandboxSwapEvent.findMany({
          where: { productOutId: { in: productIds }, boundary: { in: boundaries }, createdAt: { gte: priorSince } },
          select: { productOutId: true, createdAt: true },
        })
      : Promise.resolve([] as Array<{ productOutId: string | null; createdAt: Date }>),
  ]);

  const swappedIn = buildDemandRows(
    inEvents.map((e) => ({ productId: e.productInId, createdAt: e.createdAt })),
    productById,
    currentSince
  );
  const swappedOut = buildDemandRows(
    outEvents.map((e) => ({ productId: e.productOutId, createdAt: e.createdAt })),
    productById,
    currentSince
  );

  const totalIn = swappedIn.reduce((sum, row) => sum + row.count, 0);
  const totalOut = swappedOut.reduce((sum, row) => sum + row.count, 0);
  const earlySignal = totalIn + totalOut < DEMAND_EARLY_SIGNAL_FLOOR;

  // Ranked action: churn first (a swap-out is the sharper signal), else hottest
  // pipeline. Named product + category + the concrete next surface to open.
  let rankedAction: string | null = null;
  if (swappedOut.length > 0) {
    const top = swappedOut[0];
    rankedAction = `Your sharpest churn signal is ${top.category}${
      top.topProduct ? ` — ${top.topProduct}` : ""
    } left ${top.count} simulated stack${top.count === 1 ? "" : "s"} this window. Open the Alignment Gap Map for it and fix the dimensions firms read lowest.`;
  } else if (swappedIn.length > 0) {
    const top = swappedIn[0];
    rankedAction = `Your hottest pipeline is ${top.category}${
      top.topProduct ? ` — ${top.topProduct}` : ""
    } led ${top.count} swap-in${top.count === 1 ? "" : "s"}. Put it first in outreach while the signal is warm.`;
  }

  const stripped = (rows: DemandCategoryRow[]): DemandCategoryRow[] =>
    options.identityAllowed ? rows : rows.map((row) => ({ ...row, trend: null, topProduct: null }));

  return {
    available: true,
    identityAllowed: options.identityAllowed,
    windowLabel: `last ${DEMAND_WINDOW_DAYS} days`,
    earlySignal,
    totalIn,
    totalOut,
    swappedIn: stripped(swappedIn),
    swappedOut: stripped(swappedOut),
    rankedAction: options.identityAllowed ? rankedAction : null,
    emptyReason: null,
  };
}

// ── V3 · Alignment Gap Map ───────────────────────────────────────────────────

const V3_DIVERGENCE_FLOOR = 3; // firm reviews required before asserting divergence
const V3_DISPUTE_THRESHOLD = 10; // vendor over firm by >10 → firms read you lower

// Gap Map (V3) types + drill-down logic live in the client-safe lib/gapMapDrilldown
// so the "use client" card can import them without pulling this server graph
// (→ benchmarks → node:crypto). Re-exported here for server callers + tests.
export type {
  GapMapTone,
  GapMapCell,
  VendorGapMap,
  GapMapDrilldownPair,
  GapMapDrilldownInsight,
} from "@/lib/gapMapDrilldown";
export { buildGapMapDrilldownInsight } from "@/lib/gapMapDrilldown";
import type { GapMapCell, GapMapTone, VendorGapMap } from "@/lib/gapMapDrilldown";

export type GapMapProductInput = {
  productId: string;
  productName: string;
  firmAssessmentCount: number;
  firmDimensions: Array<{ key: string; title: string; score: number | null }>;
  vendorDimensions: Array<{ key: string; title: string; score: number | null }>;
};

export function buildVendorGapMap(products: GapMapProductInput[]): VendorGapMap {
  if (products.length === 0) {
    return { available: false, columns: [], rows: [], emptyReason: "Your gap map opens once your products carry both a self-assessment and firm reviews." };
  }
  // columns from the first product's dimension order
  const columns = products[0].firmDimensions.map((d) => ({ key: d.key, label: d.title }));
  const anyFirmReviewed = products.some((p) => p.firmAssessmentCount >= V3_DIVERGENCE_FLOOR);
  if (!anyFirmReviewed) {
    return {
      available: false,
      columns,
      rows: [],
      emptyReason: `No product yet has the ${V3_DIVERGENCE_FLOOR} firm reviews needed to read divergence. The map fills in as firms review your products.`,
    };
  }

  const rows = products.map((product) => {
    const vendorByKey = new Map(product.vendorDimensions.map((d) => [d.key, d.score]));
    const cells: GapMapCell[] = product.firmDimensions.map((dim) => {
      const firm = dim.score;
      const vendor = vendorByKey.get(dim.key) ?? null;
      if (product.firmAssessmentCount < V3_DIVERGENCE_FLOOR || firm === null) {
        return {
          key: dim.key,
          tone: "none" as GapMapTone,
          title: `${dim.title}: not enough firm reviews`,
          firmScore: null,
          vendorScore: typeof vendor === "number" ? vendor : null,
        };
      }
      const delta = typeof vendor === "number" ? Math.round(vendor - firm) : null;
      let tone: GapMapTone = "neutral";
      if (delta !== null && delta > V3_DISPUTE_THRESHOLD) tone = "dispute";
      else if (typeof vendor === "number" && firm >= vendor - V3_DISPUTE_THRESHOLD && firm >= vendor - 3) tone = "confirm";
      return {
        key: dim.key,
        tone,
        display: delta === null ? String(Math.round(firm)) : `${delta >= 0 ? "+" : ""}${delta}`,
        title: `${dim.title}: firms ${Math.round(firm)}${typeof vendor === "number" ? ` vs your ${Math.round(vendor)}` : ""}`,
        firmScore: firm,
        vendorScore: typeof vendor === "number" ? vendor : null,
      };
    });
    return { key: product.productId, label: product.productName, cells };
  });

  return { available: true, columns, rows, emptyReason: null };
}

// ── Elite hub face metrics (Block 12c) ───────────────────────────────────────
// Restore firm-standard card grammar on the Elite Insights HUBS: each entitled
// hub card leads with its OWN headline number sourced from the same builder that
// powers its detail surface (not a bare name + "ELITE" chip). Pure formatters so
// a contract test can lock the number format; the index pages call the builders.

// Block 12g: ONE hero number per card. The second quantity becomes a colored chip
// or a micro-visual, never a compound headline. Face types live in the client-safe
// lib/eliteHubFace (rendered by the "use client" grid); re-exported here.
export type { EliteHubChip, EliteHubMicro, EliteHubFace } from "@/lib/eliteHubFace";
import type { EliteHubFace } from "@/lib/eliteHubFace";

/** Firm hub faces keyed by tier-2 insight key. Null when the surface has no data. */
export function firmEliteHubMetrics(input: {
  peer: FirmPeerPosition;
  gapPlan: FirmGapPlan;
  trajectory: FirmTrajectory;
}): Record<string, EliteHubFace | null> {
  const { peer, gapPlan, trajectory } = input;

  // Trajectory: hero = current index; projected delta becomes a colored chip.
  let projectionFace: EliteHubFace | null = null;
  const current = trajectory.history.at(-1)?.score ?? null;
  if (trajectory.available && current !== null) {
    const delta = trajectory.projection ? Math.round(trajectory.projection.score - current) : null;
    projectionFace = {
      hero: `${Math.round(current)}`,
      chip:
        delta !== null
          ? {
              label: `${delta >= 0 ? "+" : ""}${delta} projected`,
              tone: delta >= 0 ? "positive" : "amber",
              arrow: delta >= 0 ? "up" : "down",
            }
          : undefined,
      // 15b: mini sparkline (last 7 snapshots + dashed projection) — fills the
      // right-hand white space on the hub card.
      micro: {
        kind: "sparkline",
        points: trajectory.history.slice(-7).map((h) => h.score),
        projection: trajectory.projection ? trajectory.projection.score : null,
      },
      sub: "alignment index · directional",
    };
  }

  // Peer Position: hero = percentile; micro percentile-band strip; N drops to detail.
  const benchmarkFace: EliteHubFace | null =
    peer.available && peer.overall
      ? {
          hero: `${ordinal(peer.overall.percentile)} percentile`,
          micro: { kind: "percentile-band", percentile: peer.overall.percentile },
          sub: "vs peer firms · module by module",
        }
      : null;

  // Gap-to-Top-Quartile: hero = points; biggest lever becomes an amber chip.
  const recommendationFace: EliteHubFace | null =
    peer.available && peer.bestAction
      ? {
          hero: `${Math.round(peer.bestAction.deficit)} pts`,
          chip: { label: `biggest lever: ${peer.bestAction.moduleLabel}`, tone: "amber" },
          sub: "to top quartile",
        }
      : gapPlan.available && gapPlan.totalCount > 0
        ? {
            hero: `${gapPlan.clearedCount} of ${gapPlan.totalCount}`,
            sub: "capabilities at their bar",
          }
        : null;

  return {
    firm_tier2_projection: projectionFace,
    firm_tier2_benchmark: benchmarkFace,
    firm_tier2_recommendation: recommendationFace,
  };
}

/** Vendor hub faces keyed by tier-2 insight key. Null when the surface has no data. */
export function vendorEliteHubMetrics(input: {
  category: VendorCategoryPosition;
  demand: VendorDemandSignals;
  gapMap: VendorGapMap;
}): Record<string, EliteHubFace | null> {
  const { category, demand, gapMap } = input;

  // Category Position: hero = "N of M" in the top band; micro band-dot row.
  let categoryFace: EliteHubFace | null = null;
  const published = category.categories.filter((c) => !c.suppressed);
  if (category.available && published.length > 0) {
    const topBand = published.filter((c) => c.quartile === 4).length;
    categoryFace = {
      hero: `${topBand} of ${published.length}`,
      micro: { kind: "band-dots", total: published.length, filled: topBand },
      sub: "products in top band",
    };
  }

  // Demand Signals: hero = net motion, colored by sign; no chip/micro.
  const net = demand.totalIn - demand.totalOut;
  const demandFace: EliteHubFace | null = demand.available
    ? {
        hero: `${net >= 0 ? "+" : ""}${net}`,
        heroTone: net >= 0 ? "positive" : "negative",
        sub: "net motion · 90 days",
      }
    : null;

  // Gap Map: hero = read-lower count (amber); confirmed becomes a green chip +
  // a two-segment micro bar.
  let gapMapFace: EliteHubFace | null = null;
  if (gapMap.available) {
    let confirmed = 0;
    let lower = 0;
    for (const row of gapMap.rows) {
      for (const cell of row.cells) {
        if (cell.tone === "confirm") confirmed += 1;
        else if (cell.tone === "dispute") lower += 1;
      }
    }
    gapMapFace = {
      hero: `${lower}`,
      heroTone: "amber",
      chip: { label: `${confirmed} confirmed`, tone: "positive" },
      micro: { kind: "two-segment", confirmed, lower },
      sub: "product-fit dimensions",
    };
  }

  return {
    "benchmark-comparison": categoryFace,
    "forward-projection": demandFace,
    "scenario-simulation": gapMapFace,
  };
}

// ── Firm tier-1 hybrid Elite depth (Block 12b) ───────────────────────────────
// Each firm tier-1 detail route (operating_baseline, automation_readiness,
// data_and_controls, change_alignment) gets a REAL Elite pane for entitled firms
// — the theme's peer-benchmark position (percentile band per module) + one ranked
// action — instead of locked-boundary boilerplate. Scopes buildFirmPeerPosition to
// the insight's own contributing modules. Honest suppression below the safe harbor.

export type FirmThemeDepth = {
  available: boolean;
  rows: PercentileRow[];
  /** The theme's biggest gap to the peer top quartile (p75). */
  rankedAction: { moduleLabel: string; deficit: number; percentile: number | null } | null;
  emptyReason: string | null;
};

export function buildFirmThemeDepth(peer: FirmPeerPosition, moduleKeys: readonly string[]): FirmThemeDepth {
  if (!peer.available) {
    return { available: false, rows: [], rankedAction: null, emptyReason: peer.emptyReason ?? "Peer position is not available yet." };
  }
  const keys = new Set(moduleKeys);
  const rows = peer.rows.filter((row) => keys.has(row.key) && !row.suppressed);
  if (rows.length === 0) {
    return {
      available: false,
      rows: [],
      rankedAction: null,
      emptyReason: "Not enough peer data on this theme's modules yet to open the Elite position.",
    };
  }
  let rankedAction: FirmThemeDepth["rankedAction"] = null;
  for (const row of rows) {
    if (row.score === null || row.p75 === null) continue;
    const deficit = Math.round(row.p75 - row.score);
    if (deficit > 0 && (!rankedAction || deficit > rankedAction.deficit)) {
      rankedAction = { moduleLabel: row.label, deficit, percentile: row.percentile };
    }
  }
  return { available: true, rows, rankedAction, emptyReason: null };
}
