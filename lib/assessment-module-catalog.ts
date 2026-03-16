import {
  FIRM_BASELINE_MODULE_KEY,
  PRODUCT_BASELINE_MODULE_KEY,
} from "@/lib/intelligence/runtimeConfig";
import { STAGED_FIRM_MODULES } from "@/lib/staged-firm-taxonomy";

export type AssessmentModuleAxis = "SELF" | "EXTERNAL_REVIEW";
export type AssessmentModuleScope = "FIRM" | "VENDOR" | "PRODUCT" | "ENTERPRISE";
export type AssessmentModuleActivationState = "LIVE" | "BETA" | "STAGED";
export type AssessmentModuleReportingRole =
  | "PRIMARY_REPORTING"
  | "SUPPLEMENTAL"
  | "EXTERNAL_FEEDBACK";
export type AssessmentModuleFamily =
  | "FIRM_SELF"
  | "PRODUCT_SELF"
  | "FIRM_CAPABILITY"
  | "FIRM_TAXONOMY"
  | "PRODUCT_EXTERNAL_REVIEW";
export type AssessmentIntelligenceProfileKey =
  | "firm_baseline_intelligence"
  | "product_intelligence"
  | "firm_taxonomy_intelligence";
export type AssessmentReportProfileKey =
  | "firm_baseline_report"
  | "product_baseline_report"
  | "product_intelligence_report"
  | "firm_capability_staging"
  | "product_external_feedback";

export type AssessmentModuleCatalogEntry = {
  key: string;
  title: string;
  axis: AssessmentModuleAxis;
  scope: AssessmentModuleScope;
  activationState: AssessmentModuleActivationState;
  isUserFacing: boolean;
  reportingRole: AssessmentModuleReportingRole;
  reportProfileKey: AssessmentReportProfileKey;
  intelligenceProfileKey: AssessmentIntelligenceProfileKey;
  displayOrder: number;
  family: AssessmentModuleFamily;
};

export const ACTIVATED_BETA_FIRM_MODULE_KEY = "firm_operating_model_commercial_v1" as const;
export const PRODUCT_EXTERNAL_REVIEW_MODULE_KEY = "product_workflow_fit_review_v1" as const;

export const ASSESSMENT_MODULE_CATALOG: readonly AssessmentModuleCatalogEntry[] = [
  {
    key: FIRM_BASELINE_MODULE_KEY,
    title: "Firm Alignment Survey",
    axis: "SELF",
    scope: "FIRM",
    activationState: "LIVE",
    isUserFacing: true,
    reportingRole: "PRIMARY_REPORTING",
    reportProfileKey: "firm_baseline_report",
    intelligenceProfileKey: "firm_baseline_intelligence",
    displayOrder: 10,
    family: "FIRM_SELF",
  },
  {
    key: PRODUCT_BASELINE_MODULE_KEY,
    title: "Vendor Product Fit Survey",
    axis: "SELF",
    scope: "PRODUCT",
    activationState: "LIVE",
    isUserFacing: true,
    reportingRole: "PRIMARY_REPORTING",
    reportProfileKey: "product_baseline_report",
    intelligenceProfileKey: "product_intelligence",
    displayOrder: 20,
    family: "PRODUCT_SELF",
  },
  ...STAGED_FIRM_MODULES.map((module, index) => ({
    key: module.key,
    title: module.title,
    axis: "SELF" as const,
    scope: "FIRM" as const,
    activationState:
      module.key === ACTIVATED_BETA_FIRM_MODULE_KEY ? ("BETA" as const) : ("STAGED" as const),
    isUserFacing: module.key === ACTIVATED_BETA_FIRM_MODULE_KEY,
    reportingRole: "SUPPLEMENTAL" as const,
    reportProfileKey: "firm_capability_staging" as const,
    intelligenceProfileKey: "firm_taxonomy_intelligence" as const,
    displayOrder: 30 + index * 10,
    family: "FIRM_TAXONOMY" as const,
  })),
  {
    key: "alignment_core_v1",
    title: "AAE Alignment Core",
    axis: "SELF",
    scope: "FIRM",
    activationState: "STAGED",
    isUserFacing: false,
    reportingRole: "SUPPLEMENTAL",
    reportProfileKey: "firm_capability_staging",
    intelligenceProfileKey: "firm_taxonomy_intelligence",
    displayOrder: 90,
    family: "FIRM_CAPABILITY",
  },
  {
    key: "automation_v1",
    title: "Automation Capability",
    axis: "SELF",
    scope: "FIRM",
    activationState: "STAGED",
    isUserFacing: false,
    reportingRole: "SUPPLEMENTAL",
    reportProfileKey: "firm_capability_staging",
    intelligenceProfileKey: "firm_taxonomy_intelligence",
    displayOrder: 100,
    family: "FIRM_CAPABILITY",
  },
  {
    key: "fmi_v1",
    title: "Firm Maturity Index (FMI)",
    axis: "SELF",
    scope: "FIRM",
    activationState: "STAGED",
    isUserFacing: false,
    reportingRole: "SUPPLEMENTAL",
    reportProfileKey: "firm_capability_staging",
    intelligenceProfileKey: "firm_taxonomy_intelligence",
    displayOrder: 110,
    family: "FIRM_CAPABILITY",
  },
  {
    key: "profitability_v1",
    title: "Profitability Capability",
    axis: "SELF",
    scope: "FIRM",
    activationState: "STAGED",
    isUserFacing: false,
    reportingRole: "SUPPLEMENTAL",
    reportProfileKey: "firm_capability_staging",
    intelligenceProfileKey: "firm_taxonomy_intelligence",
    displayOrder: 120,
    family: "FIRM_CAPABILITY",
  },
  {
    key: PRODUCT_EXTERNAL_REVIEW_MODULE_KEY,
    title: "Product Workflow Fit External Review",
    axis: "EXTERNAL_REVIEW",
    scope: "PRODUCT",
    activationState: "STAGED",
    isUserFacing: false,
    reportingRole: "EXTERNAL_FEEDBACK",
    reportProfileKey: "product_intelligence_report",
    intelligenceProfileKey: "product_intelligence",
    displayOrder: 130,
    family: "PRODUCT_EXTERNAL_REVIEW",
  },
] as const;

export const ASSESSMENT_MODULE_CATALOG_BY_KEY = new Map(
  ASSESSMENT_MODULE_CATALOG.map((entry) => [entry.key, entry])
);

export function getAssessmentModuleCatalogEntry(key: string) {
  return ASSESSMENT_MODULE_CATALOG_BY_KEY.get(key) ?? null;
}

export function listUserFacingAssessmentModules() {
  return ASSESSMENT_MODULE_CATALOG.filter((entry) => entry.isUserFacing);
}

export function isRuntimeSurveyAvailableModule(entry: AssessmentModuleCatalogEntry) {
  return (
    entry.axis === "SELF" &&
    entry.isUserFacing &&
    (entry.activationState === "LIVE" || entry.activationState === "BETA")
  );
}

export function isExplicitRuntimeReportableModule(entry: AssessmentModuleCatalogEntry) {
  return entry.axis === "SELF" && (entry.activationState === "LIVE" || entry.activationState === "BETA");
}

export function listRuntimeSurveyModules(scope?: AssessmentModuleScope) {
  return ASSESSMENT_MODULE_CATALOG.filter((entry) => {
    if (!isRuntimeSurveyAvailableModule(entry)) {
      return false;
    }

    if (scope && entry.scope !== scope) {
      return false;
    }

    return true;
  }).sort((a, b) => a.displayOrder - b.displayOrder);
}

export function listPrimaryReportingModules() {
  return ASSESSMENT_MODULE_CATALOG.filter(
    (entry) => entry.reportingRole === "PRIMARY_REPORTING"
  );
}

export function getPrimaryReportingModuleForProfile(
  reportProfileKey: AssessmentReportProfileKey
) {
  return (
    ASSESSMENT_MODULE_CATALOG.find(
      (entry) =>
        entry.reportProfileKey === reportProfileKey &&
        entry.reportingRole === "PRIMARY_REPORTING"
    ) ?? null
  );
}

export function listModulesForIntelligenceProfile(
  intelligenceProfileKey: AssessmentIntelligenceProfileKey
) {
  return ASSESSMENT_MODULE_CATALOG.filter(
    (entry) => entry.intelligenceProfileKey === intelligenceProfileKey
  ).sort((a, b) => a.displayOrder - b.displayOrder);
}
