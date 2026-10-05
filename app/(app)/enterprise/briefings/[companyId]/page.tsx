import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminPageIntro } from "@/app/components/admin/AdminShell";
import { PortalBriefingView } from "@/app/components/admin/briefings/BriefingBoard";
import { getAdminCompanyBriefing } from "@/lib/adminBriefingEngine";
import { getFirmBriefingInEcosystem } from "@/lib/ecosystem";
import { isIndividualSurfacesEnabled } from "@/lib/pilotSurfaces";
import { requireEnterpriseCompanyAccess } from "@/lib/enterpriseAccess";
import { getFirmFollowUpEvidence } from "@/lib/assessment/followUpEvidence";
import { isFollowUpMcEnabled } from "@/lib/followUpMc";

export const dynamic = "force-dynamic";

export default async function EnterpriseCompanyBriefingPage({
  params,
  searchParams,
}: {
  params: Promise<{ companyId: string }>;
  searchParams: Promise<{ q?: string; module?: string }>;
}) {
  const { companyId } = await params;
  const { q, module: moduleFilter } = await searchParams;
  const enterpriseAccess = await requireEnterpriseCompanyAccess(companyId);
  if (!enterpriseAccess) {
    notFound();
  }

  // R59 (hotfix-demo-1 change 8): the briefing is read through the ecosystem's own
  // context and preload — the readers the ecosystem page uses — so the ecosystem
  // layer counts the ecosystem's assessed firms. A firm outside every owned
  // ecosystem keeps the unscoped read.
  const ecosystemScope = enterpriseAccess.ecosystems.find(
    (scope) => scope.vendorCompanyId && scope.firmCompanies.some((firm) => firm.id === companyId)
  );
  const briefing = ecosystemScope?.vendorCompanyId
    ? await getFirmBriefingInEcosystem({ companyId, vendorCompanyId: ecosystemScope.vendorCompanyId })
    : await getAdminCompanyBriefing(companyId);
  if (!briefing) {
    notFound();
  }
  // MC follow-on box: the firm's follow-up evidence (selections or legacy text), dark.
  const followUpMcEnabled = isFollowUpMcEnabled();
  const followUpEvidence = followUpMcEnabled ? await getFirmFollowUpEvidence(companyId) : null;

  return (
    <div className="space-y-8">
      <AdminPageIntro
        eyebrow="Enterprise briefing"
        title={`${briefing.company.name} briefing`}
        description="Built from this firm's current PAT evidence. No benchmark or forecast is added here."
      />

      <div className="flex flex-wrap gap-3 print:hidden">
        <Link className="pat-button-secondary" href="/enterprise">
          Back to enterprise overview
        </Link>
      </div>

      <PortalBriefingView
        briefing={briefing}
        searchQuery={q}
        basePath={`/enterprise/briefings/${briefing.company.id}`}
        followUpModules={followUpMcEnabled && followUpEvidence ? followUpEvidence : null}
        moduleFilter={moduleFilter}
        individualSurfacesEnabled={isIndividualSurfacesEnabled()}
      />
    </div>
  );
}
