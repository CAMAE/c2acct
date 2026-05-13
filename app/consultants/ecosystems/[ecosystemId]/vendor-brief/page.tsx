import { notFound } from "next/navigation";
import { AdminPageIntro } from "@/app/components/admin/AdminShell";
import { requireConsultantSession } from "@/lib/consultantAccess";
import { getVendorBriefForConsultant } from "@/lib/briefs";
import ActionRoadmap from "./_components/ActionRoadmap";
import BriefMethodology from "./_components/BriefMethodology";
import BriefTOC from "./_components/BriefTOC";
import CapabilityComparison from "./_components/CapabilityComparison";
import EvaluationMethodology from "./_components/EvaluationMethodology";
import MarketContext from "./_components/MarketContext";
import PerFirmStrengthsCautions from "./_components/PerFirmStrengthsCautions";
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
      className="grid gap-8 lg:grid-cols-[220px_1fr]"
      data-testid="vendor-brief-page"
      data-brief-id={brief.briefId}
    >
      <aside className="lg:pr-2">
        <BriefTOC />
      </aside>
      <div className="space-y-12">
        <AdminPageIntro
          eyebrow="Vendor brief"
          title={brief.vendorCompanyName}
          description={`${brief.ecosystemName} · ${brief.firmCount} firm${brief.firmCount === 1 ? "" : "s"} · ${brief.productCount} product${brief.productCount === 1 ? "" : "s"}`}
        />
        <VendorBriefExecutiveSummary data={brief} />
        <MarketContext data={brief} />
        <EvaluationMethodology data={brief} />
        <SelfVsMarketDelta data={brief} />
        <PerFirmStrengthsCautions data={brief} />
        <CapabilityComparison data={brief} />
        <ActionRoadmap data={brief} />
        <BriefMethodology data={brief} />
      </div>
    </div>
  );
}
