import { notFound } from "next/navigation";
import InsightDetailShell from "@/app/components/insights/InsightDetailShell";
import VendorProductInsightDetailBody from "@/app/components/insights/detail/VendorProductInsightDetailBody";
import LockedElitePreview from "@/app/components/insights/LockedElitePreview";
import ProductEliteDepthCard from "@/app/components/insights/elite/ProductEliteDepthCard";
import { getSessionUser } from "@/lib/auth/session";
import { MEMBERSHIP_PLAN, resolveMembershipEntitlement } from "@/lib/membership";
import { buildProductCohortPosition, buildProductTrajectory } from "@/lib/eliteInsightsV2";
import { poolForViewerBoundary, resolveCompanyBoundary } from "@/lib/dataBoundary";
import prisma from "@/lib/prisma";
import {
  ELITE_PLACEHOLDER_CTA,
  ELITE_PLACEHOLDER_MESSAGE,
  getVendorProductInsightContent,
} from "@/lib/insightContent";
import { PRODUCT_TIER2_INSIGHTS } from "@/lib/vendorPat";
import {
  buildVendorProductInsightDetailSurfaceCards,
  buildVendorProductInsightDetailSurfaceContent,
  getRequestedVendorProductInsightDetailSurface,
  getVendorProductInsightSnapshot,
} from "@/lib/vendorProductInsightEngine";

export const dynamic = "force-dynamic";

type Params = {
  productId: string;
  insightKey: string;
};

type SearchParams = {
  surface?: string;
};

export default async function VendorProductInsightSlicePage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams?: Promise<SearchParams>;
}) {
  const { productId, insightKey } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const sessionUser = await getSessionUser();

  if (!sessionUser?.companyId) {
    notFound();
  }

  const snapshot = await getVendorProductInsightSnapshot(sessionUser.companyId, productId);
  if (!snapshot) {
    notFound();
  }

  const content = getVendorProductInsightContent(insightKey);
  const tier2Definition = PRODUCT_TIER2_INSIGHTS.find((insight) => insight.key === insightKey);
  const tier1Record = snapshot.insightRecords.find((insight) => insight.key === insightKey);
  const isTier2 = content?.tier === 2;
  const requestedSurface = getRequestedVendorProductInsightDetailSurface(resolvedSearchParams?.surface);

  if (!content || (!isTier2 && !tier1Record) || (isTier2 && !tier2Definition)) {
    notFound();
  }

  // Block 11e + hybrid Elite depth: the Pro product-insight surface carries an
  // Elite toggle on every tier-1 insight. ENTITLED Elite vendors now see LIVE
  // product-level depth (cohort position + ranked action); non-entitled vendors
  // see the honest blurred upsell preview. The toggle is absent only on tier-2
  // routes (a direct ?surface=elite there falls back to the data pane).
  const eliteEntitlement = await resolveMembershipEntitlement(sessionUser, "vendor", MEMBERSHIP_PLAN.ELITE);
  const eliteEntitled = eliteEntitlement.allowed;
  const showEliteToggle = !isTier2;
  const showEliteUpsell = showEliteToggle && !eliteEntitled;
  const activeSurface =
    requestedSurface === "elite" && !showEliteToggle ? "evidence" : requestedSurface;

  // Live product cohort position — only computed for an entitled vendor viewing
  // the elite pane of a tier-1 product insight (bounded single-category query).
  const showLiveDepth = eliteEntitled && showEliteToggle && activeSurface === "elite";
  const productCohort = showLiveDepth
    ? await buildProductCohortPosition(prisma, {
        productId: snapshot.product.id,
        category: snapshot.product.category ?? null,
        boundaries: poolForViewerBoundary(await resolveCompanyBoundary(sessionUser.companyId)),
      })
    : null;
  const productTrajectory = showLiveDepth
    ? await buildProductTrajectory(prisma, snapshot.product.id)
    : null;

  const pageTitle = isTier2 ? tier2Definition?.title ?? content.title : tier1Record?.title ?? content.title;
  const heroBody = isTier2
    ? content.lockedState?.summary ?? ELITE_PLACEHOLDER_MESSAGE
    : tier1Record?.currentStateSummary ?? content.summary;
  const surfaceCards = buildVendorProductInsightDetailSurfaceCards({
    snapshot,
    insightKey,
    record: tier1Record ?? null,
    locked: isTier2,
    showElite: showEliteToggle,
  });
  const surfaceContent = buildVendorProductInsightDetailSurfaceContent({
    snapshot,
    insightKey,
    record: tier1Record ?? null,
    surface: activeSurface,
    locked: isTier2,
    eliteEntitled,
  });
  const toggleOptions = surfaceCards.map((card) => ({
    key: card.key,
    label: card.title,
    href: card.href ?? `/vendor/product-insight/${snapshot.product.id}/${insightKey}?surface=${card.key}`,
  }));
  const vendorSignalNode =
    snapshot.vendorSelfReported.latestScore === null ? (
      "--"
    ) : (
      <strong className="font-semibold text-[var(--shell-ink)]">{Math.round(snapshot.vendorSelfReported.latestScore)}%</strong>
    );
  const firmSignalNode =
    snapshot.firmReviewed.averageScore === null ? (
      "--"
    ) : (
      <strong className="font-semibold text-[var(--shell-ink)]">{Math.round(snapshot.firmReviewed.averageScore)}%</strong>
    );
  const assessmentSuffix = `${snapshot.firmReviewed.assessmentCount} assessment${snapshot.firmReviewed.assessmentCount === 1 ? "" : "s"}.`;

  const vendorScore = snapshot.vendorSelfReported.latestScore;
  const firmScore = snapshot.firmReviewed.averageScore;

  // Block 12a: the full Pro product-insight body is a shared component rendered
  // here AND inline when a product face card expands.
  const visualLead =
    !isTier2 && (vendorScore !== null || firmScore !== null) ? (
      <VendorProductInsightDetailBody snapshot={snapshot} record={tier1Record ?? null} />
    ) : null;

  const combinedEvidenceText = isTier2 ? (
    <>
      Current product evidence remains limited to {snapshot.product.utilityScopeLabel}, vendor signal {vendorSignalNode}, and firm-reviewed signal {firmSignalNode} across {assessmentSuffix}
    </>
  ) : (
    <>
      Current evidence combines {snapshot.product.utilityScopeLabel}, vendor self-reported signal {vendorSignalNode}, and firm-reviewed signal {firmSignalNode} across {assessmentSuffix}
    </>
  );

  return (
    <InsightDetailShell
      activeKey={activeSurface}
      eyebrow="Product insight"
      title={pageTitle}
      summary={heroBody}
      subtitle={snapshot.product.name}
      surfaceContent={surfaceContent}
      toggleAriaLabel="Product insight views"
      toggleOptions={toggleOptions}
      combinedEvidenceText={combinedEvidenceText}
      combinedEvidenceNote={isTier2 ? `${ELITE_PLACEHOLDER_CTA}.` : undefined}
      muted={isTier2}
      visualLead={visualLead}
    >
      {activeSurface === "elite" && eliteEntitled && productCohort ? (
        <ProductEliteDepthCard
          cohort={productCohort}
          trajectory={productTrajectory}
          productName={snapshot.product.name}
          weakestArea={weakestFirmReviewedArea(snapshot.firmReviewed.utilityEvidence)}
        />
      ) : showEliteUpsell && activeSurface === "elite" ? (
        <section className="pat-card p-6">
          <div className="pat-label">Elite Insights</div>
          <LockedElitePreview
            title="Elite product intelligence"
            description="Cohort position, ranked action, and trend for this product — live with Elite membership."
            shape="distribution"
            upgradeHref={eliteEntitlement.upgradeHref}
          />
        </section>
      ) : null}
    </InsightDetailShell>
  );
}

/** The product's thinnest firm-reviewed feature area (for the ranked-action hint). */
function weakestFirmReviewedArea(
  utilityEvidence: ReadonlyArray<{ utilityLabel: string; averageScore: number | null }>
): string | null {
  const scored = utilityEvidence.filter(
    (u): u is { utilityLabel: string; averageScore: number } => typeof u.averageScore === "number"
  );
  if (scored.length === 0) return null;
  return [...scored].sort((a, b) => a.averageScore - b.averageScore)[0]!.utilityLabel;
}
