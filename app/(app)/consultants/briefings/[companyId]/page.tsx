import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageIntro } from "@/app/components/admin/AdminShell";
import { CompanyBriefingView } from "@/app/components/admin/briefings/BriefingBoard";
import { getAdminCompanyBriefing } from "@/lib/adminBriefingEngine";
import { requireConsultantCompanyAccess } from "@/lib/consultantAccess";
import FollowUpEvidencePanel from "@/app/components/assessment/FollowUpEvidencePanel";
import { getFirmFollowUpEvidence } from "@/lib/assessment/followUpEvidence";
import { isFollowUpMcEnabled } from "@/lib/followUpMc";

export const dynamic = "force-dynamic";

export default async function ConsultantCompanyBriefingPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { companyId } = await params;
  const { q } = await searchParams;
  const consultantAccess = await requireConsultantCompanyAccess(
    companyId,
    `/consultants/briefings/${companyId}`
  );
  if (!consultantAccess) {
    notFound();
  }

  const briefing = await getAdminCompanyBriefing(companyId);
  if (!briefing) {
    notFound();
  }
  // MC follow-on box: the firm's follow-up evidence (selections or legacy text), dark.
  const followUpMcEnabled = isFollowUpMcEnabled();
  const followUpEvidence = followUpMcEnabled ? await getFirmFollowUpEvidence(companyId) : null;

  return (
    <div className="space-y-8">
      <AdminPageIntro
        eyebrow="Consultant briefing"
        title={`${briefing.company.name} briefing`}
        description="This consultant view reuses the same live PAT current-state briefing engine as C2Core. It does not add benchmark, forecast, or executive narrative outside the available evidence."
      />

      <div className="flex flex-wrap gap-3 print:hidden">
        <Link className="pat-button-secondary" href="/consultants">
          Back to consultant overview
        </Link>
      </div>

      <CompanyBriefingView
        briefing={briefing}
        searchQuery={q}
        basePath={`/consultants/briefings/${briefing.company.id}`}
        printHref={null}
      />
      {followUpMcEnabled && followUpEvidence ? <FollowUpEvidencePanel modules={followUpEvidence} /> : null}
    </div>
  );
}
