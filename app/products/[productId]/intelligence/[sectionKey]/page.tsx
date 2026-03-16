import { redirect } from "next/navigation";
import ProductIntelligenceView from "@/app/products/ProductIntelligenceView";
import { getProductIntelligencePageData } from "@/lib/intelligence/getProductIntelligencePageData";

export const dynamic = "force-dynamic";

export default async function ProductIntelligenceSectionPage({
  params,
}: {
  params: Promise<{ productId: string; sectionKey: string }>;
}) {
  const { productId, sectionKey } = await params;
  const data = await getProductIntelligencePageData({ productId });

  if (!data) {
    redirect("/products");
  }

  if (!data.sectionById.has(sectionKey)) {
    redirect(`/products/${encodeURIComponent(productId)}/intelligence`);
  }

  return <ProductIntelligenceView data={data} selectedSectionId={sectionKey} />;
}
