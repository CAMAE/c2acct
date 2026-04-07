import Link from "next/link";
import { notFound } from "next/navigation";
import InsightStatusBadge from "@/app/components/insights/InsightStatusBadge";
import { getSessionUser } from "@/lib/auth/session";
import { getVendorProductInsightContent } from "@/lib/insightContent";
import { getRequestLocaleMessages } from "@/lib/requestLocale";
import { PRODUCT_TIER2_INSIGHTS, VENDOR_PRODUCT_TIER2_HOVER } from "@/lib/vendorPat";
import { getVendorProductInsightSnapshot } from "@/lib/vendorProductInsightEngine";

export const dynamic = "force-dynamic";

type Params = {
  productId: string;
  insightKey: string;
};

function formatScore(score: number | null) {
  if (score === null) {
    return "--";
  }
  return `${Math.round(score)}%`;
}

function formatFreshness(value: Date | null) {
  return value ? value.toLocaleDateString() : "No live update yet";
}

export default async function VendorProductInsightSlicePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { productId, insightKey } = await params;
  const sessionUser = await getSessionUser();
  const messages = await getRequestLocaleMessages();

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

  if (!content || (!isTier2 && !tier1Record) || (isTier2 && !tier2Definition)) {
    notFound();
  }

  const pageTitle = isTier2 ? tier2Definition?.title ?? content.title : tier1Record?.title ?? content.title;
  const heroBody = isTier2
    ? content.lockedState?.summary ?? "This Elite product intelligence card is staged only."
    : tier1Record?.currentStateSummary ?? content.summary;

  return (
    <div className="space-y-8">
      <section className={`${isTier2 ? "pat-card pat-card-muted" : "pat-card"} p-8`}>
        <div className="pat-label">Product insight detail</div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <h1 className="text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
            {pageTitle}
          </h1>
          <InsightStatusBadge
            label={isTier2 ? messages.insights.shared.locked : tier1Record?.confidenceLabel ?? snapshot.confidenceLabel}
            tone={isTier2 ? "locked" : "active"}
          />
        </div>
        <p className="mt-2 text-sm font-medium text-[var(--shell-muted)]">{snapshot.product.name}</p>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">{heroBody}</p>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Utility scope:{" "}
            <span className="font-semibold text-[var(--shell-ink)]">{snapshot.product.utilityScopeLabel}</span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            {messages.insights.vendorProduct.vendorSelfReportedSignal}:{" "}
            <span className="font-semibold text-[var(--shell-ink)]">
              {formatScore(snapshot.vendorSelfReported.latestScore)}
            </span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            {messages.insights.vendorProduct.firmReviewedSignal}:{" "}
            <span className="font-semibold text-[var(--shell-ink)]">
              {formatScore(snapshot.firmReviewed.averageScore)}
            </span>{" "}
            across{" "}
            <span className="font-semibold text-[var(--shell-ink)]">{snapshot.firmReviewed.assessmentCount}</span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            {messages.insights.shared.freshness}:{" "}
            <span className="font-semibold text-[var(--shell-ink)]">
              {formatFreshness(snapshot.latestUpdatedAt)}
            </span>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="pat-button-secondary" href={`/vendor/product-insight/${snapshot.product.id}`}>
            Back to product overview
          </Link>
          <Link className="pat-button-secondary" href="/vendor/product-insight">
            {messages.insights.vendorProduct.backToProductCatalog}
          </Link>
          <Link className="pat-button-primary" href={`/vendor/product-assessment/${snapshot.product.id}`}>
            {messages.insights.vendorProduct.openProductAssessment}
          </Link>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <article className="pat-card p-6">
          <div className="pat-label">{messages.insights.shared.whatItIs}</div>
          <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
            {isTier2 ? content.lockedState?.what ?? content.what : tier1Record?.what ?? content.what}
          </p>
        </article>
        <article className="pat-card p-6">
          <div className="pat-label">{messages.insights.shared.whyItMatters}</div>
          <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
            {isTier2 ? content.lockedState?.why ?? content.why : tier1Record?.why ?? content.why}
          </p>
        </article>
        <article className="pat-card p-6">
          <div className="pat-label">{messages.insights.shared.howToUseIt}</div>
          <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
            {isTier2 ? content.lockedState?.how ?? content.how : tier1Record?.how ?? content.how}
          </p>
        </article>
      </section>

      {!isTier2 && tier1Record ? (
        <>
          <section className="pat-card p-6">
            <div className="pat-label">{messages.insights.shared.exactAssessmentBasis}</div>
            <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--shell-muted)]">
              <p>{tier1Record.exactAssessmentBasis}</p>
              {content.basisTemplate ? (
                <p>
                  {messages.insights.vendorProduct.basisTemplateLabel}: {content.basisTemplate}
                </p>
              ) : null}
              {content.confidenceDisclaimerTemplate ? <p>{content.confidenceDisclaimerTemplate}</p> : null}
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
            <article className="pat-card p-6">
              <div className="pat-label">Vendor section evidence</div>
              <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--shell-muted)]">
                <p>
                  Strongest current sections:{" "}
                  {tier1Record.strongestVendorSections.length > 0
                    ? tier1Record.strongestVendorSections
                        .map((section) => `${section.title} (${formatScore(section.averageScore)})`)
                        .join(", ")
                    : "No section evidence yet."}
                </p>
                <p>
                  Weakest current sections:{" "}
                  {tier1Record.weakestVendorSections.length > 0
                    ? tier1Record.weakestVendorSections
                        .map((section) => `${section.title} (${formatScore(section.averageScore)})`)
                        .join(", ")
                    : "No section evidence yet."}
                </p>
                <div className="grid gap-3">
                  {tier1Record.vendorSectionEvidence.length > 0 ? (
                    tier1Record.vendorSectionEvidence.map((section) => (
                      <div
                        key={section.key}
                        className="rounded-[18px] border border-[var(--shell-border)] bg-white/70 p-4"
                      >
                        <div className="font-semibold text-[var(--shell-ink)]">{section.title}</div>
                        <div className="mt-1 text-sm text-[var(--shell-muted)]">
                          Average signal: {formatScore(section.averageScore)}
                        </div>
                        <div className="mt-1 text-sm text-[var(--shell-muted)]">
                          Questions in scope: {section.questionCount}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[18px] border border-[var(--shell-border)] bg-white/70 p-4 text-sm text-[var(--shell-muted)]">
                      No vendor section evidence is populated yet for this insight slice.
                    </div>
                  )}
                </div>
              </div>
            </article>

            <article className="pat-card p-6">
              <div className="pat-label">Firm utility evidence</div>
              <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--shell-muted)]">
                <p>
                  Strongest utility confirmation:{" "}
                  {tier1Record.strongestFirmUtilities.length > 0
                    ? tier1Record.strongestFirmUtilities
                        .map((utility) => `${utility.utilityLabel} (${formatScore(utility.averageScore)})`)
                        .join(", ")
                    : "Firm-reviewed utility signal is still thin."}
                </p>
                <p>
                  Weakest utility confirmation:{" "}
                  {tier1Record.weakestFirmUtilities.length > 0
                    ? tier1Record.weakestFirmUtilities
                        .map((utility) => `${utility.utilityLabel} (${formatScore(utility.averageScore)})`)
                        .join(", ")
                    : "Firm-reviewed utility signal is still thin."}
                </p>
                <div className="grid gap-3">
                  {snapshot.firmReviewed.utilityEvidence.some((utility) => utility.averageScore !== null) ? (
                    snapshot.firmReviewed.utilityEvidence.map((utility) => (
                      <div
                        key={utility.utilityKey}
                        className="rounded-[18px] border border-[var(--shell-border)] bg-white/70 p-4"
                      >
                        <div className="font-semibold text-[var(--shell-ink)]">{utility.utilityLabel}</div>
                        <div className="mt-1 text-sm text-[var(--shell-muted)]">
                          Average signal: {formatScore(utility.averageScore)}
                        </div>
                        <div className="mt-1 text-sm text-[var(--shell-muted)]">
                          Response count: {utility.responseCount}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[18px] border border-[var(--shell-border)] bg-white/70 p-4 text-sm text-[var(--shell-muted)]">
                      No firm utility evidence is strong enough yet to separate this insight slice cleanly.
                    </div>
                  )}
                </div>
              </div>
            </article>
          </section>

          <section className="pat-card p-6">
            <div className="pat-label">{messages.insights.shared.confidenceAndSampleCaveat}</div>
            <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--shell-muted)]">
              <p>{snapshot.confidenceSummary}</p>
              {tier1Record.confidenceCaveats.map((caveat) => (
                <p key={caveat}>{caveat}</p>
              ))}
            </div>
          </section>
        </>
      ) : (
        <>
          <section className="pat-card p-6">
            <div className="pat-label">What data is currently available</div>
            <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--shell-muted)]">
              <p>
                PAT can show the current product utility scope, the latest vendor self-reported signal, the current firm-reviewed signal, and the combined current-state readout for this product.
              </p>
              <p>
                Combined current readout:{" "}
                <span className="font-semibold text-[var(--shell-ink)]">{snapshot.combinedCurrentPatReadout}</span>
              </p>
              <p>
                This available product context does not create benchmark, projection, or simulation intelligence by itself.
              </p>
            </div>
          </section>

          <section className="grid gap-5 md:grid-cols-2">
            <article className="pat-card p-6">
              <div className="pat-label">Why deeper interpretation is limited</div>
              <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
                {content.lockedState?.basis ?? "No deeper Elite basis is live in the current PAT product."}
              </p>
              <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
                {content.lockedState?.disclaimer ?? VENDOR_PRODUCT_TIER2_HOVER}
              </p>
            </article>
            <article className="pat-card p-6">
              <div className="pat-label">What would unlock fuller detail</div>
              <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
                {content.lockedState?.how ??
                  "This remains locked until Elite membership and a broader evidence layer make the deeper route honest to show."}
              </p>
            </article>
          </section>
        </>
      )}
    </div>
  );
}
