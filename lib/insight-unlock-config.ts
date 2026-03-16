import {
  FIRM_BASELINE_MODULE_KEY,
  PRODUCT_BASELINE_MODULE_KEY,
  RUNTIME_BADGES,
  RUNTIME_INSIGHTS,
} from "@/lib/intelligence/runtimeConfig";

export type InsightUnlockConfigEntry = {
  insightKey: string;
  reportProfileKey: "firm_baseline_report" | "product_baseline_report";
  moduleKey: string;
  badgeId: string;
  badgeName: string;
  capabilityKeys: readonly string[];
  minScore: number;
  sourceType: "SELF_SUBMISSION";
};

export const INSIGHT_UNLOCK_CONFIG: readonly InsightUnlockConfigEntry[] = [
  ...RUNTIME_INSIGHTS.firm.map((insightKey) => ({
    insightKey,
    reportProfileKey: "firm_baseline_report" as const,
    moduleKey: FIRM_BASELINE_MODULE_KEY,
    badgeId: RUNTIME_BADGES.tier1.id,
    badgeName: RUNTIME_BADGES.tier1.name,
    capabilityKeys: ["cap_alignment_basics", "cap_alignment_advanced"],
    minScore: 0,
    sourceType: "SELF_SUBMISSION" as const,
  })),
  {
    insightKey: "product_positioning_clarity",
    reportProfileKey: "product_baseline_report",
    moduleKey: PRODUCT_BASELINE_MODULE_KEY,
    badgeId: RUNTIME_BADGES.product.id,
    badgeName: RUNTIME_BADGES.product.name,
    capabilityKeys: ["cap_product_positioning"],
    minScore: 0,
    sourceType: "SELF_SUBMISSION",
  },
  {
    insightKey: "product_workflow_fit_snapshot",
    reportProfileKey: "product_baseline_report",
    moduleKey: PRODUCT_BASELINE_MODULE_KEY,
    badgeId: RUNTIME_BADGES.product.id,
    badgeName: RUNTIME_BADGES.product.name,
    capabilityKeys: ["cap_product_positioning", "cap_product_onboarding"],
    minScore: 0,
    sourceType: "SELF_SUBMISSION",
  },
  {
    insightKey: "product_integration_readiness",
    reportProfileKey: "product_baseline_report",
    moduleKey: PRODUCT_BASELINE_MODULE_KEY,
    badgeId: RUNTIME_BADGES.product.id,
    badgeName: RUNTIME_BADGES.product.name,
    capabilityKeys: ["cap_product_integration"],
    minScore: 0,
    sourceType: "SELF_SUBMISSION",
  },
  {
    insightKey: "product_onboarding_friction_estimate",
    reportProfileKey: "product_baseline_report",
    moduleKey: PRODUCT_BASELINE_MODULE_KEY,
    badgeId: RUNTIME_BADGES.product.id,
    badgeName: RUNTIME_BADGES.product.name,
    capabilityKeys: ["cap_product_onboarding"],
    minScore: 0,
    sourceType: "SELF_SUBMISSION",
  },
  {
    insightKey: "product_support_confidence_signal",
    reportProfileKey: "product_baseline_report",
    moduleKey: PRODUCT_BASELINE_MODULE_KEY,
    badgeId: RUNTIME_BADGES.product.id,
    badgeName: RUNTIME_BADGES.product.name,
    capabilityKeys: ["cap_product_support"],
    minScore: 0,
    sourceType: "SELF_SUBMISSION",
  },
  {
    insightKey: "product_gtm_readiness_summary",
    reportProfileKey: "product_baseline_report",
    moduleKey: PRODUCT_BASELINE_MODULE_KEY,
    badgeId: RUNTIME_BADGES.product.id,
    badgeName: RUNTIME_BADGES.product.name,
    capabilityKeys: [
      "cap_product_positioning",
      "cap_product_onboarding",
      "cap_product_integration",
      "cap_product_support",
    ],
    minScore: 0,
    sourceType: "SELF_SUBMISSION",
  },
  {
    insightKey: "product_improvement_priorities",
    reportProfileKey: "product_baseline_report",
    moduleKey: PRODUCT_BASELINE_MODULE_KEY,
    badgeId: RUNTIME_BADGES.product.id,
    badgeName: RUNTIME_BADGES.product.name,
    capabilityKeys: [
      "cap_product_positioning",
      "cap_product_onboarding",
      "cap_product_integration",
      "cap_product_support",
    ],
    minScore: 0,
    sourceType: "SELF_SUBMISSION",
  },
] as const;

export const INSIGHT_UNLOCK_CONFIG_BY_KEY = new Map(
  INSIGHT_UNLOCK_CONFIG.map((entry) => [entry.insightKey, entry])
);
