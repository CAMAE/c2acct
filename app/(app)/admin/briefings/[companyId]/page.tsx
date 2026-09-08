import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageIntro } from "@/app/components/admin/AdminShell";
import { CompanyBriefingView } from "@/app/components/admin/briefings/BriefingBoard";
import { getAdminCompanyBriefing } from "@/lib/adminBriefingEngine";
import FollowUpEvidencePanel from "@/app/components/assessment/FollowUpEvidencePanel";
import { getFirmFollowUpEvidence } from "@/lib/assessment/followUpEvidence";
import { isFollowUpMcEnabled } from "@/lib/followUpMc";

export const dynamic = "force-dynamic";

export default async function AdminCompanyBriefingPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ q?: string }>;
}) {
  const { companyId } = await params;
  const { q } = await searchParams;
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
        title={`${briefing.company.name} briefing`}
        description="Board-ready PAT briefing built from current firm, product, and ecosystem evidence only."
      />

      <div className="flex flex-wrap gap-3 print:hidden">
        <Link className="pat-button-secondary" href="/admin/briefings">
          Back to briefings
        </Link>
        <Link className="pat-button-secondary" href={`/admin/briefings/${briefing.company.id}/print`}>
          Open print view
        </Link>
      </div>

      <CompanyBriefingView briefing={briefing} searchQuery={q} />
      {followUpMcEnabled && followUpEvidence ? <FollowUpEvidencePanel modules={followUpEvidence} /> : null}
    </div>
  );
}
