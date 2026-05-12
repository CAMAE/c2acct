import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { getRequestLocaleMessages } from "@/lib/requestLocale";
import { getVendorProductInsightActivation } from "@/lib/vendorProductInsightActivation";
import { getVendorProductInsightOverviewCards } from "@/lib/vendorProductInsightCards";
import {
  getVendorProductInsightCatalog,
  type VendorProductInsightSnapshot,
} from "@/lib/vendorProductInsightEngine";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Vendor Product Insight | C2Acct",
  description: "Product insight catalog for vendor products.",
};

export default async function VendorProductInsightPage() {
  const messages = await getRequestLocaleMessages();
  const sessionUser = await getSessionUser();
  const cards: VendorProductInsightSnapshot[] = sessionUser?.companyId
    ? await getVendorProductInsightCatalog(sessionUser.companyId)
    : [];

  return (
    <div className="space-y-8">
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
      </section>

      {cards.length === 0 ? (
        <section className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="pat-card p-6">
            <div className="pat-label">No product insight is live yet</div>
            <h2 className="mt-4 text-2xl font-semibold text-[var(--shell-ink)]">Start with a product record</h2>
            <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
              {messages.insights.vendorProduct.noProducts}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link className="pat-button-primary" href="/vendor/product-assessment?panel=new">
                Create first product
              </Link>
              <Link className="pat-button-secondary" href="/vendor/product-assessment">
                Open product assessment workspace
              </Link>
            </div>
          </div>
          <div className="pat-card p-6">
            <div className="pat-label">What PAT needs</div>
            <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--shell-muted)]">
              <p>Product insight is not a standalone catalog shell. It only becomes useful after a real product record exists.</p>
              <p>The next step is product setup, then utility declaration, then the vendor product assessment.</p>
              <p>PAT will not imply product insight before product scope and product evidence are actually live.</p>
            </div>
          </div>
        </section>
      ) : (
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Products in insight: <span className="font-semibold text-[var(--shell-ink)]">{cards.length}</span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Need utility scope: <span className="font-semibold text-[var(--shell-ink)]">{cards.filter((snapshot) => snapshot.product.utilityKeys.length === 0).length}</span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Need vendor submission: <span className="font-semibold text-[var(--shell-ink)]">{cards.filter((snapshot) => snapshot.product.utilityKeys.length > 0 && snapshot.vendorSelfReported.latestScore === null).length}</span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Thin firm-reviewed sample: <span className="font-semibold text-[var(--shell-ink)]">{cards.filter((snapshot) => snapshot.vendorSelfReported.latestScore !== null && snapshot.firmReviewed.assessmentCount < 4).length}</span>
          </div>
        </section>
      )}

      {cards.length > 0 ? (
        <section className="grid gap-5 md:grid-cols-2">
          {cards.map((snapshot) => {
            const activation = getVendorProductInsightActivation(snapshot);
            const compactIndicators = getVendorProductInsightOverviewCards(snapshot)
              .slice(0, 3)
              .flatMap((card) => card.indicators.slice(0, 1))
              .slice(0, 3);
            return (
              <article
                key={snapshot.product.id}
                className="pat-card p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xl font-semibold text-[var(--shell-ink)]">
                      {snapshot.product.name}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)] line-clamp-1">
                      {snapshot.product.summary ?? snapshot.combinedCurrentPatReadout}
                    </p>
                  </div>
                  <span className="rounded-full bg-[var(--shell-accent)]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--shell-accent)]">
                    {snapshot.confidenceLabel}
                  </span>
                </div>
                <div className="mt-5 rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-4">
                  <div className="text-sm font-semibold text-[var(--shell-ink)]">{activation.title}</div>
                  <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">{activation.body}</p>
                  <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">{activation.missingEvidence}</p>
                </div>
                <div className="mt-5 flex flex-wrap gap-2 text-xs leading-5 text-[var(--shell-muted)]">
                  {compactIndicators.map((indicator) => (
                    <span
                      key={`${snapshot.product.id}-${indicator}`}
                      className="rounded-full border border-[var(--shell-border)] px-3 py-1.5"
                    >
                      {indicator}
                    </span>
                  ))}
                </div>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link className="pat-button-primary" href={activation.primaryCta.href}>
                    {activation.primaryCta.label}
                  </Link>
                  {activation.secondaryCta ? (
                    <Link className="pat-button-secondary" href={activation.secondaryCta.href}>
                      {activation.secondaryCta.label}
                    </Link>
                  ) : null}
                </div>
              </article>
            );
          })}
        </section>
      ) : null}
    </div>
  );
}
