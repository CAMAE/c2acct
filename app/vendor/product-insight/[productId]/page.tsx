import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getVendorProductInsightContent } from "@/lib/insightContent";
import { getRequestLocaleMessages } from "@/lib/requestLocale";
import { PRODUCT_TIER2_INSIGHTS, VENDOR_PRODUCT_TIER2_HOVER } from "@/lib/vendorPat";
import { getVendorProductInsightSnapshot } from "@/lib/vendorProductInsightEngine";

export const dynamic = "force-dynamic";

type Params = {
  productId: string;
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

export default async function VendorProductInsightDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { productId } = await params;
  const messages = await getRequestLocaleMessages();
  const sessionUser = await getSessionUser();

  if (!sessionUser?.companyId) {
    notFound();
  }

  const snapshot = await getVendorProductInsightSnapshot(sessionUser.companyId, productId);
  if (!snapshot) {
    notFound();
  }

  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <div className="pat-label">Product intelligence</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
          {snapshot.product.name}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          {snapshot.combinedCurrentPatReadout}
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            {messages.insights.shared.confidence}: <span className="font-semibold text-[var(--shell-ink)]">{snapshot.confidenceLabel}</span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            {messages.insights.shared.sample}: <span className="font-semibold text-[var(--shell-ink)]">{snapshot.firmReviewed.assessmentCount}</span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            {messages.insights.shared.freshness}: <span className="font-semibold text-[var(--shell-ink)]">{formatFreshness(snapshot.latestUpdatedAt)}</span>
          </div>
        </div>
        <div className="mt-4 rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-4 text-sm leading-6 text-[var(--shell-muted)]">
          {snapshot.confidenceSummary}
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="pat-button-secondary" href="/vendor/product-insight">
            {messages.insights.vendorProduct.backToProductCatalog}
          </Link>
          <Link className="pat-button-primary" href={`/vendor/product-assessment/${snapshot.product.id}`}>
            {messages.insights.vendorProduct.openProductAssessment}
          </Link>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="pat-card p-5">
          <div className="pat-label">{messages.insights.vendorProduct.vendorSelfReportedSignal}</div>
          <div className="mt-3 text-3xl font-semibold text-[var(--shell-ink)]">
            {formatScore(snapshot.vendorSelfReported.latestScore)}
          </div>
          <div className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
            Latest vendor product assessment score for this product only.
          </div>
        </div>
        <div className="pat-card p-5">
          <div className="pat-label">{messages.insights.vendorProduct.firmReviewedSignal}</div>
          <div className="mt-3 text-3xl font-semibold text-[var(--shell-ink)]">
            {formatScore(snapshot.firmReviewed.averageScore)}
          </div>
          <div className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
            Average across {snapshot.firmReviewed.assessmentCount} firm product assessment
            {snapshot.firmReviewed.assessmentCount === 1 ? "" : "s"} tied to this product.
          </div>
        </div>
        <div className="pat-card p-5">
          <div className="pat-label">{messages.insights.vendorProduct.combinedPatReadout}</div>
          <div className="mt-3 text-base font-semibold leading-7 text-[var(--shell-ink)]">
            {snapshot.divergence.label}
          </div>
          <div className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
            Divergence:{" "}
            <span className="font-semibold text-[var(--shell-ink)]">
              {snapshot.divergence.points === null
                ? "--"
                : `${Math.abs(snapshot.divergence.points)} points`}
            </span>
          </div>
        </div>
      </section>

      <section className="pat-card p-6">
        <div className="pat-label">{messages.insights.vendorProduct.productBasis}</div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="rounded-[18px] bg-[var(--shell-soft)] p-4">
            <div className="text-sm font-semibold text-[var(--shell-ink)]">
              Vendor self-reported signal
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
              Latest score: {formatScore(snapshot.vendorSelfReported.latestScore)}. Strongest current
              sections:{" "}
              {snapshot.vendorSelfReported.sectionEvidence.length > 0
                ? snapshot.vendorSelfReported.sectionEvidence
                    .slice()
                    .sort((left, right) => (right.averageScore ?? 0) - (left.averageScore ?? 0))
                    .slice(0, 3)
                    .map((section) => `${section.title} (${formatScore(section.averageScore)})`)
                    .join(", ")
                : "No section evidence yet."}
            </p>
          </div>
          <div className="rounded-[18px] bg-[var(--shell-soft)] p-4">
            <div className="text-sm font-semibold text-[var(--shell-ink)]">Firm-reviewed signal</div>
            <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
              Average score: {formatScore(snapshot.firmReviewed.averageScore)} across{" "}
              {snapshot.firmReviewed.assessmentCount} assessment
              {snapshot.firmReviewed.assessmentCount === 1 ? "" : "s"}. Utility evidence:{" "}
              {snapshot.firmReviewed.utilityEvidence.some((utility) => utility.averageScore !== null)
                ? snapshot.firmReviewed.utilityEvidence
                    .filter((utility) => utility.averageScore !== null)
                    .map((utility) => `${utility.utilityLabel} (${formatScore(utility.averageScore)})`)
                    .join(", ")
                : "No utility-level firm review evidence yet."}
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--shell-ink)]">{messages.insights.vendorProduct.proTitle}</h2>
          <p className="mt-1 text-sm text-[var(--shell-muted)]">
            {messages.insights.vendorProduct.proBody}
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {snapshot.insightRecords.map((insight) => {
            const content = getVendorProductInsightContent(insight.key);
            return (
              <div key={insight.key} className="pat-card p-6">
                <div className="text-lg font-semibold text-[var(--shell-ink)]">{insight.title}</div>
                <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
                  {insight.currentStateSummary}
                </p>
                <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--shell-muted)]">
                  <div>
                    <span className="font-semibold text-[var(--shell-ink)]">{messages.insights.shared.whatItIs}:</span>{" "}
                    {insight.what}
                  </div>
                  <div>
                    <span className="font-semibold text-[var(--shell-ink)]">{messages.insights.shared.whyItMatters}:</span> {insight.why}
                  </div>
                  <div>
                    <span className="font-semibold text-[var(--shell-ink)]">{messages.insights.shared.howToUseIt}:</span> {insight.how}
                  </div>
                </div>
                <div className="mt-5 rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-4">
                    <div className="pat-label">{messages.insights.shared.exactAssessmentBasis}</div>
                  <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
                    {insight.exactAssessmentBasis}
                  </p>
                  {content?.basisTemplate ? (
                    <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
                        {messages.insights.vendorProduct.basisTemplateLabel}: {content.basisTemplate}
                      </p>
                    ) : null}
                  {content?.confidenceDisclaimerTemplate ? (
                    <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
                      {content.confidenceDisclaimerTemplate}
                    </p>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="pat-card p-6">
        <div className="pat-label">{messages.insights.shared.confidenceAndSampleCaveat}</div>
        <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--shell-muted)]">
          <p>{snapshot.confidenceSummary}</p>
          <p>{messages.common.liveEvidenceEnglishOnly}</p>
          {snapshot.confidenceCaveats.map((caveat) => (
            <p key={caveat}>{caveat}</p>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--shell-ink)]">{messages.insights.vendorProduct.eliteTitle}</h2>
          <p className="mt-1 text-sm text-[var(--shell-muted)]">
            {messages.insights.vendorProduct.eliteBody}
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {PRODUCT_TIER2_INSIGHTS.map((insight) => {
            const content = getVendorProductInsightContent(insight.key);
            return (
              <div
                key={insight.key}
                title={content?.lockedState?.disclaimer ?? VENDOR_PRODUCT_TIER2_HOVER}
                className="rounded-[24px] border border-[rgba(79,191,226,0.28)] bg-[rgba(79,191,226,0.13)] p-6 shadow-[0_18px_48px_rgba(15,23,42,0.06)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="text-lg font-semibold text-[var(--shell-ink)]">{insight.title}</div>
                  <span className="rounded-full bg-[rgba(6,54,116,0.1)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--shell-accent)]">
                    {messages.insights.shared.locked}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
                  {content?.lockedState?.summary ??
                    "Elite membership detail is restricted. PAT does not claim benchmark or forecast intelligence here yet."}
                </p>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
