import { isNewFrontDoorEnabled } from "@/lib/frontDoor";
import { notFound, redirect } from "next/navigation";
import InsightDetailShell from "@/app/components/insights/InsightDetailShell";
import VendorAlignmentInsightDetailBody from "@/app/components/insights/detail/VendorAlignmentInsightDetailBody";
import MembershipSurfaceGate from "@/app/components/membership/MembershipSurfaceGate";
import { getSessionUser } from "@/lib/auth/session";
import { getVendorAlignmentInsightContent } from "@/lib/insightContent";
import { MEMBERSHIP_PLAN, resolveMembershipEntitlement } from "@/lib/membership";
import {
  buildVendorAlignmentInsightDetailSurfaceContent,
  getVendorAlignmentInsightBundle,
} from "@/lib/vendorAlignmentInsightEngine";
import prisma from "@/lib/prisma";
import { getVendorProductInsightCatalog } from "@/lib/vendorProductInsightEngine";
import { poolForViewerBoundary, resolveCompanyBoundary } from "@/lib/dataBoundary";
import {
  buildVendorCategoryPosition,
  buildVendorDemandSignals,
  buildVendorGapMap,
} from "@/lib/eliteInsightsV2";
import EliteCardShell from "@/app/components/insights/elite/EliteCardShell";
import LockedElitePreview from "@/app/components/insights/LockedElitePreview";
import { VENDOR_ELITE_V2_META } from "@/lib/eliteInsightsV2";
import VendorCategoryPositionCard from "@/app/components/insights/elite/VendorCategoryPositionCard";
import VendorDemandSignalsCard from "@/app/components/insights/elite/VendorDemandSignalsCard";
import VendorGapMapCard from "@/app/components/insights/elite/VendorGapMapCard";
import { sandboxLabel } from "@/lib/sandboxLabel";

export const dynamic = "force-dynamic";

type Params = {
  key: string;
};


/**
 * Elite Insights v2 (verdict §4) — render a vendor Tier-2 decision product: V1
 * Category Position (benchmark-comparison), V2 Demand Signals (forward-projection),
 * V3 Alignment Gap Map (scenario-simulation). Rank/distribution/heatmap, not averages.
 */
async function renderVendorEliteSurface(
  key: string,
  companyId: string,
  { identityAllowed }: { identityAllowed: boolean }
) {
  const boundary = await resolveCompanyBoundary(companyId);

  if (key === "benchmark-comparison") {
    const data = await buildVendorCategoryPosition(prisma, companyId, boundary);
    return (
      <EliteCardShell
        eyebrow="Vendor Elite · Category Position"
        title="Category Position"
        summary="Where your products rank in their category's firm-reviewed distribution — a percentile and rank, not an average. Categories below the minimum-n safe harbor are withheld."
      >
        <VendorCategoryPositionCard data={data} chartDesign={isNewFrontDoorEnabled() ? "labelled" : "classic"} />
      </EliteCardShell>
    );
  }

  if (key === "forward-projection") {
    // Demand Signals is dual-tier: the per-category COUNTS are Pro-tier (the
    // teaser), while trend/top-product/ranked-action are Elite. identityAllowed
    // is false for a Pro caller, so buildVendorDemandSignals strips the Elite
    // fields to null — a non-entitled account never receives Elite-classified data.
    const data = await buildVendorDemandSignals(prisma, companyId, poolForViewerBoundary(boundary), {
      identityAllowed,
    });
    return (
      <EliteCardShell
        eyebrow={identityAllowed ? "Vendor Elite · Demand Signals" : "Vendor · Demand Signals"}
        title="Demand Signals"
        summary={
          identityAllowed
            ? `First-party intent from the ${sandboxLabel()}: how firms moved your products in and out of their simulated stacks, by category — with the direction each is trending, your most-swapped product, and a ranked next move.`
            : `First-party intent from the ${sandboxLabel()}: how many firms moved your products in and out of their simulated stacks, by category. Elite adds who is moving, which products, and what to do about it.`
        }
      >
        <VendorDemandSignalsCard data={data} />
      </EliteCardShell>
    );
  }

  if (key === "scenario-simulation") {
    const catalog = await getVendorProductInsightCatalog(companyId);
    const data = buildVendorGapMap(
      catalog.map((snapshot) => ({
        productId: snapshot.product.id,
        productName: snapshot.product.name,
        firmAssessmentCount: snapshot.firmReviewed.assessmentCount,
        firmDimensions: snapshot.firmReviewed.dimensionEvidence.map((d) => ({ key: d.key, title: d.title, score: d.score })),
        vendorDimensions: snapshot.vendorSelfReported.dimensionEvidence.map((d) => ({ key: d.key, title: d.title, score: d.score })),
      }))
    );
    return (
      <EliteCardShell
        eyebrow="Vendor Elite · Alignment Gap Map"
        title="Alignment Gap Map"
        summary="Per product-fit dimension: where firms confirm your story (green) and where they read you lower than you rate yourself (orange). Where to fix the story; where to expand next. Divergence floor applies."
      >
        <VendorGapMapCard data={data} />
      </EliteCardShell>
    );
  }

  return null;
}

export default async function VendorAlignmentInsightDetailPage({ params }: { params: Promise<Params> }) {
  const { key } = await params;
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
        body="This insight view is part of the current Pro vendor tier. This page stays visible so the upgrade path stays explicit, but the grounded readout opens only after Pro is active."
        displayName={entitlement.membership.displayName}
        currentPlan={entitlement.membership.plan}
        currentStatus={entitlement.membership.status}
        requiredPlan={entitlement.requiredPlan}
        membershipHref={entitlement.membershipHref}
        upgradeHref={entitlement.upgradeHref}
        workspaceHref="/vendor/alignment-insights"
        workspaceLabel="Back to vendor alignment insights"
        availableNow="The baseline vendor state still keeps portal entry and membership routing available."
        upgradeNote="This page packages current firm-alignment signal into the current vendor Pro layer, so PAT does not open it from the baseline state."
      />
    );
  }
  const bundle = await getVendorAlignmentInsightBundle({
    vendorCompanyId: sessionUser.companyId,
  });
  const report = bundle.reports.find((entry) => entry.key === key);
  const content = getVendorAlignmentInsightContent(key);

  if (!report) {
    notFound();
  }

  // Elite Insights v2 (verdict §4): an Elite member opening a Tier-2 vendor
  // surface gets the chart-led decision product; Pro-only members keep "Coming soon".
  const eliteEntitlement = await resolveMembershipEntitlement(sessionUser, "vendor", MEMBERSHIP_PLAN.ELITE);
  if (report.tier === 2 && sessionUser.companyId) {
    if (eliteEntitlement.allowed) {
      const surface = await renderVendorEliteSurface(key, sessionUser.companyId, { identityAllowed: true });
      if (surface) return surface;
    } else if (key === "forward-projection") {
      // Pro-tier Demand Signals: per-category swap COUNTS only (identity/trend/
      // action stripped). Counts are Pro-classified by Cam's 2026-07-12 ruling;
      // this is NOT a LockedElitePreview (that grammar means zero data).
      const surface = await renderVendorEliteSurface(key, sessionUser.companyId, { identityAllowed: false });
      if (surface) return surface;
    }
  }

  // Box 3h (R58, Cam 10/01): one surface, no Pro / Elite / Help pill, no ?surface.
  const surfaceContent = buildVendorAlignmentInsightDetailSurfaceContent({ report, surface: "pro" });
  // Block 12a: the full Pro insight body is a shared component rendered here AND
  // inline when a face card expands on /vendor/alignment-insights.
  const visualLead = report.locked ? null : <VendorAlignmentInsightDetailBody report={report} />;

  const combinedEvidenceText = report.locked
    ? "Current evidence stays grounded in the current firm PAT signal already visible in this page, while the deeper Elite layer remains unavailable."
    : "Current evidence combines the current firm PAT signal, aligned module patterns, and supporting capability evidence behind this vendor alignment view.";

  return (
    <InsightDetailShell
      audience="vendor"
      eyebrow="Vendor alignment insight"
      title={report.title}
      summary={report.locked ? (content?.lockedState?.summary ?? report.currentStateSummary) : report.currentStateSummary}
      surfaceContent={surfaceContent}
      combinedEvidenceText={combinedEvidenceText}
      combinedEvidenceNote={report.locked ? "Live with Elite membership." : undefined}
      muted={report.locked}
      visualLead={visualLead}
    >
      {report.locked ? (
        // A Pro viewer on a tier-2 key: the honest locked preview (v2 name + blurred chart),
        // never Elite-classified data. Elite viewers never reach here for tier 2.
        <section className="pat-card p-6">
          <LockedElitePreview
            title={VENDOR_ELITE_V2_META[report.key as keyof typeof VENDOR_ELITE_V2_META]?.title ?? report.title}
            description={
              VENDOR_ELITE_V2_META[report.key as keyof typeof VENDOR_ELITE_V2_META]?.description ??
              "A deeper, firm-reviewed Elite readout."
            }
            shape={report.key === "benchmark-comparison" ? "distribution" : "bars"}
            upgradeHref={eliteEntitlement.upgradeHref}
          />
        </section>
      ) : null}
    </InsightDetailShell>
  );
}
