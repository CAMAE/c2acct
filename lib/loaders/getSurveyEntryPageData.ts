import { listRuntimeSurveyModules } from "@/lib/assessment-module-catalog";
import { getViewerProductContextData } from "@/lib/loaders/getViewerProductContext";

function normalizeQueryValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0].trim() : "";
  }
  return typeof value === "string" ? value.trim() : "";
}

export async function getSurveyEntryPageData(input?: {
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const productIdFilter = normalizeQueryValue(input?.searchParams?.productId) || null;
  const context = await getViewerProductContextData({
    searchParams: input?.searchParams,
    includeSponsoredProducts: false,
  });

  const firmModules = listRuntimeSurveyModules("FIRM");
  const productModules = listRuntimeSurveyModules("PRODUCT");

  return {
    context,
    firmModules,
    productModules,
    baselineFirmModule: firmModules[0] ?? null,
    productModule: productModules[0] ?? null,
    productIdFilter,
  };
}
