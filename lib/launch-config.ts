export const LAUNCH_OWNER_FALLBACK_EMAIL = "owner@demofirm.com";
export const LAUNCH_OWNER_FALLBACK_NAME = "Demo Owner";

export const LAUNCH_COMPANY = {
  id: "demo-firm-company",
  name: "Demo Firm LLC",
} as const;

export const LAUNCH_USER = {
  id: "demo-firm-owner",
} as const;

export const LAUNCH_BADGES = {
  tier1: {
    id: "49d380c5-b1d0-493b-b9c3-f2391fa3430b",
    name: "Tier 1 Unlocked",
    minScore: 1,
  },
  product: {
    id: "3a53d563-c4f9-45dc-9aa5-a8f8c018c006",
    name: "Product GTM Unlocked",
    minScore: 1,
  },
} as const;

export const LAUNCH_MODULES = {
  firm: {
    key: "firm_alignment_v1",
    title: "Firm Alignment Survey",
    description: "Baseline alignment assessment.",
    scope: "FIRM",
    questions: [
      { key: "alignment_q1", prompt: "How clearly is your operating model documented?", order: 1 },
      { key: "alignment_q2", prompt: "How consistently do teams follow the documented process?", order: 2 },
      { key: "alignment_q3", prompt: "How effective is cross-functional communication?", order: 3 },
    ],
  },
  product: {
    key: "vendor_product_fit_v1",
    title: "Vendor Product Fit Survey",
    description: "Launch-ready product fit assessment.",
    scope: "PRODUCT",
    questions: [
      { key: "product_fit_q1", prompt: "How clearly does this product solve a priority workflow?", order: 1 },
      { key: "product_fit_q2", prompt: "How quickly can your team realize value after onboarding?", order: 2 },
      { key: "product_fit_q3", prompt: "How well does this product integrate with your current stack?", order: 3 },
      { key: "product_fit_q4", prompt: "How confident are you in ongoing vendor support quality?", order: 4 },
    ],
  },
} as const;

export const LAUNCH_INSIGHTS = {
  firm: [
    {
      key: "tier1_alignment_baseline",
      title: "Alignment Baseline",
      body: "Where the firm is now, in practical terms.",
      tier: 1,
    },
    {
      key: "tier1_operating_system_map",
      title: "Operating System Map",
      body: "A map of how work actually flows today.",
      tier: 1,
    },
    {
      key: "tier1_risk_control_posture",
      title: "Risk & Control Posture",
      body: "Top risk/control gaps implied by your answers.",
      tier: 1,
    },
    {
      key: "tier1_implementation_roadmap",
      title: "Implementation Roadmap",
      body: "A phased plan to increase alignment.",
      tier: 1,
    },
  ],
  product: [
    {
      key: "product_positioning_clarity",
      title: "Product Positioning Clarity",
      body: "Clarity of value proposition across the highest-priority accounting workflows.",
      tier: 2,
    },
    {
      key: "product_workflow_fit_snapshot",
      title: "Workflow Fit Snapshot",
      body: "How naturally this product maps into day-to-day operator behavior.",
      tier: 2,
    },
    {
      key: "product_integration_readiness",
      title: "Integration Readiness",
      body: "Readiness signal for integrations needed to reduce context switching and manual effort.",
      tier: 2,
    },
    {
      key: "product_onboarding_friction_estimate",
      title: "Onboarding Friction Estimate",
      body: "Likely onboarding blockers from contract signature to first delivered value.",
      tier: 2,
    },
    {
      key: "product_support_confidence_signal",
      title: "Support Confidence Signal",
      body: "Confidence trend for support quality, response consistency, and escalation reliability.",
      tier: 2,
    },
    {
      key: "product_gtm_readiness_summary",
      title: "Product GTM Readiness Summary",
      body: "Summary of market-facing readiness to scale onboarding and customer activation.",
      tier: 2,
    },
    {
      key: "product_improvement_priorities",
      title: "Product Improvement Priorities",
      body: "Highest-impact product improvements to increase workflow fit and retention.",
      tier: 2,
    },
  ],
} as const;
