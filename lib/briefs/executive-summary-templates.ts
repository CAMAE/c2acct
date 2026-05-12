/**
 * Phase-4 Day-15 executive-summary phrase bank.
 *
 * Deterministic prose — every sentence is keyed to a data threshold the
 * upstream generator measures from engine output, and is rendered with
 * literal interpolation of the underlying numbers. No LLM, no
 * consultant-authored copy, no opinion words.
 *
 * Per PAT-5.7-Brief-Mocks-Vendor-and-Firm.md page 1 + Section 0 principle 7.
 *
 * Add a template by:
 *   1. Adding it to the bank with a threshold key the generator measures.
 *   2. Wiring the threshold check in lib/briefs.ts:generateExecutiveSummary.
 *   3. Adding a unit test that exercises the threshold boundary.
 */

export type ExecutiveSummaryHeadlinePattern = {
  key: "compare-scores" | "scope-only";
  template: (slots: {
    ecosystemName: string;
    firmCount: number;
    avgFirmScore: number | null;
    avgVendorSelfReport: number | null;
  }) => string;
};

export const HEADLINE_PATTERNS: ExecutiveSummaryHeadlinePattern[] = [
  {
    key: "compare-scores",
    template: ({ ecosystemName, firmCount, avgFirmScore, avgVendorSelfReport }) => {
      if (avgFirmScore === null || avgVendorSelfReport === null) {
        return `${ecosystemName}: ${firmCount} firm${firmCount === 1 ? "" : "s"} in scope.`;
      }
      return `${ecosystemName}'s ${firmCount} firm${firmCount === 1 ? "" : "s"} average ${avgFirmScore} alignment vs ${avgVendorSelfReport} self-report.`;
    },
  },
  {
    key: "scope-only",
    template: ({ ecosystemName, firmCount }) =>
      `${ecosystemName}: ${firmCount} firm${firmCount === 1 ? "" : "s"} in scope.`,
  },
];

export type ExecutiveSummaryBodyPattern = {
  key:
    | "hot-divergence-some"
    | "hot-divergence-none"
    | "high-confidence-majority"
    | "low-confidence-majority"
    | "coverage-gaps"
    | "coverage-complete";
  /** Returns the rendered string when the threshold fires, null when it does not. */
  render: (slots: {
    hotDivergences: number;
    productCount: number;
    groundedCount: number;
    emergingCount: number;
    sampleThinCount: number;
    earlySignalCount: number;
    noSignalCount: number;
    firmCount: number;
    bucketsCovered: number;
    bucketsTotal: number;
  }) => string | null;
};

export const BODY_PATTERNS: ExecutiveSummaryBodyPattern[] = [
  {
    key: "hot-divergence-some",
    render: ({ hotDivergences }) => {
      if (hotDivergences <= 0) return null;
      return `${hotDivergences} product${hotDivergences === 1 ? "" : "s"} show${hotDivergences === 1 ? "s" : ""} a material gap between vendor self-report and firm-reviewed scores. The Self-vs-Market Delta section below ranks these by magnitude.`;
    },
  },
  {
    key: "hot-divergence-none",
    render: ({ hotDivergences, productCount }) => {
      if (hotDivergences !== 0 || productCount === 0) return null;
      return `No products are flagged as hot divergences this quarter. Vendor self-report and firm-reviewed averages track within a 10-point band across all ${productCount} products.`;
    },
  },
  {
    key: "high-confidence-majority",
    render: ({ groundedCount, firmCount }) => {
      if (firmCount === 0) return null;
      if (groundedCount * 2 < firmCount) return null;
      return `${groundedCount} of ${firmCount} firm${firmCount === 1 ? "" : "s"} are on grounded signal — the underlying scores carry full confidence.`;
    },
  },
  {
    key: "low-confidence-majority",
    render: ({ sampleThinCount, earlySignalCount, noSignalCount, firmCount }) => {
      if (firmCount === 0) return null;
      const lowConfidence = sampleThinCount + earlySignalCount + noSignalCount;
      if (lowConfidence * 2 <= firmCount) return null;
      return `${lowConfidence} of ${firmCount} firm${firmCount === 1 ? "" : "s"} are on sample-thin, early, or no-signal status — read the numbers in this brief as directional until more submissions land.`;
    },
  },
  {
    key: "coverage-gaps",
    render: ({ bucketsCovered, bucketsTotal }) => {
      if (bucketsCovered >= bucketsTotal) return null;
      const gap = bucketsTotal - bucketsCovered;
      return `Vendor catalog covers ${bucketsCovered} of ${bucketsTotal} function buckets; ${gap} bucket${gap === 1 ? "" : "s"} remain unmapped in this ecosystem.`;
    },
  },
  {
    key: "coverage-complete",
    render: ({ bucketsCovered, bucketsTotal }) => {
      if (bucketsCovered < bucketsTotal) return null;
      return `Vendor catalog covers all ${bucketsTotal} function buckets in this ecosystem — there are no gaps to source against.`;
    },
  },
];

export type ConfidenceCalloutSlots = {
  groundedCount: number;
  emergingCount: number;
  sampleThinCount: number;
  earlySignalCount: number;
  noSignalCount: number;
  firmCount: number;
};

export function renderConfidenceCallout(slots: ConfidenceCalloutSlots): string {
  if (slots.firmCount === 0) return "No firm signal yet.";
  const parts: string[] = [];
  if (slots.groundedCount > 0) parts.push(`${slots.groundedCount} grounded`);
  if (slots.emergingCount > 0) parts.push(`${slots.emergingCount} emerging`);
  if (slots.sampleThinCount > 0) parts.push(`${slots.sampleThinCount} sample-thin`);
  if (slots.earlySignalCount > 0) parts.push(`${slots.earlySignalCount} early-signal`);
  if (slots.noSignalCount > 0) parts.push(`${slots.noSignalCount} no-signal`);
  return `Confidence band across ${slots.firmCount} firm${slots.firmCount === 1 ? "" : "s"}: ${parts.join(", ")}.`;
}

/**
 * Phrasing-variant id allowlist (PAT-5.7 Brief Mocks v2.1 §7). Each
 * Vendor-Brief section ships 2 variants in pilot — same claims and numbers,
 * different tone. The default render path uses variant index 0; the
 * BriefEditChoice API (lib/briefEditChoice.ts) validates choiceValue
 * membership against this allowlist when a consultant picks an alternative.
 * Block 2 (Day 17) wires the actual VARIANT_BANK render functions; the
 * allowlist below ships first so Block 1's validator has a single source
 * of truth.
 */
export const VENDOR_BRIEF_VARIANT_IDS: Record<string, readonly string[]> = {
  "vendor.executive-summary": ["v1-measured", "v1-pointed"],
  "vendor.self-vs-market-delta": ["v1-measured", "v1-narrative"],
  "vendor.action-roadmap": ["v1-measured", "v1-pointed"],
} as const;
