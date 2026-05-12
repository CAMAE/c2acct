import Link from "next/link";
import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { getRequestLocaleMessages } from "@/lib/requestLocale";
import { getVendorProductInsightOverviewCards } from "@/lib/vendorProductInsightCards";
import { getVendorProductInsightSnapshot } from "@/lib/vendorProductInsightEngine";

export const dynamic = "force-dynamic";

type Params = {
  productId: string;
};

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

  const cards = getVendorProductInsightOverviewCards(snapshot);
  const metricCards = cards.filter((card) => card.kind === "metric");
  const proCards = cards.filter((card) => card.kind === "pro");
  const eliteCards = cards.filter((card) => card.kind === "elite");

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
            Utility scope: <span className="font-semibold text-[var(--shell-ink)]">{snapshot.product.utilityScopeLabel}</span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            {messages.insights.shared.confidence}: <span className="font-semibold text-[var(--shell-ink)]">{snapshot.confidenceLabel}</span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            {messages.insights.shared.sample}: <span className="font-semibold text-[var(--shell-ink)]">{snapshot.firmReviewed.assessmentCount}</span>
          </div>
        </div>
        <div className="mt-4 rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-4 text-sm leading-6 text-[var(--shell-muted)]">
          {snapshot.confidenceSummary} {snapshot.confidenceCaveats[0] ?? ""}
        </div>
        <div className="mt-4 rounded-[18px] border border-[var(--shell-border)] bg-white/80 p-4 text-sm leading-6 text-[var(--shell-muted)]">
          Freshness: <span className="font-semibold text-[var(--shell-ink)]">{formatFreshness(snapshot.latestUpdatedAt)}</span>. PAT is describing only the current utility-scoped evidence live on this product today.
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {metricCards.map((card) => (
          <Link key={card.key} href={card.href} className="pat-card pat-card-interactive block p-5">
            <div className="pat-label">{card.eyebrow}</div>
            <div className="mt-3 text-xl font-semibold text-[var(--shell-ink)]">{card.title}</div>
            <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">{card.summary}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs leading-5 text-[var(--shell-muted)]">
              {card.indicators.slice(0, 3).map((indicator) => (
                <span key={`${card.key}-${indicator}`} className="rounded-full border border-[var(--shell-border)] px-3 py-1.5">
                  {indicator}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--shell-ink)]">{messages.insights.vendorProduct.proTitle}</h2>
          <p className="mt-1 text-sm text-[var(--shell-muted)]">
            {messages.insights.vendorProduct.proBody}
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {proCards.map((card) => (
            <Link key={card.key} href={card.href} className="pat-card pat-card-interactive block p-6">
              <div className="pat-label">{card.eyebrow}</div>
              <div className="mt-3 text-lg font-semibold text-[var(--shell-ink)]">{card.title}</div>
              <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">{card.summary}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs leading-5 text-[var(--shell-muted)]">
                {card.indicators.slice(0, 3).map((indicator) => (
                  <span key={`${card.key}-${indicator}`} className="rounded-full border border-[var(--shell-border)] px-3 py-1.5">
                    {indicator}
                  </span>
                ))}
              </div>
            </Link>
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
          {eliteCards.map((card) => (
            <Link
              key={card.key}
              href={card.href}
              className="block rounded-[24px] border border-[rgba(79,191,226,0.28)] bg-[rgba(79,191,226,0.13)] p-6 transition-colors duration-150 hover:border-[rgba(79,191,226,0.45)]"
            >
                <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="pat-label">{card.eyebrow}</div>
                  <div className="mt-3 text-lg font-semibold text-[var(--shell-ink)]">{card.title}</div>
                </div>
                  <span className="rounded-full bg-[rgba(6,54,116,0.1)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--shell-accent)]">
                    {messages.insights.shared.locked}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
                {card.summary}
                </p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs leading-5 text-[var(--shell-muted)]">
                {card.indicators.slice(0, 3).map((indicator) => (
                  <span key={`${card.key}-${indicator}`} className="rounded-full border border-[rgba(79,191,226,0.28)] px-3 py-1.5">
                    {indicator}
                  </span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
