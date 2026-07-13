import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import RankedBars from "@/app/components/charts/RankedBars";
import ScoreLockup from "@/app/components/charts/ScoreLockup";
import InsightDetailShell from "@/app/components/insights/InsightDetailShell";
import MembershipSurfaceGate from "@/app/components/membership/MembershipSurfaceGate";
import { getSessionUser } from "@/lib/auth/session";
import { getVendorAlignmentInsightContent } from "@/lib/insightContent";
import { MEMBERSHIP_PLAN, resolveMembershipEntitlement } from "@/lib/membership";
import {
  buildVendorAlignmentInsightDetailSurfaceCards,
  buildVendorAlignmentInsightDetailSurfaceContent,
  buildVendorAlignmentPlainLanguage,
  getRequestedVendorAlignmentInsightDetailSurface,
  getVendorAlignmentInsightBundle,
  readVendorAlignmentInsightHeadline,
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

export const dynamic = "force-dynamic";

type Params = {
  key: string;
};

type SearchParams = { surface?: string };

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
        <VendorCategoryPositionCard data={data} />
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
            ? "First-party intent from the Alignment Sandbox: how firms moved your products in and out of their simulated stacks, by category — with the direction each is trending, your most-swapped product, and a ranked next move."
            : "First-party intent from the Alignment Sandbox: how many firms moved your products in and out of their simulated stacks, by category. Elite adds who is moving, which products, and what to do about it."
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
  const bundle = await getVendorAlignmentInsightBundle({
    vendorCompanyId: sessionUser.companyId,
  });
  const report = bundle.reports.find((entry) => entry.key === key);
  const content = getVendorAlignmentInsightContent(key);
  const activeSurface = getRequestedVendorAlignmentInsightDetailSurface(resolvedSearchParams?.surface);

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
  const scoredModules = report.contributingModules
    .filter((module) => typeof module.averageScore === "number")
    .sort((left, right) => (right.averageScore ?? 0) - (left.averageScore ?? 0));
  const scoredCapabilities = report.contributingCapabilities
    .filter((capability) => typeof capability.averageScore === "number")
    .sort((left, right) => (right.averageScore ?? 0) - (left.averageScore ?? 0));
  const plainLanguage = buildVendorAlignmentPlainLanguage(report);

  // Block 10c: the detail hero reads the SAME headline as the face card, so the
  // number a vendor sees on /vendor/alignment-insights matches the number on
  // this detail page. (Pre-10c it read report.averageModuleScore — a different,
  // card-invariant number.)
  const headline = readVendorAlignmentInsightHeadline(report);
  let visualLead = null;
  if (!report.locked && headline.displayValue !== "—" && scoredModules.length > 0) {
    visualLead = (
      <>
        <section className="pat-card p-6">
          <div className="grid gap-8 lg:grid-cols-2">
            <ScoreLockup
              label={headline.caption}
              score={headline.score}
              displayValue={headline.displayValue}
              suffix={headline.suffix}
              showBand={headline.showBand}
              context={`This insight's headline signal · ${report.submissionCount} module submission${report.submissionCount === 1 ? "" : "s"} · current-state evidence only`}
            />
            <div className="space-y-6">
              <div>
                <div className="pat-label">Firm-side signal by area · strongest to softest</div>
                <div className="mt-3">
                  <RankedBars
                    title="Aggregated firm module signal behind this insight, ranked strongest to softest"
                    items={scoredModules.map((module) => ({
                      key: module.key,
                      label: module.title,
                      value: module.averageScore,
                    }))}
                    colorByBand
                  />
                </div>
              </div>
              {scoredCapabilities.length ? (
                <div>
                  <div className="pat-label">Supporting capability signal</div>
                  <div className="mt-3">
                    <RankedBars
                      title="Aggregated firm capability signal supporting this insight"
                      items={scoredCapabilities.map((capability) => ({
                        key: capability.key,
                        label: capability.title,
                        value: capability.averageScore,
                      }))}
                      colorByBand
                    />
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </section>
        {plainLanguage ? (
          <section className="pat-card p-6">
            <div className="pat-label">What this means for your positioning</div>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--shell-ink)]">{plainLanguage.summary}</p>
          </section>
        ) : null}
      </>
    );
  }

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
      combinedEvidenceNote={report.locked ? "Live with Elite membership." : undefined}
      muted={report.locked}
      visualLead={visualLead}
    >
      {activeSurface === "elite" ? (
        <section className="pat-card p-6">
          <div className="pat-label">Elite Insights</div>
          {eliteEntitlement.allowed ? (
            <>
              <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
                Your Elite Insights are live — benchmark comparison, future demand, and an expansion
                simulation, each grounded in current firm-reviewed evidence.
              </p>
              <Link href="/vendor/alignment-insights?mode=elite" className="pat-button-secondary mt-4 inline-flex">
                Open Elite Insights
              </Link>
            </>
          ) : (
            <LockedElitePreview
              title={VENDOR_ELITE_V2_META[report.key as keyof typeof VENDOR_ELITE_V2_META]?.title ?? report.title}
              description={
                VENDOR_ELITE_V2_META[report.key as keyof typeof VENDOR_ELITE_V2_META]?.description ??
                "A deeper, firm-reviewed Elite readout."
              }
              shape={
                report.key === "forward-projection"
                  ? "bars"
                  : report.key === "benchmark-comparison"
                    ? "distribution"
                    : "bars"
              }
              upgradeHref={eliteEntitlement.upgradeHref}
            />
          )}
        </section>
      ) : null}
    </InsightDetailShell>
  );
}
