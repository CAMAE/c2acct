import { PRODUCT_EXTERNAL_REVIEW_MODULE_KEY } from "@/lib/assessment-module-catalog";
import {
  FIRM_BASELINE_MODULE_KEY,
  PRODUCT_BASELINE_MODULE_KEY,
} from "@/lib/intelligence/runtimeConfig";
import { STAGED_FIRM_DOMAINS, STAGED_FIRM_MODULES } from "@/lib/staged-firm-taxonomy";

export type CapabilityFamilyKey =
  | "firm_alignment"
  | "firm_taxonomy"
  | "product_gtm_fit";

export type CapabilityCatalogEntry = {
  key: string;
  title: string;
  scope: "FIRM" | "PRODUCT";
  family: CapabilityFamilyKey;
  level: "TIER1" | "TIER2" | "TIER3";
  active: boolean;
};

export type ModuleCapabilityRegistryEntry = {
  moduleKey: string;
  capabilityKeys: readonly string[];
  family: CapabilityFamilyKey;
};

export type QuestionCapabilityRegistryEntry = {
  moduleKey: string;
  questionKey: string;
  capabilityKeys: readonly string[];
};

export const CAPABILITY_CATALOG: readonly CapabilityCatalogEntry[] = [
  {
    key: "cap_alignment_basics",
    title: "Alignment Basics",
    scope: "FIRM",
    family: "firm_alignment",
    level: "TIER1",
    active: true,
  },
  {
    key: "cap_alignment_advanced",
    title: "Alignment Advanced",
    scope: "FIRM",
    family: "firm_alignment",
    level: "TIER1",
    active: true,
  },
  ...STAGED_FIRM_DOMAINS.map((domain) => ({
    key: `cap_${domain.key}`,
    title: domain.title,
    scope: "FIRM" as const,
    family: "firm_taxonomy" as const,
    level: "TIER1" as const,
    active: true,
  })),
  {
    key: "cap_product_positioning",
    title: "Product Positioning",
    scope: "PRODUCT",
    family: "product_gtm_fit",
    level: "TIER1",
    active: true,
  },
  {
    key: "cap_product_onboarding",
    title: "Product Onboarding",
    scope: "PRODUCT",
    family: "product_gtm_fit",
    level: "TIER1",
    active: true,
  },
  {
    key: "cap_product_integration",
    title: "Product Integration",
    scope: "PRODUCT",
    family: "product_gtm_fit",
    level: "TIER1",
    active: true,
  },
  {
    key: "cap_product_support",
    title: "Product Support Confidence",
    scope: "PRODUCT",
    family: "product_gtm_fit",
    level: "TIER1",
    active: true,
  },
] as const;

export const MODULE_CAPABILITY_REGISTRY: readonly ModuleCapabilityRegistryEntry[] = [
  {
    moduleKey: FIRM_BASELINE_MODULE_KEY,
    capabilityKeys: ["cap_alignment_basics", "cap_alignment_advanced"],
    family: "firm_alignment",
  },
  {
    moduleKey: PRODUCT_BASELINE_MODULE_KEY,
    capabilityKeys: [
      "cap_product_positioning",
      "cap_product_onboarding",
      "cap_product_integration",
      "cap_product_support",
    ],
    family: "product_gtm_fit",
  },
  {
    moduleKey: PRODUCT_EXTERNAL_REVIEW_MODULE_KEY,
    capabilityKeys: [
      "cap_product_positioning",
      "cap_product_onboarding",
      "cap_product_integration",
      "cap_product_support",
    ],
    family: "product_gtm_fit",
  },
  ...STAGED_FIRM_MODULES.map((module) => ({
    moduleKey: module.key,
    capabilityKeys: module.domains.map((domainKey) => `cap_${domainKey}`),
    family: "firm_taxonomy" as const,
  })),
] as const;

export const QUESTION_CAPABILITY_REGISTRY: readonly QuestionCapabilityRegistryEntry[] = [
  {
    moduleKey: FIRM_BASELINE_MODULE_KEY,
    questionKey: "alignment_q1",
    capabilityKeys: ["cap_alignment_basics"],
  },
  {
    moduleKey: FIRM_BASELINE_MODULE_KEY,
    questionKey: "leadership_vision_alignment",
    capabilityKeys: ["cap_alignment_basics"],
  },
  {
    moduleKey: FIRM_BASELINE_MODULE_KEY,
    questionKey: "alignment_q2",
    capabilityKeys: ["cap_alignment_basics"],
  },
  {
    moduleKey: FIRM_BASELINE_MODULE_KEY,
    questionKey: "strategy_execution_clarity",
    capabilityKeys: ["cap_alignment_basics"],
  },
  {
    moduleKey: FIRM_BASELINE_MODULE_KEY,
    questionKey: "alignment_q3",
    capabilityKeys: ["cap_alignment_advanced"],
  },
  {
    moduleKey: FIRM_BASELINE_MODULE_KEY,
    questionKey: "decision_rights_defined",
    capabilityKeys: ["cap_alignment_basics"],
  },
  {
    moduleKey: FIRM_BASELINE_MODULE_KEY,
    questionKey: "kpi_alignment",
    capabilityKeys: ["cap_alignment_advanced"],
  },
  {
    moduleKey: FIRM_BASELINE_MODULE_KEY,
    questionKey: "operating_rhythm",
    capabilityKeys: ["cap_alignment_advanced"],
  },
  {
    moduleKey: PRODUCT_BASELINE_MODULE_KEY,
    questionKey: "product_fit_q1",
    capabilityKeys: ["cap_product_positioning"],
  },
  {
    moduleKey: PRODUCT_BASELINE_MODULE_KEY,
    questionKey: "product_fit_q2",
    capabilityKeys: ["cap_product_onboarding"],
  },
  {
    moduleKey: PRODUCT_BASELINE_MODULE_KEY,
    questionKey: "product_fit_q3",
    capabilityKeys: ["cap_product_integration"],
  },
  {
    moduleKey: PRODUCT_BASELINE_MODULE_KEY,
    questionKey: "product_fit_q4",
    capabilityKeys: ["cap_product_support"],
  },
  ...STAGED_FIRM_MODULES.flatMap((module) =>
    module.questions.map((question) => ({
      moduleKey: module.key,
      questionKey: question.key,
      capabilityKeys: [`cap_${question.domainKey}`],
    }))
  ),
] as const;
