import { redirect } from "next/navigation";
import InsightDetailPage from "@/app/components/InsightDetailPage";
import { getVisibleProductCatalogForViewer } from "@/lib/intelligence/getVisibleProductCatalogForViewer";
import { getProductIntelligencePageData } from "@/lib/intelligence/getProductIntelligencePageData";
import { findOutputCardForReportProfile } from "@/lib/intelligence/outputRegistry";

export const dynamic = "force-dynamic";

function normalizeQueryValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0].trim() : "";
  }

  return typeof value === "string" ? value.trim() : "";
}

export default async function VendorInsightDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ insightKey: string }>;
  searchParams?: Promise<{ productId?: string | string[] | undefined }>;
}) {
  const { insightKey } = await params;
  const registryMatch = findOutputCardForReportProfile("product_intelligence_report", insightKey);

  if (!registryMatch) {
    redirect("/vendor/insights");
  }

  const resolvedSearchParams = (await searchParams) ?? {};
  const requestedProductId = normalizeQueryValue(resolvedSearchParams.productId);
  const catalog = await getVisibleProductCatalogForViewer({ searchParams: resolvedSearchParams, includeSponsoredProducts: true });

  if (!catalog) {
    redirect("/login?callbackUrl=%2Fvendor%2Finsights");
  }

  const selectedProductId = requestedProductId || catalog.products[0]?.id || "";
  if (!selectedProductId) {
    redirect("/products");
  }

  const data = await getProductIntelligencePageData({
    productId: selectedProductId,
    searchParams: resolvedSearchParams,
  });

  if (!data) {
    redirect("/products");
  }

  const runtimeCard = data.outputSections.flatMap((section) => section.cards).find((card) => (card.insightKey ?? card.id) === insightKey) ?? null;

  return (
    <InsightDetailPage
      roleLabel="Vendor insight detail"
      backHref="/vendor/insights"
      backLabel="Back to vendor insights"
      title={registryMatch.card.title}
      subtitle={`Showing the canonical product-intelligence context for ${data.product.name}. If multiple visible products exist, pass ?productId=... to switch context.`}
      card={registryMatch.card}
      runtimeCard={runtimeCard}
      chartSeries={data.chartSeries}
    />
  );
}
