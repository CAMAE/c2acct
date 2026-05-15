import { notFound } from "next/navigation";
import { AdminPageIntro } from "@/app/components/admin/AdminShell";
import { requireConsultantSession } from "@/lib/consultantAccess";
import { getEcosystemDetailForConsultant } from "@/lib/ecosystem";
import EcosystemHeader from "./_components/EcosystemHeader";
import FirmGrid from "./_components/FirmGrid";
import HeadlineMetricsRow from "./_components/HeadlineMetricsRow";
import LowestEngagementFirmsCard from "./_components/LowestEngagementFirmsCard";
import OpenEndedPanel from "./_components/OpenEndedPanel";
import VendorAtAGlance from "./_components/VendorAtAGlance";

export const dynamic = "force-dynamic";

export default async function EcosystemDetailPage({
  params,
}: {
  params: Promise<{ ecosystemId: string }>;
}) {
  const { ecosystemId } = await params;
  const access = await requireConsultantSession(`/consultants/ecosystems/${ecosystemId}`);
  if (!access) return null;

  const detail = await getEcosystemDetailForConsultant(
    access.consultantProfileId,
    ecosystemId
  );
  if (!detail) {
    notFound();
  }

  return (
    <div
      className="space-y-8"
      data-testid="ecosystem-detail-page"
      data-ecosystem-id={detail.ecosystemId}
    >
      <AdminPageIntro
        eyebrow="Ecosystem"
        title={detail.ecosystemName}
        description={`${detail.vendorCompanyName} · ${detail.firmCount} firm${detail.firmCount === 1 ? "" : "s"}`}
      />
      <EcosystemHeader data={detail} />
      <HeadlineMetricsRow data={detail} />
      <div className="grid gap-6 lg:grid-cols-2">
        <VendorAtAGlance data={detail} />
        <FirmGrid data={detail} />
      </div>
      <LowestEngagementFirmsCard data={detail} />
      <OpenEndedPanel data={detail} />
    </div>
  );
}
