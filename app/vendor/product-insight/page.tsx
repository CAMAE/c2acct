import Link from "next/link";
import InsightStatusBadge from "@/app/components/insights/InsightStatusBadge";
import InsightsModeShell from "@/app/components/insights/InsightsModeShell";
import { compactInsightSummary } from "@/app/components/insights/insightCardText";
import { getSessionUser } from "@/lib/auth/session";
import { getVendorProductInsightContent } from "@/lib/insightContent";
import { getRequestLocaleMessages } from "@/lib/requestLocale";
import {
  PRODUCT_TIER2_INSIGHTS,
  VENDOR_PRODUCT_TIER2_HOVER,
} from "@/lib/vendorPat";
import {
  getVendorProductInsightCatalog,
  type VendorProductInsightSnapshot,
} from "@/lib/vendorProductInsightEngine";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Vendor Product Insight | C2Acct",
  description: "Product insight catalog for vendor products.",
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

export default async function VendorProductInsightPage() {
  const messages = await getRequestLocaleMessages();
  const sessionUser = await getSessionUser();
  const cards: VendorProductInsightSnapshot[] = sessionUser?.companyId
    ? await getVendorProductInsightCatalog(sessionUser.companyId)
    : [];
  const assessedProducts = cards.filter((snapshot) => snapshot.vendorSelfReported.latestScore !== null).length;
  const firmReviewedProducts = cards.filter((snapshot) => snapshot.firmReviewed.assessmentCount > 0).length;

  return (
    <InsightsModeShell
      hero={
        <section className="pat-card p-8">
          <div className="pat-label">Product insight</div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
            {messages.insights.vendorProduct.heroTitle}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
            {messages.insights.vendorProduct.heroBody}
          </p>
          <div className="mt-4 rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-4 text-sm leading-6 text-[var(--shell-muted)]">
            {messages.insights.vendorProduct.heroNote}
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
              Products in catalog: <span className="font-semibold text-[var(--shell-ink)]">{cards.length}</span>
            </div>
            <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
              Vendor-assessed products: <span className="font-semibold text-[var(--shell-ink)]">{assessedProducts}</span>
            </div>
            <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
              Firm-reviewed products: <span className="font-semibold text-[var(--shell-ink)]">{firmReviewedProducts}</span>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="pat-button-secondary" href="/vendor">
              {messages.insights.vendorProduct.backToVendorHome}
            </Link>
            <Link className="pat-button-primary" href="/vendor/product-assessment">
              {messages.insights.vendorProduct.openProductAssessment}
            </Link>
          </div>
        </section>
      }
      proContent={
        cards.length === 0 ? (
          <div className="pat-card p-6 text-sm leading-6 text-[var(--shell-muted)]">
            {messages.insights.vendorProduct.noProducts}
          </div>
        ) : (
          <>
            <div>
              <h2 className="text-2xl font-semibold text-[var(--shell-ink)]">
                {messages.insights.vendorProduct.proTitle}
              </h2>
              <p className="mt-1 text-sm text-[var(--shell-muted)]">
                {messages.insights.vendorProduct.proBody}
              </p>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              {cards.map((snapshot) => {
                const fitContent = getVendorProductInsightContent("current-product-fit");
                return (
                  <Link
                    key={snapshot.product.id}
                    href={`/vendor/product-insight/${snapshot.product.id}`}
                    className="pat-card pat-card-interactive block p-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <div className="text-xl font-semibold text-[var(--shell-ink)]">
                          {snapshot.product.name}
                        </div>
                        <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
                          {compactInsightSummary(
                            snapshot.product.summary ?? fitContent?.summary,
                            "No summary added yet."
                          )}
                        </p>
                      </div>
                      <InsightStatusBadge label={snapshot.confidenceLabel} />
                    </div>
                    <div className="mt-4 text-xs leading-5 text-[var(--shell-muted)]">
                      Vendor: {formatScore(snapshot.vendorSelfReported.latestScore)} · Firm:{" "}
                      {formatScore(snapshot.firmReviewed.averageScore)} across{" "}
                      {snapshot.firmReviewed.assessmentCount} assessment
                      {snapshot.firmReviewed.assessmentCount === 1 ? "" : "s"}
                    </div>
                    <div className="mt-2 text-xs leading-5 text-[var(--shell-muted)]">
                      {messages.insights.shared.freshness}: {formatFreshness(snapshot.latestUpdatedAt)} ·{" "}
                      {compactInsightSummary(snapshot.combinedCurrentPatReadout)}
                    </div>
                  </Link>
                );
              })}
            </div>
          </>
        )
      }
      eliteContent={
        <>
          <div>
            <h2 className="text-2xl font-semibold text-[var(--shell-ink)]">
              {messages.insights.vendorProduct.eliteTitle}
            </h2>
            <p className="mt-1 text-sm text-[var(--shell-muted)]">
              {messages.insights.vendorProduct.eliteBody}
            </p>
          </div>
          <section className="pat-card p-6">
            <div className="pat-label">Current route truth</div>
            <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
              The product catalog does not yet split Elite product-intelligence detail into standalone catalog routes. The locked cards below mark the next layer honestly, while deep product pages remain the current clickable destination.
            </p>
          </section>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {PRODUCT_TIER2_INSIGHTS.map((insight) => {
              const content = getVendorProductInsightContent(insight.key);
              return (
                <div
                  key={insight.key}
                  title={content?.lockedState?.disclaimer ?? VENDOR_PRODUCT_TIER2_HOVER}
                  className="pat-card pat-card-muted p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="text-lg font-semibold text-[var(--shell-ink)]">{insight.title}</div>
                    <InsightStatusBadge label="Locked" tone="locked" />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
                    {compactInsightSummary(
                      content?.lockedState?.summary ?? insight.description,
                      "Elite product intelligence stays staged until the broader evidence layer is real."
                    )}
                  </p>
                  <div className="mt-4 text-xs leading-5 text-[var(--shell-muted)]">
                    {content?.lockedState?.disclaimer ?? VENDOR_PRODUCT_TIER2_HOVER}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      }
      helpContent={
        <>
          <div>
            <h2 className="text-2xl font-semibold text-[var(--shell-ink)]">How Pro and Elite differ here</h2>
            <p className="mt-1 text-sm text-[var(--shell-muted)]">
              This page separates the live product catalog from the staged higher-order intelligence layer so product-level evidence stays truthful while the PAT roadmap remains visible.
            </p>
          </div>
          <div className="grid gap-5 xl:grid-cols-3">
            <article className="pat-card p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="text-lg font-semibold text-[var(--shell-ink)]">Pro access</div>
                <InsightStatusBadge label="Pro Insights" />
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
                Pro uses live product detail pages. Each product card stays clickable and reflects the current vendor self-signal, firm-reviewed signal, freshness, and combined PAT readout.
              </p>
            </article>
            <article className="pat-card pat-card-muted p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="text-lg font-semibold text-[var(--shell-ink)]">Elite access</div>
                <InsightStatusBadge label="Locked" tone="locked" />
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
                Elite remains a visible but locked layer. The catalog does not yet have separate Elite detail routes, so PAT shows the slot without pretending the route split is already built.
              </p>
            </article>
            <article className="pat-card p-6">
              <div className="text-lg font-semibold text-[var(--shell-ink)]">What to do next</div>
              <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
                If a product still lacks current-state signal, complete the vendor product assessment first. If the product already has signal, open its product intelligence page from the Pro view.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link className="pat-button-primary" href="/vendor/product-assessment">
                  Open product assessment
                </Link>
                <Link className="pat-button-secondary" href="/vendor/help">
                  Review vendor help
                </Link>
              </div>
            </article>
          </div>
        </>
      }
    />
  );
}
