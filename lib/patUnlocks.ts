/**
 * Compatibility-only unlock card constants for older generic dashboards.
 *
 * Canonical PAT unlock policy now lives in the firm/vendor insight runtimes and
 * evaluator paths. Keep this file limited to compatibility bridges.
 */
export const TIER1_ALIGNMENT_BADGE_ID = "tier1-alignment-unlocked";
export const TIER1_ALIGNMENT_BADGE_NAME = "Tier 1 Alignment Unlocked";

export const TIER1_INSIGHTS = [
  {
    key: "firm_tier1_operating_baseline",
    title: "Operating baseline",
    body: "Current-state firm alignment across the five PAT modules.",
  },
  {
    key: "firm_tier1_automation_readiness",
    title: "Automation and AI readiness",
    body: "How ready the firm is for practical automation and responsible AI adoption.",
  },
  {
    key: "firm_tier1_data_and_controls",
    title: "Data and controls posture",
    body: "What the firm’s current data flow, control discipline, and governance posture imply.",
  },
  {
    key: "firm_tier1_change_alignment",
    title: "Change and market alignment",
    body: "How ready the firm is to change, prioritize, and align to market pressure.",
  },
] as const;

export type InsightCard = {
  title: string;
  desc: string;
  requiredBadgeId?: string;
  requiredInsightKey?: string;
};

export const TOP_INSIGHT_CARDS: InsightCard[] = [
  {
    title: "Firm insight workspace",
    desc: "Canonical firm PAT insight portal.",
    requiredBadgeId: TIER1_ALIGNMENT_BADGE_ID,
  },
  {
    title: "Operating baseline",
    desc: "Current-state firm alignment across the five PAT modules.",
    requiredBadgeId: TIER1_ALIGNMENT_BADGE_ID,
    requiredInsightKey: "firm_tier1_operating_baseline",
  },
  {
    title: "Automation and AI readiness",
    desc: "Practical readiness for responsible automation and AI adoption.",
    requiredBadgeId: TIER1_ALIGNMENT_BADGE_ID,
    requiredInsightKey: "firm_tier1_automation_readiness",
  },
  {
    title: "Data and controls posture",
    desc: "Data flow, controls, and governance interpretation.",
    requiredBadgeId: TIER1_ALIGNMENT_BADGE_ID,
    requiredInsightKey: "firm_tier1_data_and_controls",
  },
  {
    title: "Change and market alignment",
    desc: "Change capacity and current market alignment.",
    requiredBadgeId: TIER1_ALIGNMENT_BADGE_ID,
    requiredInsightKey: "firm_tier1_change_alignment",
  },
] as const;
