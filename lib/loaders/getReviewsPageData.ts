import { PRODUCT_EXTERNAL_REVIEW_MODULE_KEY } from "@/lib/assessment-module-catalog";
import { getViewerProductContextData } from "@/lib/loaders/getViewerProductContext";

export async function getReviewsPageData() {
  const context = await getViewerProductContextData({
    includeSponsoredProducts: true,
  });

  if (context.kind !== "ok") {
    return {
      context,
      products: [] as Array<{ id: string; name: string; companyId: string; accessReason?: string }>,
      companyType: null as "FIRM" | "VENDOR" | null,
      canReview: false,
      reviewModuleKey: PRODUCT_EXTERNAL_REVIEW_MODULE_KEY,
    };
  }

  return {
    context,
    products: context.products,
    companyType: context.companyType,
    canReview: context.companyType === "FIRM" && context.products.length > 0,
    reviewModuleKey: PRODUCT_EXTERNAL_REVIEW_MODULE_KEY,
  };
}
