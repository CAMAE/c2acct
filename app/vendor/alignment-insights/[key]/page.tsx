import { notFound, redirect } from "next/navigation";
import InsightDetailShell from "@/app/components/insights/InsightDetailShell";
import MembershipSurfaceGate from "@/app/components/membership/MembershipSurfaceGate";
import { getSessionUser } from "@/lib/auth/session";
import { getVendorAlignmentInsightContent } from "@/lib/insightContent";
import { MEMBERSHIP_PLAN, resolveMembershipEntitlement } from "@/lib/membership";
import {
  buildVendorAlignmentInsightDetailSurfaceCards,
  buildVendorAlignmentInsightDetailSurfaceContent,
  getRequestedVendorAlignmentInsightDetailSurface,
  getVendorAlignmentInsightBundle,
} from "@/lib/vendorAlignmentInsightEngine";

export const dynamic = "force-dynamic";

type Params = {
  key: string;
};

type SearchParams = { surface?: string };

export default async function VendorAlignmentInsightDetailPage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams?: Promise<SearchParams>;
}) {
  const { key } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect("/sign-in/vendor");
  }
  const entitlement = await resolveMembershipEntitlement(sessionUser, "vendor", MEMBERSHIP_PLAN.PRO);
  if (!entitlement.allowed) {
    return (
      <MembershipSurfaceGate
        audience="vendor"
        surfaceLabel="Vendor alignment insight"
        title="Vendor alignment insight view requires Pro membership"
        body="This insight view is part of the current Pro vendor tier. PAT keeps the route visible so the upgrade path stays explicit, but the grounded readout opens only after Pro is active."
        displayName={entitlement.membership.displayName}
        currentPlan={entitlement.membership.plan}
        currentStatus={entitlement.membership.status}
        requiredPlan={entitlement.requiredPlan}
        membershipHref={entitlement.membershipHref}
        upgradeHref={entitlement.upgradeHref}
        workspaceHref="/vendor/alignment-insights"
        workspaceLabel="Back to vendor alignment insights"
        availableNow="The baseline vendor state still keeps portal entry and membership routing available."
        stagedNote="This page packages current firm-alignment signal into the current vendor Pro layer, so PAT does not open it from the baseline state."
      />
    );
  }
  const bundle = await getVendorAlignmentInsightBundle();
  const report = bundle.reports.find((entry) => entry.key === key);
  const content = getVendorAlignmentInsightContent(key);
  const activeSurface = getRequestedVendorAlignmentInsightDetailSurface(resolvedSearchParams?.surface);

  if (!report) {
    notFound();
  }

  const surfaceCards = buildVendorAlignmentInsightDetailSurfaceCards({ report });
  const surfaceContent = buildVendorAlignmentInsightDetailSurfaceContent({
    report,
    surface: activeSurface,
  });
  const toggleOptions = surfaceCards.map((card) => ({
    key: card.key,
    label: card.title,
    href: card.href ?? `/vendor/alignment-insights/${report.key}?surface=${card.key}`,
  }));
  const combinedEvidenceText = report.locked
    ? "Current evidence stays grounded in the current firm PAT signal already visible in this route, while the deeper Elite layer remains unavailable."
    : "Current evidence combines the current firm PAT signal, aligned module patterns, and supporting capability evidence behind this vendor alignment view.";

  return (
    <InsightDetailShell
      activeKey={activeSurface}
      eyebrow="Vendor alignment insight"
      title={report.title}
      summary={report.locked ? (content?.lockedState?.summary ?? report.currentStateSummary) : report.currentStateSummary}
      surfaceContent={surfaceContent}
      toggleAriaLabel="Vendor alignment insight views"
      toggleOptions={toggleOptions}
      combinedEvidenceText={combinedEvidenceText}
      combinedEvidenceNote={report.locked ? "Coming soon. Unlock with Elite membership." : undefined}
      muted={report.locked}
    />
  );
}
