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
 */
export const VENDOR_BRIEF_VARIANT_IDS: Record<string, readonly string[]> = {
  "vendor.executive-summary": ["v1-measured", "v1-pointed"],
  "vendor.self-vs-market-delta": ["v1-measured", "v1-narrative"],
  "vendor.action-roadmap": ["v1-measured", "v1-pointed"],
} as const;

export type VendorVariantTone = "measured" | "pointed" | "narrative";

export type VendorBriefVariantRender = {
  id: string;
  tone: VendorVariantTone;
  /** Short tone-flavored preamble for the section. Numbers come from slots; tone is the only thing that varies between variants. */
  render: (slots: VendorBriefVariantSlots) => string;
};

export type VendorBriefVariantSlots = {
  ecosystemName: string;
  firmCount: number;
  avgFirmScore: number | null;
  avgVendorSelfReport: number | null;
  hotDivergences: number;
  productCount: number;
  roadmapItemCount: number;
};

/**
 * VARIANT_BANK — 2 variants per section, deterministic preamble per tone.
 * The numeric assertions (firm count, hot-divergence count, etc.) are
 * identical across variants; only adjectives, sentence structure, and
 * cadence vary. Tests assert this same-number guarantee.
 */
export const VENDOR_BRIEF_VARIANT_BANK: Record<string, readonly VendorBriefVariantRender[]> = {
  "vendor.executive-summary": [
    {
      id: "v1-measured",
      tone: "measured",
      render: ({ ecosystemName, firmCount, avgFirmScore, avgVendorSelfReport }) => {
        if (avgFirmScore === null || avgVendorSelfReport === null) {
          return `${ecosystemName}: ${firmCount} firm${firmCount === 1 ? "" : "s"} in scope.`;
        }
        return `${ecosystemName}'s ${firmCount} firm${firmCount === 1 ? "" : "s"} average ${avgFirmScore} alignment vs ${avgVendorSelfReport} self-report.`;
      },
    },
    {
      id: "v1-pointed",
      tone: "pointed",
      render: ({ ecosystemName, firmCount, avgFirmScore, avgVendorSelfReport }) => {
        if (avgFirmScore === null || avgVendorSelfReport === null) {
          return `${ecosystemName} — ${firmCount} firm${firmCount === 1 ? "" : "s"} on the board.`;
        }
        const gap = avgVendorSelfReport - avgFirmScore;
        const direction = gap > 0 ? "below" : gap < 0 ? "above" : "level with";
        return `${ecosystemName}: ${firmCount} firm${firmCount === 1 ? "" : "s"} land at ${avgFirmScore}, ${direction} a ${avgVendorSelfReport} self-report.`;
      },
    },
  ],
  "vendor.self-vs-market-delta": [
    {
      id: "v1-measured",
      tone: "measured",
      render: ({ productCount, hotDivergences }) => {
        if (productCount === 0) return "No vendor products with completed self-assessment yet.";
        if (hotDivergences === 0) {
          return `${productCount} product${productCount === 1 ? "" : "s"} — vendor self-report and firm reviews track within a 10-point band across the catalog.`;
        }
        return `${productCount} product${productCount === 1 ? "" : "s"} sorted by absolute delta; ${hotDivergences} flagged as hot divergence.`;
      },
    },
    {
      id: "v1-narrative",
      tone: "narrative",
      render: ({ productCount, hotDivergences }) => {
        if (productCount === 0) return "Vendor catalog has no completed self-assessments yet — the delta lens unlocks once those land.";
        if (hotDivergences === 0) {
          return `Across ${productCount} product${productCount === 1 ? "" : "s"}, vendor and firm scores stay within a 10-point band — the gaps below are conversation-grade, not crisis-grade.`;
        }
        return `Of ${productCount} product${productCount === 1 ? "" : "s"} reviewed, ${hotDivergences} carr${hotDivergences === 1 ? "ies" : "y"} a hot-divergence flag — that's where the boardroom conversation should land first.`;
      },
    },
  ],
  "vendor.action-roadmap": [
    {
      id: "v1-measured",
      tone: "measured",
      render: ({ roadmapItemCount }) => {
        if (roadmapItemCount === 0) return "No next actions surfaced from the current briefings.";
        return `${roadmapItemCount} action${roadmapItemCount === 1 ? "" : "s"} across 30/60/90-day windows, deduplicated and ranked by signal strength.`;
      },
    },
    {
      id: "v1-pointed",
      tone: "pointed",
      render: ({ roadmapItemCount }) => {
        if (roadmapItemCount === 0) return "Briefings produced no next actions this quarter — nothing to commit to.";
        return `${roadmapItemCount} commitment-eligible action${roadmapItemCount === 1 ? "" : "s"}; pick the bullet, treat the rest as supporting context.`;
      },
    },
  ],
} as const;

export function renderVendorVariant(
  sectionKey: string,
  variantId: string | undefined,
  slots: VendorBriefVariantSlots
): string {
  const bank = VENDOR_BRIEF_VARIANT_BANK[sectionKey];
  if (!bank) return "";
  const chosen = (variantId ? bank.find((v) => v.id === variantId) : null) ?? bank[0];
  return chosen.render(slots);
}
