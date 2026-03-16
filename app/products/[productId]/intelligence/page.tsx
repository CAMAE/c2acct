import { redirect } from "next/navigation";
import ProductIntelligenceView from "@/app/products/ProductIntelligenceView";
import { getProductIntelligencePageData } from "@/lib/intelligence/getProductIntelligencePageData";

export const dynamic = "force-dynamic";

export default async function ProductIntelligencePage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const data = await getProductIntelligencePageData({ productId });

  if (!data) {
    redirect("/products");
  }

  return <ProductIntelligenceView data={data} />;
}
