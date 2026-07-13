/**
 * Client-safe Gap Map (V3) types + pure drill-down logic. Lives apart from
 * lib/eliteInsightsV2 so the "use client" VendorGapMapCard can import it WITHOUT
 * pulling the server graph (eliteInsightsV2 → benchmarks → node:crypto, a
 * webpack "Unhandled scheme" build break — same landmine the sandbox lanes hit).
 * eliteInsightsV2 re-exports everything here, so server callers/tests are
 * unchanged.
 */

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
