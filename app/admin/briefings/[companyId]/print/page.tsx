import Link from "next/link";
import { notFound } from "next/navigation";
import { CompanyBriefingView } from "@/app/components/admin/briefings/BriefingBoard";
import PrintButton from "@/app/components/admin/briefings/PrintButton";
import { getAdminCompanyBriefing } from "@/lib/adminBriefingEngine";
import { requireAdminSession } from "@/lib/adminControlPlane";

export const dynamic = "force-dynamic";

export default async function AdminCompanyBriefingPrintPage({
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
      <section className="pat-card p-8 print:shadow-none">
        <div className="pat-label">Print briefing</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
          {briefing.company.name}
        </h1>
        <p className="mt-4 max-w-4xl text-base leading-7 text-[var(--shell-muted)]">
          Export-friendly PAT briefing. This page uses the same live current-state data as the main operator view and does not add unsupported benchmarks or forecasts.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 print:hidden">
          <Link className="pat-button-secondary" href={`/admin/briefings/${briefing.company.id}`}>
            Back to full briefing
          </Link>
          <PrintButton />
        </div>
      </section>

      <CompanyBriefingView briefing={briefing} printMode />
    </div>
  );
}
