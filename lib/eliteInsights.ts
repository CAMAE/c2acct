/**
 * Elite Insights v1 (P2 / Block 3) — the six data-grounded Elite surfaces.
 *
 * Each builder is PURE over already-fetched, boundary-scoped data (demo excluded
 * upstream via lib/dataBoundary.ts), so it is unit-testable and the pages own the
 * fetch. Every number carries an evidence grade (EVIDENCE-LINEAGE.md Surface 7), a
 * confidence band (lib/confidenceBands.ts), and — for cross-firm/peer cuts — the
 * minimum-n suppression from Governance Phase 2 (lib/benchmarkSuppression.ts,
 * n≥5 contributors / no single firm >25%). Where evidence can't honestly support a
 * number, the builder returns truthful-scope copy instead of a fabricated figure.
 *
 * Copy rule: directional/informational only — never a p-value, percentile, or
 * significance claim. See docs/elite-sprint/ELITE-INSIGHTS-DATA-MAP.md.
 */
import type { InsightSurfaceContent, InsightSurfaceItem } from "@/lib/insightSurface";
import { confidenceBandForSampleSize, CONFIDENCE_BAND_LABEL, type ConfidenceBand } from "@/lib/confidenceBands";
import {
  evaluateBenchmarkSuppressionByCount,
  INSUFFICIENT_PEER_DATA_LABEL,
  MIN_CONTRIBUTORS,
} from "@/lib/benchmarkSuppression";

export type EliteEvidenceGrade =
  | "firm-reviewed"
  | "vendor self-reported"
  | "blended"
  | "benchmark aggregate";

export type EliteInsightResult = {
  key: string;
  title: string;
  /** False → not enough honest evidence yet; the surface shows truthful-scope copy. */
  available: boolean;
  grade: EliteEvidenceGrade;
  confidenceBand: ConfidenceBand | null;
  confidenceLabel: string | null;
  /** One-line hero summary. */
  summary: string;
  /** The Elite detail surface (key "elite"). */
  content: InsightSurfaceContent;
};

function eliteContent(title: string, intro: string, items: InsightSurfaceItem[]): InsightSurfaceContent {
  return { key: "elite", title, intro, items };
}

function bandLabel(n: number): { band: ConfidenceBand; label: string } {
  const band = confidenceBandForSampleSize(n);
  return { band, label: CONFIDENCE_BAND_LABEL[band] };
}

function fmt(score: number | null | undefined): string {
  return typeof score === "number" ? `${Math.round(score)}` : "—";
}

// ── F1 · Firm future-state projection ────────────────────────────────────────

export type FutureStateInput = {
  currentAlignment: number | null;
  stackCount: number;
  dimensionAxes: { key: string; title: string }[];
  /** Current per-axis shape: mean of the stack pieces' dimension scores. */
  currentDimensions: { key: string; title: string; score: number | null; sampleSize: number }[];
  /** Best ranked (firm-reviewed) swap candidate, if any. */
  bestCandidate: { productName: string; projectedScore: number | null; grade: "firm_reviewed" | "vendor_reported" } | null;
};

export function buildFirmFutureStateProjection(input: FutureStateInput): EliteInsightResult {
  const title = "Future-state projection";
  const { band, label } = bandLabel(input.stackCount);

  if (input.currentAlignment === null || input.stackCount === 0) {
    return {
      key: "firm_tier2_projection",
      title,
      available: false,
      grade: "firm-reviewed",
      confidenceBand: "no_signal",
      confidenceLabel: CONFIDENCE_BAND_LABEL.no_signal,
      summary: "No reviewed products yet — a projection needs firm-reviewed evidence to model against.",
      content: eliteContent(
        title,
        "PAT does not project from an empty stack.",
        [
          {
            title: "What you'll see here",
            body: "Once your firm has reviewed products in its stack, this surface models the projected alignment of swapping a candidate in — computed from your own firm-reviewed evidence, per product-fit dimension. It is a projection, not a verified outcome.",
          },
        ]
      ),
    };
  }

  const items: InsightSurfaceItem[] = [
    {
      title: "Current alignment (firm-reviewed)",
      body: `Your stack's current alignment is ${fmt(input.currentAlignment)} — the mean of ${input.stackCount} firm-reviewed product${input.stackCount === 1 ? "" : "s"}. Confidence: ${label}. This is your own review evidence, not a projection.`,
    },
  ];

  if (input.bestCandidate && typeof input.bestCandidate.projectedScore === "number") {
    const delta = Math.round(input.bestCandidate.projectedScore) - Math.round(input.currentAlignment);
    const gradeWord = input.bestCandidate.grade === "firm_reviewed" ? "firm-reviewed" : "vendor self-reported (not yet firm-reviewed)";
    items.push({
      title: "Best projected swap (projection, not verified)",
      body: `Swapping in ${input.bestCandidate.productName} projects to ${fmt(input.bestCandidate.projectedScore)} (${delta >= 0 ? "+" : ""}${delta} vs current). Projection basis: ${gradeWord}. PAT re-means the stack with the candidate in place — a directional projection, not a guaranteed result.`,
    });
  }

  const gradedAxes = input.currentDimensions.filter((d) => typeof d.score === "number");
  const thinAxes = input.currentDimensions.filter((d) => d.sampleSize < 3);
  items.push({
    title: "Per-dimension shape",
    body:
      gradedAxes.length > 0
        ? `Across the five product-fit dimensions your current shape reads: ${input.currentDimensions
            .map((d) => `${d.title} ${fmt(d.score)}`)
            .join(" · ")}.${thinAxes.length ? ` ${thinAxes.length} axis/axes are sample-thin and held, not projected.` : ""}`
        : "No per-dimension review evidence yet — dimensions appear as firms answer the product-fit sections.",
  });

  return {
    key: "firm_tier2_projection",
    title,
    available: true,
    grade: "firm-reviewed",
    confidenceBand: band,
    confidenceLabel: label,
    summary: `Projected from ${input.stackCount} firm-reviewed product${input.stackCount === 1 ? "" : "s"} · directional projection, not verified.`,
    content: eliteContent(
      title,
      "A directional projection of your firm's alignment, modelled on your own firm-reviewed evidence per product-fit dimension. It is a projection, not a verified outcome.",
      items
    ),
  };
}

// ── F2 · Firm peer benchmark ─────────────────────────────────────────────────

export type PeerBenchmarkInput = {
  firmAlignmentIndex: number | null;
  platformAverageIndex: number | null;
  /** Distinct firms behind the platform average. */
  platformContributorCount: number;
  modules: {
    moduleKey: string;
    title: string;
    firmScore: number | null;
    peerAverage: number | null;
    peerContributorCount: number;
  }[];
};

export function buildFirmPeerBenchmark(input: PeerBenchmarkInput): EliteInsightResult {
  const title = "Peer benchmark view";
  const overall = evaluateBenchmarkSuppressionByCount(input.platformContributorCount);
  const { band, label } = bandLabel(input.platformContributorCount);

  const items: InsightSurfaceItem[] = [];

  if (overall.suppressed) {
    items.push({
      title: INSUFFICIENT_PEER_DATA_LABEL,
      body: `The anonymized platform benchmark needs at least ${MIN_CONTRIBUTORS} contributing firms before PAT publishes it (currently ${input.platformContributorCount}). Your own alignment index of ${fmt(input.firmAlignmentIndex)} is shown, but PAT will not present a peer comparison until the peer set clears the safe harbor.`,
    });
  } else {
    const delta =
      typeof input.firmAlignmentIndex === "number" && typeof input.platformAverageIndex === "number"
        ? Math.round(input.firmAlignmentIndex) - Math.round(input.platformAverageIndex)
        : null;
    items.push({
      title: "Overall alignment vs peers (benchmark aggregate)",
      body: `Your alignment index is ${fmt(input.firmAlignmentIndex)} against an anonymized platform average of ${fmt(input.platformAverageIndex)} across ${input.platformContributorCount} firms${
        delta === null ? "" : ` — ${delta >= 0 ? `${delta} above` : `${Math.abs(delta)} below`} the peer average`
      }. Confidence: ${label}. This is a cross-firm aggregate, not a ranking or percentile.`,
    });
  }

  const moduleLines = input.modules.map((module) => {
    const suppressed = evaluateBenchmarkSuppressionByCount(module.peerContributorCount).suppressed;
    if (suppressed) {
      return `${module.title}: your ${fmt(module.firmScore)} · peer benchmark withheld (insufficient peer data, ${module.peerContributorCount} firms)`;
    }
    return `${module.title}: your ${fmt(module.firmScore)} vs peer ${fmt(module.peerAverage)} (${module.peerContributorCount} firms)`;
  });
  if (moduleLines.length) {
    items.push({
      title: "Per-module comparison",
      body: `${moduleLines.join(" · ")}. Cuts below ${MIN_CONTRIBUTORS} contributing firms are suppressed, not shown as a number.`,
    });
  }

  return {
    key: "firm_tier2_benchmark",
    title,
    available: true,
    grade: "benchmark aggregate",
    confidenceBand: band,
    confidenceLabel: label,
    summary: overall.suppressed
      ? `Insufficient peer data — ${input.platformContributorCount} contributing firms (need ${MIN_CONTRIBUTORS}).`
      : `Anonymized platform aggregate · ${input.platformContributorCount} firms.`,
    content: eliteContent(
      title,
      "How your firm compares to an anonymized platform aggregate of other firms. Peer cuts below the minimum-n safe harbor are withheld, not estimated. This is a directional aggregate, not a ranking.",
      items
    ),
  };
}

// ── F3 · Firm recommendation engine ──────────────────────────────────────────

export type RecommendationInput = {
  /** Windowed ranked actions from the action-roadmap engine, firm-reviewed gaps. */
  windows: {
    window: string;
    actions: { text: string; detail: string; signalStrength: "high" | "medium" | "low" }[];
  }[];
  /** Evidence count behind the roadmap (e.g. scored modules) for the confidence band. */
  evidenceCount: number;
};

export function buildFirmRecommendations(input: RecommendationInput): EliteInsightResult {
  const title = "Recommendation engine";
  const { band, label } = bandLabel(input.evidenceCount);
  const totalActions = input.windows.reduce((sum, w) => sum + w.actions.length, 0);

  if (totalActions === 0) {
    return {
      key: "firm_tier2_recommendation",
      title,
      available: false,
      grade: "firm-reviewed",
      confidenceBand: "no_signal",
      confidenceLabel: CONFIDENCE_BAND_LABEL.no_signal,
      summary: "No sequenced recommendations yet — complete more alignment evidence to open them.",
      content: eliteContent(
        title,
        "PAT sequences recommendations from your firm-reviewed gaps.",
        [
          {
            title: "What you'll see here",
            body: "Once your firm has enough alignment evidence, this surface sequences prioritized next actions across 30/60/90-day windows, ranked by how strongly the evidence points to each. Recommendations are grounded in your firm-reviewed gaps, not generic advice.",
          },
        ]
      ),
    };
  }

  const items: InsightSurfaceItem[] = input.windows
    .filter((w) => w.actions.length > 0)
    .map((w) => ({
      title: `${w.window} window`,
      body: w.actions
        .map((a) => `[${a.signalStrength} signal] ${a.text}${a.detail ? ` — ${a.detail}` : ""}`)
        .join("  ·  "),
    }));

  return {
    key: "firm_tier2_recommendation",
    title,
    available: true,
    grade: "firm-reviewed",
    confidenceBand: band,
    confidenceLabel: label,
    summary: `${totalActions} sequenced action${totalActions === 1 ? "" : "s"} from your firm-reviewed gaps · confidence ${label}.`,
    content: eliteContent(
      title,
      "Prioritized next actions sequenced across 30/60/90-day windows, ranked by how strongly your firm-reviewed evidence points to each. Grounded in your gaps, not generic advice.",
      items
    ),
  };
}

// ── V1 · Vendor market/benchmark comparison ─────────────────────────────────

export type MarketComparisonRow = {
  label: string;
  /** The vendor's scoped firm-reviewed average for this cut (0–100). */
  subjectAverage: number | null;
  /** Distinct firms behind the vendor's cut. */
  subjectContributorCount: number;
  /** The anonymized platform/market average for the same cut. */
  peerAverage: number | null;
  /** Distinct firms behind the platform cut (suppression basis). */
  peerContributorCount: number;
};

export type MarketComparisonInput = { rows: MarketComparisonRow[] };

export function buildVendorMarketComparison(input: MarketComparisonInput): EliteInsightResult {
  const title = "Benchmark comparison";
  const rated = input.rows.filter((r) => typeof r.subjectAverage === "number");
  const maxContributors = Math.max(0, ...input.rows.map((r) => r.peerContributorCount));
  const { band, label } = bandLabel(maxContributors);

  if (rated.length === 0) {
    return {
      key: "benchmark-comparison",
      title,
      available: false,
      grade: "benchmark aggregate",
      confidenceBand: "no_signal",
      confidenceLabel: CONFIDENCE_BAND_LABEL.no_signal,
      summary: "No firm-reviewed evidence yet — a market benchmark needs firm reviews across your firms.",
      content: eliteContent(
        title,
        "PAT compares your firms to the wider platform once firm-reviewed evidence exists.",
        [
          {
            title: "What you'll see here",
            body: "When your firms carry firm-reviewed evidence, this surface compares each dimension to an anonymized platform aggregate of all firms. Cuts below the minimum-n safe harbor are withheld rather than estimated.",
          },
        ]
      ),
    };
  }

  const items: InsightSurfaceItem[] = input.rows.map((r) => {
    if (typeof r.subjectAverage !== "number") {
      return { title: r.label, body: "No firm-reviewed evidence yet — awaiting firm review, not compared." };
    }
    const suppressed = evaluateBenchmarkSuppressionByCount(r.peerContributorCount).suppressed;
    if (suppressed) {
      return {
        title: r.label,
        body: `Your firms' average ${fmt(r.subjectAverage)} (${r.subjectContributorCount} firms). Platform benchmark withheld — insufficient peer data (${r.peerContributorCount} firms).`,
      };
    }
    const delta = Math.round(r.subjectAverage) - Math.round(r.peerAverage ?? 0);
    return {
      title: r.label,
      body: `Your firms' average ${fmt(r.subjectAverage)} vs platform aggregate ${fmt(r.peerAverage)} across ${r.peerContributorCount} firms — ${delta >= 0 ? `${delta} above` : `${Math.abs(delta)} below`} platform. Directional aggregate, not a market ranking.`,
    };
  });

  return {
    key: "benchmark-comparison",
    title,
    available: true,
    grade: "benchmark aggregate",
    confidenceBand: band,
    confidenceLabel: label,
    summary: `Your firms vs an anonymized platform aggregate · confidence ${label}.`,
    content: eliteContent(
      title,
      "How the firms you sell into compare to an anonymized platform aggregate of all firms, per alignment module. Cuts below the minimum-n safe harbor are withheld, not estimated. Directional, not a market ranking.",
      items
    ),
  };
}

// ── V2 · Vendor future demand projection ─────────────────────────────────────

export type FutureDemandInput = {
  /** Cross-firm weak modules (ascending averageScore = strongest demand), firm-reviewed. */
  weakModules: { title: string; averageScore: number | null; contributorCount: number }[];
};

export function buildVendorFutureDemand(input: FutureDemandInput): EliteInsightResult {
  const title = "Future demand projection";
  // Only modules that clear the safe harbor can carry a published demand signal.
  const eligible = input.weakModules
    .filter((m) => typeof m.averageScore === "number" && !evaluateBenchmarkSuppressionByCount(m.contributorCount).suppressed)
    .sort((a, b) => (a.averageScore ?? 0) - (b.averageScore ?? 0));
  const maxContributors = Math.max(0, ...input.weakModules.map((m) => m.contributorCount));
  const { band, label } = bandLabel(maxContributors);

  if (eligible.length === 0) {
    return {
      key: "future-demand",
      title,
      available: false,
      grade: "benchmark aggregate",
      confidenceBand: "no_signal",
      confidenceLabel: CONFIDENCE_BAND_LABEL.no_signal,
      summary: "Insufficient peer data — demand signal needs enough firms per module.",
      content: eliteContent(
        title,
        "PAT reads directional demand from where firms are weakest, once enough firms contribute.",
        [
          {
            title: "What you'll see here",
            body: `The weakest firm-side modules across the platform signal where buyers need the most help — a directional demand read. Modules with fewer than ${MIN_CONTRIBUTORS} contributing firms are withheld rather than presented as a trend.`,
          },
        ]
      ),
    };
  }

  const items: InsightSurfaceItem[] = eligible.map((m, index) => ({
    title: `${index + 1}. ${m.title}`,
    body: `Firm-side average ${fmt(m.averageScore)} across ${m.contributorCount} firms — the lower the average, the stronger the directional demand for help here. Directional signal, not a forecast.`,
  }));

  return {
    key: "future-demand",
    title,
    available: true,
    grade: "benchmark aggregate",
    confidenceBand: band,
    confidenceLabel: label,
    summary: `${eligible.length} demand signal${eligible.length === 1 ? "" : "s"} from firm-side gaps · directional, confidence ${label}.`,
    content: eliteContent(
      title,
      "Where firms are weakest is where buyers need the most help — a directional demand read from firm-reviewed gaps. Modules below the minimum-n safe harbor are withheld. Directional, not a forecast.",
      items
    ),
  };
}

// ── V3 · Vendor expansion simulation (sandbox-for-vendors) ───────────────────

export type ExpansionCandidate = {
  productName: string;
  grade: "firm_reviewed" | "vendor_reported";
  projectedScore: number | null;
  dimensions: { title: string; score: number | null; sampleSize: number }[];
};

export type ExpansionSimulationInput = {
  candidates: ExpansionCandidate[];
};

export function buildVendorExpansionSimulation(input: ExpansionSimulationInput): EliteInsightResult {
  const title = "Expansion simulation";
  // Sandbox floor: firm-reviewed candidates rank; vendor-reported are floored below.
  const firmReviewed = input.candidates
    .filter((c) => c.grade === "firm_reviewed" && typeof c.projectedScore === "number")
    .sort((a, b) => (b.projectedScore ?? 0) - (a.projectedScore ?? 0));
  const vendorReported = input.candidates.filter((c) => c.grade === "vendor_reported");
  const { band, label } = bandLabel(firmReviewed.length);

  const items: InsightSurfaceItem[] = [];

  if (firmReviewed.length > 0) {
    items.push({
      title: "Ranked expansion fits (firm-reviewed)",
      body: firmReviewed
        .map((c, index) => `${index + 1}. ${c.productName} — projected ${fmt(c.projectedScore)}`)
        .join("  ·  "),
    });
  }

  if (vendorReported.length > 0) {
    items.push({
      title: "Not yet firm-reviewed (vendor self-reported — floored)",
      body: `${vendorReported
        .map((c) => `${c.productName}${typeof c.projectedScore === "number" ? ` — self-reported ${fmt(c.projectedScore)}` : ""}`)
        .join("  ·  ")}. These are vendor self-report only and never outrank firm-reviewed fits — they need firm reviews to enter the ranked list.`,
    });
  }

  // Truthful-scope: if there is no firm-reviewed evidence at all, lead honestly.
  if (firmReviewed.length === 0) {
    return {
      key: "expansion-simulation",
      title,
      available: false,
      grade: "vendor self-reported",
      confidenceBand: vendorReported.length ? "sample_thin" : "no_signal",
      confidenceLabel: vendorReported.length ? CONFIDENCE_BAND_LABEL.sample_thin : CONFIDENCE_BAND_LABEL.no_signal,
      summary:
        vendorReported.length > 0
          ? "Vendor self-report only — no firm-reviewed evidence yet to simulate a ranked expansion."
          : "No product evidence yet to simulate an expansion.",
      content: eliteContent(
        title,
        "PAT simulates expansion fit from firm-reviewed evidence, with vendor self-report floored below it. Until firm reviews exist, this surface stays honestly scoped.",
        items.length
          ? items
          : [
              {
                title: "What you'll see here",
                body: "When your products carry firm-reviewed evidence, this surface simulates adding or expanding a product across the five product-fit dimensions, ranked by projected fit. Vendor self-reported candidates are shown separately and floored — they never outrank firm-reviewed fits.",
              },
            ]
      ),
    };
  }

  return {
    key: "expansion-simulation",
    title,
    available: true,
    grade: vendorReported.length ? "blended" : "firm-reviewed",
    confidenceBand: band,
    confidenceLabel: label,
    summary: `${firmReviewed.length} firm-reviewed expansion fit${firmReviewed.length === 1 ? "" : "s"} ranked${vendorReported.length ? `, ${vendorReported.length} vendor-reported floored` : ""} · confidence ${label}.`,
    content: eliteContent(
      title,
      "A sandbox for vendors: simulate adding or expanding a product across the five product-fit dimensions. Firm-reviewed fits are ranked; vendor self-reported candidates are floored below and never outrank them. Directional, not a guaranteed outcome.",
      items
    ),
  };
}
