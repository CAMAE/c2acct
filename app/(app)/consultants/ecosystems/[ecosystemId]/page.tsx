import { notFound } from "next/navigation";
import { AdminPageIntro } from "@/app/components/admin/AdminShell";
import { requireConsultantSession } from "@/lib/consultantAccess";
import { getEcosystemDetailForConsultant } from "@/lib/ecosystem";
import EcosystemHeader from "./_components/EcosystemHeader";
import FirmGrid from "./_components/FirmGrid";
import HeadlineMetricsRow from "./_components/HeadlineMetricsRow";
import LowestEngagementFirmsCard from "./_components/LowestEngagementFirmsCard";
import OpenEndedPanel from "./_components/OpenEndedPanel";
import FollowUpAggregatePanel from "@/app/components/assessment/FollowUpAggregatePanel";
import { getEcosystemFollowUpAggregate, getVendorFollowUpAggregate } from "@/lib/assessment/followUpEvidence";
import { isFollowUpMcEnabled } from "@/lib/followUpMc";
import { isVendorFollowUpMcEnabled } from "@/lib/vendorFollowUpMc";
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
  // MC follow-on box: top-picked follow-up option per question with n, dark.
  const followUpMcEnabled = isFollowUpMcEnabled();
  // vendor-followup-mc box (change 6c): the vendor picks over this ecosystem's products.
  const vendorFollowUpMcEnabled = isVendorFollowUpMcEnabled();
  const vendorFollowUpAggregate = vendorFollowUpMcEnabled ? await getVendorFollowUpAggregate(detail.vendorProductIds) : null;
  const followUpAggregate = followUpMcEnabled
    ? await getEcosystemFollowUpAggregate(detail.firmGrid.map((row) => row.firmCompanyId))
    : null;

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
      <HeadlineMetricsRow data={detail} ecosystemId={detail.ecosystemId} />
      <div className="grid gap-6 lg:grid-cols-2">
        <FirmGrid data={detail} />
        <div className="space-y-6">
          <VendorAtAGlance data={detail} />
          <LowestEngagementFirmsCard data={detail} />
        </div>
      </div>
      <OpenEndedPanel data={detail} />
      {vendorFollowUpMcEnabled && vendorFollowUpAggregate ? (
        <FollowUpAggregatePanel
          rows={vendorFollowUpAggregate.rows}
          firmCount={vendorFollowUpAggregate.productCount}
          firmsWithSelections={vendorFollowUpAggregate.productsWithSelections}
          eyebrow="Vendor follow-up picks"
          title="Top-picked option per product question"
          unit={{ singular: "product", plural: "products" }}
          testId="vendor-followup-aggregate-panel"
        />
      ) : null}
      {followUpMcEnabled && followUpAggregate ? (
        <FollowUpAggregatePanel
          rows={followUpAggregate.rows}
          firmCount={followUpAggregate.firmCount}
          firmsWithSelections={followUpAggregate.firmsWithSelections}
        />
      ) : null}
    </div>
  );
}
