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
  getVendorCategoryReadings,
  ALIGNMENT_INDEX_METRIC,
  percentileRank,
  percentileValue,
  type BenchmarkReading,
} from "@/lib/benchmarks";
import { getSurveyFinalWhere } from "@/lib/surveyDrafts";
import { MIN_CONTRIBUTORS } from "@/lib/benchmarkSuppression";
import type { PercentileRow } from "@/app/components/charts/PercentileBand";

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

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
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

export async function buildFirmPeerPosition(
  client: ReaderClient,
  companyId: string,
  boundary: DataBoundary
): Promise<FirmPeerPosition> {
  const readings = await getFirmPeerReadings(client, companyId, boundary);
  const overallReading = readings.find((r) => r.metricKey === ALIGNMENT_INDEX_METRIC);
  const moduleReadings = readings.filter((r) => r.metricKey !== ALIGNMENT_INDEX_METRIC);

  if (!overallReading || overallReading.score === null) {
    return {
      available: false,
      overall: null,
      bestAction: null,
      rows: [],
      reportCard: [],
      emptyReason:
        "Your peer position opens once your firm has completed enough alignment modules to place you in the benchmark.",
    };
  }

  const overallSuppressed = suppressed(overallReading);
  const rows: PercentileRow[] = moduleReadings.map((r) => ({
    key: r.metricKey,
    label: MODULE_TITLE.get(r.metricKey) ?? r.metricKey,
    p25: r.p25,
    p50: r.p50,
    p75: r.p75,
    p90: r.p90,
    score: r.score,
    percentile: r.percentile,
    suppressed: suppressed(r),
  }));

  const reportCard = moduleReadings.map((r) => {
    const withheld = suppressed(r) || r.score === null;
    let verdict: FirmPeerPosition["reportCard"][number]["verdict"] = "withheld";
    if (!withheld && typeof r.score === "number" && typeof r.p75 === "number" && typeof r.p25 === "number") {
      if (r.score >= r.p75) verdict = "ahead";
      else if (r.score < r.p25) verdict = "behind";
      else verdict = "on par";
    }
    return {
      key: r.metricKey,
      label: MODULE_TITLE.get(r.metricKey) ?? r.metricKey,
      you: r.score,
      peerLow: r.p25,
      peerHigh: r.p75,
      verdict,
    };
  });

  // Ranked action (B5-2): the module with the largest deficit to the peer top
  // quartile (p75) is the biggest single lever. Estimate the overall percentile
  // move by lifting the alignment index by deficit/5 (one of five modules) and
  // re-reading it against the alignment-index distribution. Directional.
  let bestAction: FirmPeerPosition["bestAction"] = null;
  if (!overallSuppressed) {
    const candidates = moduleReadings
      .filter((r) => !suppressed(r) && typeof r.score === "number" && typeof r.p75 === "number")
      .map((r) => ({ r, deficit: Math.round((r.p75 as number) - (r.score as number)) }))
      .filter((c) => c.deficit > 0)
      .sort((a, b) => b.deficit - a.deficit);
    if (candidates.length > 0) {
      const top = candidates[0];
      const anchors = [
        { p: 10, v: overallReading.p10 as number },
        { p: 25, v: overallReading.p25 as number },
        { p: 50, v: overallReading.p50 as number },
        { p: 75, v: overallReading.p75 as number },
        { p: 90, v: overallReading.p90 as number },
      ].filter((a) => typeof a.v === "number");
      const newIndex = overallReading.score + top.deficit / FIRM_MODULE_DEFINITIONS.length;
      const fromPercentile = overallReading.percentile ?? 0;
      const toPercentile = Math.max(fromPercentile, percentileForValue(anchors, newIndex));
      bestAction = {
        moduleLabel: MODULE_TITLE.get(top.r.metricKey) ?? top.r.metricKey,
        deficit: top.deficit,
        fromPercentile,
        toPercentile,
      };
    }
  }

  return {
    available: true,
    overall: overallSuppressed
      ? null
      : {
          percentile: overallReading.percentile ?? 0,
          rankFromTop: overallReading.rankFromTop ?? 0,
          n: overallReading.n,
          score: overallReading.score,
        },
    bestAction,
    rows,
    reportCard,
    emptyReason: overallSuppressed
      ? `Insufficient peer data — the benchmark needs at least ${MIN_CONTRIBUTORS} contributing firms (currently ${overallReading.n}).`
      : null,
  };
}

export function describePercentile(percentile: number, n: number): string {
  return `${ordinal(percentile)} percentile of ${n} firms`;
}

// ── F2 · Gap-to-Top-Quartile Plan ────────────────────────────────────────────

/** Best-effort capability→module label from the capability key's domain token. */
const MODULE_DOMAIN_TOKENS: Array<[RegExp, string]> = [
  [/data_flow|integration|data/, "Integration and Data Flow Maturity"],
  [/governance|control|vendor|risk/, "Governance, Controls, and Vendor Risk"],
  [/automation|_ai|ai_/, "Automation and AI Readiness"],
  [/strategy|change|market/, "Change and Market Alignment"],
  [/operating|workflow|model/, "Operating Model and Workflow Discipline"],
];
function moduleForCapability(key: string): string {
  for (const [re, title] of MODULE_DOMAIN_TOKENS) if (re.test(key)) return title;
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
  emptyReason: string | null;
};

type TrajectoryClient = Pick<PrismaClient, "firmMaturitySnapshot" | "firmMaturityMomentum">;

export async function buildFirmTrajectory(
  client: TrajectoryClient,
  companyId: string,
  options?: { currentPercentile?: number | null; bestSwapPercentile?: number | null }
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
      emptyReason: "Your trajectory opens once PAT has at least two alignment snapshots over time.",
    };
  }

  const history = snapshots.map((s) => ({
    label: s.computedAt.toLocaleDateString("en-US", { month: "short" }),
    score: Math.round(s.score),
  }));

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

export type GapMapTone = "confirm" | "dispute" | "neutral" | "none";

/** A single product × dimension cell. firmScore/vendorScore back the drill-down. */
export type GapMapCell = {
  key: string;
  tone: GapMapTone;
  display?: string;
  title?: string;
  /** Aggregated firm-review score for this dimension (null below the floor). */
  firmScore: number | null;
  /** Vendor self-report score for this dimension. */
  vendorScore: number | null;
};

export type VendorGapMap = {
  available: boolean;
  columns: Array<{ key: string; label: string }>;
  rows: Array<{ key: string; label: string; cells: GapMapCell[] }>;
  emptyReason: string | null;
};

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

/** A selected product × dimension pair for the Gap Map drill-down. */
export type GapMapDrilldownPair = {
  productLabel: string;
  dimLabel: string;
  firm: number | null;
  vendor: number | null;
};

export type GapMapDrilldownInsight = { takeaway: string; action: string } | null;

/**
 * One takeaway + one action for a Gap Map drill-down selection. Anchors on the
 * WIDEST dispute (firms reading furthest below the vendor's self-report) across
 * the selected pairs; if firms confirm everywhere, flips to a lead-with signal.
 * Null when no selected pair has both a firm read and a self-report.
 */
export function buildGapMapDrilldownInsight(pairs: GapMapDrilldownPair[]): GapMapDrilldownInsight {
  const scored = pairs.filter(
    (p): p is GapMapDrilldownPair & { firm: number; vendor: number } => p.firm !== null && p.vendor !== null
  );
  if (scored.length === 0) return null;
  const widest = scored.reduce((worst, p) => (p.vendor - p.firm > worst.vendor - worst.firm ? p : worst));
  const gap = Math.round(widest.vendor - widest.firm);
  if (gap > 0) {
    return {
      takeaway: `Firms read ${widest.productLabel}'s ${widest.dimLabel} ${gap} point${gap === 1 ? "" : "s"} below your self-report — the widest gap in your selection.`,
      action: `Fix the ${widest.dimLabel} story for ${widest.productLabel} first: add proof points or reset the claim so firms and your self-report converge.`,
    };
  }
  return {
    takeaway: `Across this selection, firms confirm your story — no dimension reads materially below your self-report.`,
    action: `Lead with ${widest.productLabel}'s ${widest.dimLabel} in outreach — firms back your rating there.`,
  };
}
