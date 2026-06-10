import { notFound } from "next/navigation";
import DivergenceBar from "@/app/components/charts/DivergenceBar";
import RankedBars from "@/app/components/charts/RankedBars";
import ScoreLockup from "@/app/components/charts/ScoreLockup";
import InsightDetailShell from "@/app/components/insights/InsightDetailShell";
import { getSessionUser } from "@/lib/auth/session";
import {
  ELITE_PLACEHOLDER_CTA,
  ELITE_PLACEHOLDER_MESSAGE,
  getVendorProductInsightContent,
} from "@/lib/insightContent";
import { PRODUCT_TIER2_INSIGHTS } from "@/lib/vendorPat";
import {
  buildVendorProductGapCallout,
  buildVendorProductInsightDetailSurfaceCards,
  buildVendorProductInsightDetailSurfaceContent,
  buildVendorProductPlainLanguage,
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
  const gapCallout = buildVendorProductGapCallout(snapshot);
  const plainLanguage = !isTier2 ? buildVendorProductPlainLanguage(snapshot, tier1Record ?? null) : null;
  const sectionEvidence = (tier1Record?.vendorSectionEvidence ?? []).filter(
    (section) => section.averageScore !== null
  );

  let visualLead = null;
  if (!isTier2 && (vendorScore !== null || firmScore !== null)) {
    visualLead = (
      <>
        <section className="pat-card p-6">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <div className="pat-label">Vendor story vs firm review</div>
              <div className="mt-4">
                {vendorScore !== null && firmScore !== null ? (
                  <DivergenceBar
                    title={`${snapshot.product.name}: vendor self-reported vs firm-reviewed signal`}
                    a={{ label: "Vendor self-reported", value: vendorScore }}
                    b={{ label: "Firm-reviewed", value: firmScore }}
                    gapLabel={gapCallout.label}
                  />
                ) : (
                  <ScoreLockup
                    label={vendorScore !== null ? "Vendor self-reported signal" : "Firm-reviewed signal"}
                    score={vendorScore ?? firmScore}
                    context={
                      vendorScore !== null
                        ? "No firm-reviewed signal yet — the divergence view opens once the first firm review lands."
                        : "No vendor self-reported signal yet, so the divergence view cannot open."
                    }
                  />
                )}
              </div>
            </div>
            {sectionEvidence.length ? (
              <div>
                <div className="pat-label">Self-reported section signal</div>
                <div className="mt-3">
                  <RankedBars
                    title="Vendor self-reported section scores behind this insight, ranked strongest to softest"
                    items={[...sectionEvidence]
                      .sort((left, right) => (right.averageScore ?? 0) - (left.averageScore ?? 0))
                      .map((section) => ({
                        key: section.key,
                        label: section.title,
                        value: section.averageScore,
                      }))}
                    colorByBand
                  />
                </div>
              </div>
            ) : null}
          </div>
        </section>
        {plainLanguage ? (
          <section className="pat-card p-6">
            <div className="pat-label">What this means for your product</div>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--shell-ink)]">{plainLanguage.summary}</p>
            {plainLanguage.nextSteps.length ? (
              <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-6 text-[var(--shell-muted)]">
                {plainLanguage.nextSteps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ul>
            ) : null}
          </section>
        ) : null}
      </>
    );
  }

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
    />
  );
}
