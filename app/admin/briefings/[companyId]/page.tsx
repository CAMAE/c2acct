import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageIntro } from "@/app/components/admin/AdminShell";
import { CompanyBriefingView } from "@/app/components/admin/briefings/BriefingBoard";
import { getAdminCompanyBriefing } from "@/lib/adminBriefingEngine";
import { requireAdminSession } from "@/lib/adminControlPlane";

export const dynamic = "force-dynamic";

export default async function AdminCompanyBriefingPage({
  params,
}: {
  params: Promise<{ companyId: string }>;
}) {
  await requireAdminSession();
  const { companyId } = await params;
  const briefing = await getAdminCompanyBriefing(companyId);

  if (!briefing) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <AdminPageIntro
        title={`${briefing.company.name} briefing`}
        description="Board-ready PAT briefing built from current individual, firm, product, and ecosystem evidence only."
      />

      <div className="flex flex-wrap gap-3 print:hidden">
        <Link className="pat-button-secondary" href="/admin/briefings">
          Back to briefings
        </Link>
        <Link className="pat-button-secondary" href={`/admin/briefings/${briefing.company.id}/print`}>
          Open print view
        </Link>
      </div>

      <CompanyBriefingView briefing={briefing} />
    </div>
  );
}
