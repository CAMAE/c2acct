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
 * Block 2 (Day 17) wires the actual VARIANT_BANK render functions; the
 * allowlist below ships first so Block 1's validator has a single source
 * of truth.
 */
export const FIRM_BRIEF_VARIANT_IDS: Record<string, readonly string[]> = {
  "firm.alignment-header": ["v1-measured", "v1-pointed"],
  "firm.stack-fit-analysis": ["v1-measured", "v1-narrative"],
  "firm.six-quarter-roadmap": ["v1-measured", "v1-pointed"],
} as const;
