import type {
  AssessmentIntelligenceProfileKey,
  AssessmentModuleAxis,
  AssessmentReportProfileKey,
} from "@/lib/assessment-module-catalog";
import {
  getPrimaryReportingModuleForProfile,
  listModulesForIntelligenceProfile,
} from "@/lib/assessment-module-catalog";

export type ReportProfileTargetMode = "COMPANY" | "PRODUCT";

export type ReportProfile = {
  key: AssessmentReportProfileKey;
  title: string;
  targetMode: ReportProfileTargetMode;
  primaryModuleKey: string;
  intelligenceProfileKey: AssessmentIntelligenceProfileKey;
  supportedAxes: readonly AssessmentModuleAxis[];
  supportingModuleKeys: readonly string[];
};

export const REPORT_PROFILES: readonly ReportProfile[] = [
  {
    key: "firm_baseline_report",
    title: "Firm Baseline Report",
    targetMode: "COMPANY",
    primaryModuleKey:
      getPrimaryReportingModuleForProfile("firm_baseline_report")?.key ?? "",
    intelligenceProfileKey: "firm_baseline_intelligence",
    supportedAxes: ["SELF"],
    supportingModuleKeys: [],
  },
  {
    key: "product_baseline_report",
    title: "Product Baseline Report",
    targetMode: "PRODUCT",
    primaryModuleKey:
      getPrimaryReportingModuleForProfile("product_baseline_report")?.key ?? "",
    intelligenceProfileKey: "product_intelligence",
    supportedAxes: ["SELF", "EXTERNAL_REVIEW"],
    supportingModuleKeys: listModulesForIntelligenceProfile("product_intelligence")
      .filter((module) => module.reportingRole !== "PRIMARY_REPORTING")
      .map((module) => module.key),
  },
  {
    key: "product_intelligence_report",
    title: "Product Intelligence Report",
    targetMode: "PRODUCT",
    primaryModuleKey:
      getPrimaryReportingModuleForProfile("product_baseline_report")?.key ?? "",
    intelligenceProfileKey: "product_intelligence",
    supportedAxes: ["SELF", "EXTERNAL_REVIEW"],
    supportingModuleKeys: listModulesForIntelligenceProfile("product_intelligence")
      .filter((module) => module.reportingRole !== "PRIMARY_REPORTING")
      .map((module) => module.key),
  },
] as const;

const REPORT_PROFILES_BY_KEY = new Map(REPORT_PROFILES.map((profile) => [profile.key, profile]));

export function getReportProfile(key: AssessmentReportProfileKey) {
  return REPORT_PROFILES_BY_KEY.get(key) ?? null;
}

export function getDefaultReportProfileForAssessmentTarget(target: {
  productId: string | null;
}) {
  return target.productId
    ? getReportProfile("product_baseline_report")
    : getReportProfile("firm_baseline_report");
}
