export const TIER1_ALIGNMENT_BADGE_ID = "tier1-alignment-unlocked";
export const TIER1_ALIGNMENT_BADGE_NAME = "Tier 1 Alignment Unlocked";

export const TIER1_INSIGHTS = [
  {
    key: "tier1_alignment_baseline",
    title: "Alignment Baseline",
    body: "Where the firm is now, in practical operating terms.",
  },
  {
    key: "tier1_operating_system_map",
    title: "Operating System Map",
    body: "How work moves through the firm today and where operating friction concentrates.",
  },
  {
    key: "tier1_risk_control_posture",
    title: "Risk & Control Posture",
    body: "The control posture implied by the current operating discipline and score pattern.",
  },
  {
    key: "tier1_implementation_roadmap",
    title: "Implementation Roadmap",
    body: "The next practical steps to move from baseline alignment to institutional repeatability.",
  },
] as const;

export type OutputCard = {
  title: string;
  desc: string;
  requiredBadgeId?: string;
  requiredInsightKey?: string;
};

export const TOP_OUTPUT_CARDS: OutputCard[] = [
  {
    title: "Institutional Profile",
    desc: "Capability scoring + operational alignment snapshot.",
    requiredBadgeId: TIER1_ALIGNMENT_BADGE_ID,
  },
  {
    title: "Alignment Baseline",
    desc: "Where the firm is now — quantified.",
    requiredBadgeId: TIER1_ALIGNMENT_BADGE_ID,
    requiredInsightKey: "tier1_alignment_baseline",
  },
  {
    title: "Operating System Map",
    desc: "How work actually moves through the firm.",
    requiredBadgeId: TIER1_ALIGNMENT_BADGE_ID,
    requiredInsightKey: "tier1_operating_system_map",
  },
  {
    title: "Automation Readiness",
    desc: "What can be delegated, what must stay human.",
    requiredBadgeId: TIER1_ALIGNMENT_BADGE_ID,
  },
  {
    title: "Risk & Control Posture",
    desc: "Controls, exposure, and governance maturity.",
    requiredBadgeId: TIER1_ALIGNMENT_BADGE_ID,
    requiredInsightKey: "tier1_risk_control_posture",
  },
  {
    title: "Implementation Roadmap",
    desc: "Sequenced steps to reach high alignment.",
    requiredBadgeId: TIER1_ALIGNMENT_BADGE_ID,
    requiredInsightKey: "tier1_implementation_roadmap",
  },
  {
    title: "Executive Brief",
    desc: "Board-ready summary and next actions.",
    requiredBadgeId: TIER1_ALIGNMENT_BADGE_ID,
  },
] as const;
