import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageIntro } from "@/app/components/admin/AdminShell";
import { ProductBriefingView } from "@/app/components/admin/briefings/BriefingBoard";
import { getAdminProductBriefing } from "@/lib/adminBriefingEngine";

export const dynamic = "force-dynamic";

export default async function AdminBriefingProductPage({
  params,
}: {
  params: Promise<{ companyId: string; productId: string }>;
}) {
  const { companyId, productId } = await params;
  const briefing = await getAdminProductBriefing(companyId, productId);

  if (!briefing) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <AdminPageIntro
        title={`${briefing.company.name} · ${briefing.product.productName}`}
        description="Product-level PAT briefing for the selected firm/product pairing, keeping firm raw score, vendor signal, and confidence clearly separated."
      />

      <div className="flex flex-wrap gap-3 print:hidden">
        <Link className="pat-button-secondary" href={`/admin/briefings/${briefing.company.id}`}>
          Back to company briefing
        </Link>
        <Link className="pat-button-secondary" href={`/vendor/product-insight/${briefing.product.productId}`}>
          Open vendor product insight
        </Link>
      </div>

      <ProductBriefingView briefing={briefing} />
    </div>
  );
}
