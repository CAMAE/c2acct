import { notFound } from "next/navigation";
import { AdminPageIntro } from "@/app/components/admin/AdminShell";
import { requireConsultantSession } from "@/lib/consultantAccess";
import { getFirmBriefForConsultant } from "@/lib/firmBriefs";
import FirmAlignmentHeader from "./_components/FirmAlignmentHeader";
import FirmBriefMethodology from "./_components/FirmBriefMethodology";
import FiveModuleRadar from "./_components/FiveModuleRadar";
import SixQuarterRoadmap from "./_components/SixQuarterRoadmap";
import StackFitAnalysis from "./_components/StackFitAnalysis";

export const dynamic = "force-dynamic";

export default async function FirmBriefPage({
  params,
}: {
  params: Promise<{ ecosystemId: string; firmCompanyId: string }>;
}) {
  const { ecosystemId, firmCompanyId } = await params;
  const access = await requireConsultantSession(
    `/consultants/ecosystems/${ecosystemId}/firm/${firmCompanyId}`
  );
  if (!access) return null;

  const brief = await getFirmBriefForConsultant(
    access.consultantProfileId,
    ecosystemId,
    firmCompanyId
  );
  if (!brief) {
    notFound();
  }

  return (
    <div
      className="space-y-8"
      data-testid="firm-brief-page"
      data-brief-id={brief.briefId}
    >
      <AdminPageIntro
        eyebrow="Firm brief"
        title={brief.firmCompanyName}
        description={`${brief.ecosystemName} · ${brief.vendorCompanyName}`}
      />
      <FirmAlignmentHeader data={brief} />
      <FiveModuleRadar data={brief} />
      <StackFitAnalysis data={brief} />
      <SixQuarterRoadmap data={brief} />
      <FirmBriefMethodology data={brief} />
    </div>
  );
}
