import { notFound } from "next/navigation";
import { AdminPageIntro } from "@/app/components/admin/AdminShell";
import { requireConsultantSession } from "@/lib/consultantAccess";
import { getVendorBriefForConsultant } from "@/lib/briefs";
import ActionRoadmap from "./_components/ActionRoadmap";
import BriefMethodology from "./_components/BriefMethodology";
import PerFirmHeatmap from "./_components/PerFirmHeatmap";
import SelfVsMarketDelta from "./_components/SelfVsMarketDelta";
import VendorBriefExecutiveSummary from "./_components/VendorBriefExecutiveSummary";

export const dynamic = "force-dynamic";

export default async function VendorBriefPage({
  params,
}: {
  params: Promise<{ ecosystemId: string }>;
}) {
  const { ecosystemId } = await params;
  const access = await requireConsultantSession(
    `/consultants/ecosystems/${ecosystemId}/vendor-brief`
  );
  if (!access) return null;

  const brief = await getVendorBriefForConsultant(access.consultantProfileId, ecosystemId);
  if (!brief) {
    notFound();
  }

  return (
    <div
      className="space-y-8"
      data-testid="vendor-brief-page"
      data-brief-id={brief.briefId}
    >
      <AdminPageIntro
        eyebrow="Vendor brief"
        title={brief.vendorCompanyName}
        description={`${brief.ecosystemName} · ${brief.firmCount} firm${brief.firmCount === 1 ? "" : "s"} · ${brief.productCount} product${brief.productCount === 1 ? "" : "s"}`}
      />
      <VendorBriefExecutiveSummary data={brief} />
      <SelfVsMarketDelta data={brief} />
      <PerFirmHeatmap data={brief} />
      <ActionRoadmap data={brief} />
      <BriefMethodology data={brief} />
    </div>
  );
}
