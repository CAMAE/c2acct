import { notFound } from "next/navigation";
import InsightDetailShell from "@/app/components/insights/InsightDetailShell";
import { getSessionUser } from "@/lib/auth/session";
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
  const activeSurface = getRequestedVendorProductInsightDetailSurface(resolvedSearchParams?.surface);

  if (!content || (!isTier2 && !tier1Record) || (isTier2 && !tier2Definition)) {
    notFound();
  }

  const pageTitle = isTier2 ? tier2Definition?.title ?? content.title : tier1Record?.title ?? content.title;
  const heroBody = isTier2
    ? content.lockedState?.summary ?? ELITE_PLACEHOLDER_MESSAGE
    : tier1Record?.currentStateSummary ?? content.summary;
  const surfaceCards = buildVendorProductInsightDetailSurfaceCards({
    snapshot,
    insightKey,
    record: tier1Record ?? null,
    locked: isTier2,
  });
  const surfaceContent = buildVendorProductInsightDetailSurfaceContent({
    snapshot,
    insightKey,
    record: tier1Record ?? null,
    surface: activeSurface,
    locked: isTier2,
  });
  const toggleOptions = surfaceCards.map((card) => ({
    key: card.key,
    label: card.title,
    href: card.href ?? `/vendor/product-insight/${snapshot.product.id}/${insightKey}?surface=${card.key}`,
  }));
  const combinedEvidenceText = isTier2
    ? `Current product evidence remains limited to ${snapshot.product.utilityScopeLabel}, vendor signal ${
        snapshot.vendorSelfReported.latestScore === null ? "--" : `${Math.round(snapshot.vendorSelfReported.latestScore)}%`
      }, and firm-reviewed signal ${
        snapshot.firmReviewed.averageScore === null ? "--" : `${Math.round(snapshot.firmReviewed.averageScore)}%`
      } across ${snapshot.firmReviewed.assessmentCount} assessment${snapshot.firmReviewed.assessmentCount === 1 ? "" : "s"}.`
    : `Current evidence combines ${snapshot.product.utilityScopeLabel}, vendor self-reported signal ${
        snapshot.vendorSelfReported.latestScore === null ? "--" : `${Math.round(snapshot.vendorSelfReported.latestScore)}%`
      }, and firm-reviewed signal ${
        snapshot.firmReviewed.averageScore === null ? "--" : `${Math.round(snapshot.firmReviewed.averageScore)}%`
      } across ${snapshot.firmReviewed.assessmentCount} assessment${snapshot.firmReviewed.assessmentCount === 1 ? "" : "s"}.`;

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
    />
  );
}
