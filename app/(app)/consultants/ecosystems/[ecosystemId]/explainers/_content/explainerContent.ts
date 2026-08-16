import type { EcosystemDetailData } from "@/lib/ecosystem";

// WS11-E: Stat-card explainer content. Each of the 5 HeadlineMetricsRow
// tiles maps to one entry here; the dynamic route at
// /consultants/ecosystems/[id]/explainers/[metricKey]/page.tsx looks up
// metricKey against this map. Keep keys in sync with the URL slugs the
// HeadlineMetricsRow Link wrappers emit.

export type MetricKey =
  | "avg-alignment"
  | "coverage"
  | "module-completion"
  | "hot-divergences"
  | "priority-actions";

const METRIC_KEYS: ReadonlyArray<MetricKey> = [
  "avg-alignment",
  "coverage",
  "module-completion",
  "hot-divergences",
  "priority-actions",
];

export function isMetricKey(value: string): value is MetricKey {
  return (METRIC_KEYS as readonly string[]).includes(value);
}

export type ExplainerBand = {
  range: string;
  label: string;
  note: string;
};

export type ExplainerDrilldownRow = {
  firmCompanyId: string;
  firmCompanyName: string;
  value: string;
  sortKey: number;
};

export type ExplainerPerFirmDrilldown = {
  columnLabel: string;
  rowsFrom: (ecosystem: EcosystemDetailData) => ExplainerDrilldownRow[];
};

export type ExplainerContent = {
  title: string;
  unitLabel: string;
  headline: string;
  whatItMeasures: string;
  howComputed: string;
  bands?: ExplainerBand[];
  whereToDrill?: string;
  valueFrom: (ecosystem: EcosystemDetailData) => string;
  // WS11-I: optional per-firm drilldown rendered as a sortable table below
  // the bands. Each row is precomputed against EcosystemDetailData so the
  // explainer page performs no fetches beyond getEcosystemDetailForConsultant.
  perFirmDrilldown?: ExplainerPerFirmDrilldown;
};

export const EXPLAINER_CONTENT: Record<MetricKey, ExplainerContent> = {
  "avg-alignment": {
    title: "Average alignment score",
    unitLabel: "0–100",
    headline:
      "How aligned the firms in this ecosystem are with the vendor's stated operating model — averaged across every firm with a canonical score on file.",
    whatItMeasures:
      "The mean firm-side canonical alignment score across all firms in this ecosystem. Each firm contributes one score; firms with no submitted modules contribute null and are excluded from the average. 100 means every firm perfectly mirrors the vendor's stated stack; 0 means no firm has aligned at all.",
    howComputed:
      "Mean of canonicalFirmScore across the BriefingCatalogItem set for this ecosystem, rounded to the nearest integer. Computed in lib/ecosystem.ts:avgFirmAlignmentScore. Null when no firm in the ecosystem has a score on file.",
    bands: [
      { range: "≥ 75", label: "High alignment", note: "Strong network consensus with the vendor stack." },
      { range: "50 – 74", label: "Mid alignment", note: "Productive divergence; flag for review." },
      { range: "< 50", label: "Low alignment", note: "Firms are operating off a different model than the vendor claims." },
    ],
    whereToDrill:
      "Open the Firm briefings table on the ecosystem detail page for the per-firm canonical score. Click any firm name for its full alignment brief (operating-alignment panel).",
    valueFrom: (ecosystem) =>
      ecosystem.avgFirmAlignmentScore === null ? "—" : `${ecosystem.avgFirmAlignmentScore}%`,
  },

  coverage: {
    title: "Coverage",
    unitLabel: "products · firm reviews",
    headline:
      "How wide and deep the firms in this ecosystem are looking at the vendor — product count is what's in scope, firm-review count is how much of it firms have engaged.",
    whatItMeasures:
      "Two numbers in one tile: (1) the count of products in the vendor's catalog visible to firms in this ecosystem; (2) the total firm-side product reviews on file, summed across all firms × all products. A high product count with low review count means firms haven't engaged the catalog yet.",
    howComputed:
      "productCount = lib/firmPat.ts:getFirmProductCatalog scope size. firmReviewCount = sum of completed firm product assessment submissions across the ecosystem, from the vendor-product insight snapshots. Both wrapped in lib/ecosystem.ts under vendorProductCoverage.",
    whereToDrill:
      "Click \"View full vendor brief\" on the ecosystem detail, then switch to the Product comparison panel for the per-product scoreboard. The Per-firm coverage matrix below shows which firms have reviewed which products.",
    valueFrom: (ecosystem) =>
      `${ecosystem.vendorProductCoverage.productCount} products · ${ecosystem.vendorProductCoverage.firmReviewCount} firm reviews`,
  },

  "module-completion": {
    title: "Module completion",
    unitLabel: "percent",
    headline:
      "How much of the PAT module catalog the firms in this ecosystem have actually completed. The remainder is the work-in-flight.",
    whatItMeasures:
      "Average percentage of the 5 canonical firm-alignment modules completed across firms in the ecosystem. A firm is at 100% once it has submitted final responses to all 5 modules; drafts (scoreVersion=0) don't count toward completion.",
    howComputed:
      "Mean of summarizeFirmAlignmentProgress(modules).completionPercent across all firms in the ecosystem, rounded. Source: lib/ecosystem.ts:avgModuleCompletion. Null when no firms have any submissions.",
    whereToDrill:
      "The Firm briefings table's Modules column shows per-firm completion percentages. On the firm side, /firm/alignment-assessment surfaces the same data with module-level draft state and resume links.",
    valueFrom: (ecosystem) =>
      ecosystem.moduleCompletionRate === null ? "—" : `${ecosystem.moduleCompletionRate}%`,
    perFirmDrilldown: {
      columnLabel: "% complete",
      rowsFrom: (ecosystem) =>
        ecosystem.firmGrid.map((row) => ({
          firmCompanyId: row.firmCompanyId,
          firmCompanyName: row.firmCompanyName,
          value: row.moduleCompletionPercent === null ? "—" : `${row.moduleCompletionPercent}%`,
          sortKey: row.moduleCompletionPercent ?? -1,
        })),
    },
  },

  "hot-divergences": {
    title: "Hot divergences",
    unitLabel: "gaps",
    headline:
      "How many vendor-vs-firm capability gaps exceed the 10-point conversation threshold across products in this ecosystem.",
    whatItMeasures:
      "Assessment-identified capability gaps where the vendor's stated capabilities and the firm's experienced capabilities are not in alignment — surfaced here when the gap exceeds 10 points.",
    howComputed:
      "Filter AdminCompanyBriefing.productLayer.products for |canonicalFirmReviewScore − vendorSelfReportedScore| ≥ HOT_DIVERGENCE_THRESHOLD (10). Sum across all firm briefings. Source: lib/ecosystem.ts:countHotDivergences.",
    bands: [
      { range: "0", label: "Aligned", note: "Vendor self-report matches firm consensus." },
      { range: "1 – 2", label: "Worth noting", note: "Surface in the next operating review." },
      { range: "3+", label: "Action required", note: "Vendor-side calibration session indicated." },
    ],
    whereToDrill:
      "Open the vendor brief, switch to the Positioning visual panel for the radar (where polygons diverge most), then the Product comparison panel for the per-gap delta scoreboard with the orange/green direction colors.",
    valueFrom: (ecosystem) => String(ecosystem.activeDivergenceCount),
    perFirmDrilldown: {
      columnLabel: "Hot divergences",
      rowsFrom: (ecosystem) =>
        ecosystem.firmGrid.map((row) => ({
          firmCompanyId: row.firmCompanyId,
          firmCompanyName: row.firmCompanyName,
          value: String(row.hotDivergenceCount),
          // Most divergences first.
          sortKey: -row.hotDivergenceCount,
        })),
    },
  },

  "priority-actions": {
    title: "30-day priority actions",
    unitLabel: "actions",
    headline:
      "How many near-term actions PAT has surfaced across firms in this ecosystem — the 30-day cohort from each firm's deterministic action roadmap.",
    whatItMeasures:
      "As invited firms complete their modular assessments in PAT Pro, PAT generates a detailed list of near-term priority actions for consideration.",
    howComputed:
      "For each firm's AdminCompanyBriefing, count nextActions[].window === \"30 days\"; sum across firms. Source: lib/ecosystem.ts:countThirtyDayActions.",
    whereToDrill:
      "The firm-side 6-quarter roadmap panel (firm-brief, roadmap panel) shows each firm's full 6-quarter action sequence. The 30-day cohort is Q1 of each firm's roadmap.",
    valueFrom: (ecosystem) => String(ecosystem.thirtyDayActionCount),
    perFirmDrilldown: {
      columnLabel: "30-day actions",
      rowsFrom: (ecosystem) =>
        ecosystem.firmGrid.map((row) => ({
          firmCompanyId: row.firmCompanyId,
          firmCompanyName: row.firmCompanyName,
          value: String(row.thirtyDayActionCount),
          // Most pending actions first.
          sortKey: -row.thirtyDayActionCount,
        })),
    },
  },
};
