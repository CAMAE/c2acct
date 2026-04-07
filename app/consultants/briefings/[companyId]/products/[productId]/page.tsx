import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageIntro } from "@/app/components/admin/AdminShell";
import { ProductBriefingView } from "@/app/components/admin/briefings/BriefingBoard";
import { getAdminProductBriefing } from "@/lib/adminBriefingEngine";
import { requireConsultantCompanyAccess } from "@/lib/consultantAccess";

export const dynamic = "force-dynamic";

export default async function ConsultantProductBriefingPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string; productId: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { companyId, productId } = await params;
  const { q } = await searchParams;
  const consultantAccess = await requireConsultantCompanyAccess(
    companyId,
    `/consultants/briefings/${companyId}/products/${productId}`
  );
  if (!consultantAccess) {
    notFound();
  }

  const briefing = await getAdminProductBriefing(companyId, productId);
  if (!briefing) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <AdminPageIntro
        eyebrow="Consultant product briefing"
        title={`${briefing.company.name} · ${briefing.product.productName}`}
        description="This product slice stays inside the assigned firm-company scope. All product detail, confidence, and open-ended response cards come directly from the current PAT briefing engine."
      />

      <div className="flex flex-wrap gap-3 print:hidden">
        <Link className="pat-button-secondary" href={`/consultants/briefings/${briefing.company.id}`}>
          Back to company briefing
        </Link>
      </div>

      <ProductBriefingView
        briefing={briefing}
        searchQuery={q}
        basePath={`/consultants/briefings/${briefing.company.id}`}
      />
    </div>
  );
}
