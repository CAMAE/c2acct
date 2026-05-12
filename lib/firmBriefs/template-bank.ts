/**
 * Phase-4 Day-16 firm-brief phrase bank.
 *
 * Deterministic prose — every sentence is keyed to a data threshold the
 * upstream generator measures from engine output and rendered with literal
 * interpolation. No LLM, no consultant-authored copy, no opinion words.
 *
 * Per PAT-5.7-Brief-Mocks-Vendor-and-Firm.md page 1 + page 4 (firm side)
 * + Section 0 principle 7.
 *
 * Mirrors the shape of lib/briefs/executive-summary-templates.ts so future
 * brief surfaces keep the same template-bank ergonomics.
 */

export type FirmBriefHeadlinePattern = {
  key: "compare-against-peers" | "scope-only";
  template: (slots: {
    firmCompanyName: string;
    canonicalFirmScore: number | null;
    ecosystemAverageScore: number | null;
    peerFirmCount: number;
  }) => string;
};

export const HEADLINE_PATTERNS: FirmBriefHeadlinePattern[] = [
  {
    key: "compare-against-peers",
    template: ({ firmCompanyName, canonicalFirmScore, ecosystemAverageScore, peerFirmCount }) => {
      if (canonicalFirmScore === null || ecosystemAverageScore === null) {
        return `${firmCompanyName}: alignment score not yet available.`;
      }
      const direction =
        canonicalFirmScore === ecosystemAverageScore
          ? "matches"
          : canonicalFirmScore > ecosystemAverageScore
            ? "sits above"
            : "sits below";
      return `${firmCompanyName} (${canonicalFirmScore}) ${direction} the ${peerFirmCount}-firm ecosystem average of ${ecosystemAverageScore}.`;
    },
  },
  {
    key: "scope-only",
    template: ({ firmCompanyName, canonicalFirmScore }) =>
      canonicalFirmScore === null
        ? `${firmCompanyName}: alignment score not yet available.`
        : `${firmCompanyName}: alignment score ${canonicalFirmScore}.`,
  },
];

export type FirmBriefPeerLinePattern = {
  key: "above-modules" | "below-modules" | "no-deltas";
  render: (slots: {
    aboveModules: Array<{ moduleTitle: string; delta: number }>;
    belowModules: Array<{ moduleTitle: string; delta: number }>;
  }) => string | null;
};

export const PEER_LINE_PATTERNS: FirmBriefPeerLinePattern[] = [
  {
    key: "above-modules",
    render: ({ aboveModules }) => {
      if (aboveModules.length === 0) return null;
      const formatted = aboveModules
        .map((entry) => `${entry.moduleTitle} (+${entry.delta})`)
        .join(", ");
      return `Sits above ecosystem average on ${formatted}.`;
    },
  },
  {
    key: "below-modules",
    render: ({ belowModules }) => {
      if (belowModules.length === 0) return null;
      const formatted = belowModules
        .map((entry) => `${entry.moduleTitle} (${entry.delta})`)
        .join(", ");
      return `Sits below ecosystem average on ${formatted}.`;
    },
  },
  {
    key: "no-deltas",
    render: ({ aboveModules, belowModules }) => {
      if (aboveModules.length > 0 || belowModules.length > 0) return null;
      return "Module scores track ecosystem average within a ±5 point band.";
    },
  },
];

export function renderConfidenceCallout(slots: {
  modulesCompletedCount: number;
  modulesTotalCount: number;
  questionsAnsweredCount: number;
  questionsTotalCount: number;
}): string {
  if (slots.modulesTotalCount === 0) {
    return "No firm modules in scope yet.";
  }
  return `${slots.modulesCompletedCount} of ${slots.modulesTotalCount} base modules complete · ${slots.questionsAnsweredCount} of ${slots.questionsTotalCount} questions answered.`;
}

/**
 * Phrasing-variant id allowlist (PAT-5.7 Brief Mocks v2.1 §7). Each
 * Firm-Brief section ships 2 variants in pilot — same claims and numbers,
 * different tone. The default render path uses variant index 0; the
 * BriefEditChoice API (lib/briefEditChoice.ts) validates choiceValue
 * membership against this allowlist when a consultant picks an alternative.
 */
export const FIRM_BRIEF_VARIANT_IDS: Record<string, readonly string[]> = {
  "firm.alignment-header": ["v1-measured", "v1-pointed"],
  "firm.stack-fit-analysis": ["v1-measured", "v1-narrative"],
  "firm.six-quarter-roadmap": ["v1-measured", "v1-pointed"],
} as const;

export type FirmVariantTone = "measured" | "pointed" | "narrative";

export type FirmBriefVariantSlots = {
  firmCompanyName: string;
  canonicalFirmScore: number | null;
  ecosystemAverageScore: number | null;
  peerFirmCount: number;
  reviewedProductCount: number;
  totalProductCount: number;
  currentQuarterLabel: string;
  trajectoryEnd: number | null;
};

export type FirmBriefVariantRender = {
  id: string;
  tone: FirmVariantTone;
  render: (slots: FirmBriefVariantSlots) => string;
};

/**
 * VARIANT_BANK — 2 variants per Firm-Brief section, deterministic preamble
 * per tone. The numeric assertions (score, peer count, etc.) are identical
 * across variants; only the framing changes. Tests assert this.
 */
export const FIRM_BRIEF_VARIANT_BANK: Record<string, readonly FirmBriefVariantRender[]> = {
  "firm.alignment-header": [
    {
      id: "v1-measured",
      tone: "measured",
      render: ({ firmCompanyName, canonicalFirmScore, ecosystemAverageScore, peerFirmCount }) => {
        if (canonicalFirmScore === null || ecosystemAverageScore === null) {
          return `${firmCompanyName}: alignment score not yet available.`;
        }
        const direction =
          canonicalFirmScore === ecosystemAverageScore
            ? "matches"
            : canonicalFirmScore > ecosystemAverageScore
              ? "sits above"
              : "sits below";
        return `${firmCompanyName} (${canonicalFirmScore}) ${direction} the ${peerFirmCount}-firm ecosystem average of ${ecosystemAverageScore}.`;
      },
    },
    {
      id: "v1-pointed",
      tone: "pointed",
      render: ({ firmCompanyName, canonicalFirmScore, ecosystemAverageScore, peerFirmCount }) => {
        if (canonicalFirmScore === null || ecosystemAverageScore === null) {
          return `${firmCompanyName} — alignment score pending.`;
        }
        const gap = canonicalFirmScore - ecosystemAverageScore;
        if (gap === 0) {
          return `${firmCompanyName} lands at ${canonicalFirmScore} — exactly on the ${peerFirmCount}-firm ecosystem average.`;
        }
        const verb = gap > 0 ? "ahead of" : "behind";
        return `${firmCompanyName} at ${canonicalFirmScore} — ${Math.abs(gap)} point${Math.abs(gap) === 1 ? "" : "s"} ${verb} the ${peerFirmCount}-firm ecosystem average (${ecosystemAverageScore}).`;
      },
    },
  ],
  "firm.stack-fit-analysis": [
    {
      id: "v1-measured",
      tone: "measured",
      render: ({ reviewedProductCount, totalProductCount }) => {
        if (totalProductCount === 0) return "No vendor products in scope yet.";
        return `${reviewedProductCount} of ${totalProductCount} product${totalProductCount === 1 ? "" : "s"} reviewed.`;
      },
    },
    {
      id: "v1-narrative",
      tone: "narrative",
      render: ({ reviewedProductCount, totalProductCount }) => {
        if (totalProductCount === 0) return "The stack hasn't been mapped yet — no vendor products in scope.";
        const remaining = totalProductCount - reviewedProductCount;
        if (remaining === 0) {
          return `All ${totalProductCount} stack product${totalProductCount === 1 ? "" : "s"} have a firm review — fit analysis runs against the full inventory.`;
        }
        return `${reviewedProductCount} of ${totalProductCount} stack product${totalProductCount === 1 ? "" : "s"} reviewed; ${remaining} review${remaining === 1 ? "" : "s"} would tighten the fit picture.`;
      },
    },
  ],
  "firm.six-quarter-roadmap": [
    {
      id: "v1-measured",
      tone: "measured",
      render: ({ currentQuarterLabel, trajectoryEnd }) => {
        if (trajectoryEnd === null) return `Six-quarter sequence starting ${currentQuarterLabel}.`;
        return `Six-quarter sequence starting ${currentQuarterLabel}; deterministic gap-closure projects to ${trajectoryEnd}.`;
      },
    },
    {
      id: "v1-pointed",
      tone: "pointed",
      render: ({ currentQuarterLabel, trajectoryEnd }) => {
        if (trajectoryEnd === null) return `${currentQuarterLabel} is the commitment quarter — the next five carry the plan.`;
        return `${currentQuarterLabel} forward, six quarters of sequenced action — projected end-state ${trajectoryEnd}.`;
      },
    },
  ],
} as const;

export function renderFirmVariant(
  sectionKey: string,
  variantId: string | undefined,
  slots: FirmBriefVariantSlots
): string {
  const bank = FIRM_BRIEF_VARIANT_BANK[sectionKey];
  if (!bank) return "";
  const chosen = (variantId ? bank.find((v) => v.id === variantId) : null) ?? bank[0];
  return chosen.render(slots);
}
