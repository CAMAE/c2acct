export const RUNTIME_BADGES = {
  tier1: {
    id: "49d380c5-b1d0-493b-b9c3-f2391fa3430b",
    name: "Tier 1 Unlocked",
  },
  product: {
    id: "3a53d563-c4f9-45dc-9aa5-a8f8c018c006",
    name: "Product GTM Unlocked",
  },
} as const;

export const FIRM_BASELINE_MODULE_KEY = "firm_alignment_v1";
export const PRODUCT_BASELINE_MODULE_KEY = "vendor_product_fit_v1";

export const RUNTIME_INSIGHTS = {
  firm: [
    "tier1_alignment_baseline",
    "tier1_operating_system_map",
    "tier1_risk_control_posture",
    "tier1_implementation_roadmap",
  ],
  product: [
    "product_positioning_clarity",
    "product_workflow_fit_snapshot",
    "product_integration_readiness",
    "product_onboarding_friction_estimate",
    "product_support_confidence_signal",
    "product_gtm_readiness_summary",
    "product_improvement_priorities",
  ],
} as const;
