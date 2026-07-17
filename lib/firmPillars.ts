/**
 * 15a — the five canonical PAT pillars (short axis/badge labels). PURE module (no
 * prisma / server imports) so radar client components can consume it. firmPat's
 * FIRM_MODULE_DEFINITIONS carries `pillarName` for the full record; the contract
 * test (tests/firm-pillars.contract.test.ts) locks the two in sync (set == 5, 1:1
 * with module keys + titles). Full module titles stay in evidence prose + cards.
 */

export const FIRM_PILLARS = [
  "Strategy",
  "Operations",
  "Automation",
  "Integration",
  "Governance",
] as const;
export type FirmPillar = (typeof FIRM_PILLARS)[number];

/** Canonical module KEY → pillar. */
export const PILLAR_BY_MODULE_KEY: Record<string, FirmPillar> = {
  firm_alignment_operating_model_v1: "Operations",
  firm_alignment_automation_ai_v1: "Automation",
  firm_alignment_data_flow_v1: "Integration",
  firm_alignment_governance_v1: "Governance",
  firm_alignment_strategy_v1: "Strategy",
};

/** Canonical module TITLE → pillar (radar axes carry titles, not keys). */
export const PILLAR_BY_MODULE_TITLE: Record<string, FirmPillar> = {
  "Operating Model and Workflow Discipline": "Operations",
  "Automation and AI Readiness": "Automation",
  "Integration and Data Flow Maturity": "Integration",
  "Governance, Controls, and Vendor Risk": "Governance",
  "Strategy, Change Readiness, and Market Alignment": "Strategy",
};

/**
 * Short pillar badge for a module key or full module title. Unknown labels pass
 * through unchanged, so radar axes for non-module dimensions never break.
 */
export function pillarForModule(keyOrTitle: string | null | undefined): string {
  if (!keyOrTitle) return "";
  return PILLAR_BY_MODULE_KEY[keyOrTitle] ?? PILLAR_BY_MODULE_TITLE[keyOrTitle] ?? keyOrTitle;
}
