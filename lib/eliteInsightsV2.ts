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
import { FIRM_MODULE_DEFINITIONS } from "@/lib/firmPat";
import { getFirmPeerReadings, getVendorCategoryReadings, ALIGNMENT_INDEX_METRIC, type BenchmarkReading } from "@/lib/benchmarks";
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

// ── V2 · Demand Signals ──────────────────────────────────────────────────────

export type VendorDemandSignals = {
  available: boolean;
  swappedIn: number;
  swappedOut: number;
  windowLabel: string;
  earlySignal: boolean;
  emptyReason: string | null;
};

const DEMAND_WINDOW_DAYS = 90;
const DEMAND_EARLY_SIGNAL_FLOOR = 5;

type DemandClient = Pick<PrismaClient, "product" | "sandboxSwapEvent">;

export async function buildVendorDemandSignals(
  client: DemandClient,
  companyId: string,
  poolBoundaries: DataBoundary[]
): Promise<VendorDemandSignals> {
  const products = await client.product.findMany({ where: { companyId }, select: { id: true } });
  const productIds = products.map((p) => p.id);
  const boundaries = poolBoundaries.map((b) => String(b));
  const since = new Date(Date.now() - DEMAND_WINDOW_DAYS * 24 * 60 * 60 * 1000);

  const [swappedIn, swappedOut] = await Promise.all([
    client.sandboxSwapEvent.count({
      where: { vendorInId: companyId, boundary: { in: boundaries }, createdAt: { gte: since } },
    }),
    productIds.length
      ? client.sandboxSwapEvent.count({
          where: { productOutId: { in: productIds }, boundary: { in: boundaries }, createdAt: { gte: since } },
        })
      : Promise.resolve(0),
  ]);

  const total = swappedIn + swappedOut;
  return {
    available: true,
    swappedIn,
    swappedOut,
    windowLabel: `last ${DEMAND_WINDOW_DAYS} days`,
    earlySignal: total < DEMAND_EARLY_SIGNAL_FLOOR,
    emptyReason: null,
  };
}

// ── V3 · Alignment Gap Map ───────────────────────────────────────────────────

const V3_DIVERGENCE_FLOOR = 3; // firm reviews required before asserting divergence
const V3_DISPUTE_THRESHOLD = 10; // vendor over firm by >10 → firms read you lower

export type GapMapTone = "confirm" | "dispute" | "neutral" | "none";

export type VendorGapMap = {
  available: boolean;
  columns: Array<{ key: string; label: string }>;
  rows: Array<{ key: string; label: string; cells: Array<{ key: string; tone: GapMapTone; display?: string; title?: string }> }>;
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
    const cells = product.firmDimensions.map((dim) => {
      const firm = dim.score;
      const vendor = vendorByKey.get(dim.key) ?? null;
      if (product.firmAssessmentCount < V3_DIVERGENCE_FLOOR || firm === null) {
        return { key: dim.key, tone: "none" as GapMapTone, title: `${dim.title}: not enough firm reviews` };
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
      };
    });
    return { key: product.productId, label: product.productName, cells };
  });

  return { available: true, columns, rows, emptyReason: null };
}
