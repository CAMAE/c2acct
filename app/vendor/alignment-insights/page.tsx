import Link from "next/link";
import { getRequestLocaleMessages } from "@/lib/requestLocale";
import { getVendorAlignmentOverviewCard } from "@/lib/vendorAlignmentInsightCards";
import { getVendorAlignmentInsightBundle } from "@/lib/vendorAlignmentInsightEngine";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Vendor Alignment Insights | C2Acct",
  description: "Vendor alignment insights connected to firm alignment signal.",
};

export default async function VendorAlignmentInsightsPage() {
  const messages = await getRequestLocaleMessages();
  const bundle = await getVendorAlignmentInsightBundle();
  const proReports = bundle.reports.filter((report) => report.tier === 1);
  const eliteReports = bundle.reports.filter((report) => report.tier === 2);

  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <div className="pat-label">Vendor alignment insights</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
          {messages.insights.vendorAlignment.heroTitle}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          {messages.insights.vendorAlignment.heroBody}
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            {messages.insights.vendorAlignment.firmsInSignalBase}:{" "}
            <span className="font-semibold text-[var(--shell-ink)]">{bundle.sampleSize}</span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            {messages.insights.vendorAlignment.currentPatModuleAverage}:{" "}
            <span className="font-semibold text-[var(--shell-ink)]">
              {bundle.averageModuleScore === null ? "--" : `${Math.round(bundle.averageModuleScore)}%`}
            </span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            {messages.insights.vendorAlignment.moduleVariance}:{" "}
            <span className="font-semibold text-[var(--shell-ink)]">
              {bundle.moduleVariance === null ? "--" : bundle.moduleVariance}
            </span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            {messages.insights.vendorAlignment.confidence}:{" "}
            <span className="font-semibold text-[var(--shell-ink)]">{bundle.confidenceLabel}</span>
          </div>
        </div>
        <div className="mt-4 rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-4 text-sm leading-6 text-[var(--shell-muted)]">
          {bundle.confidenceSummary}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--shell-ink)]">{messages.insights.vendorAlignment.proTitle}</h2>
          <p className="mt-1 text-sm text-[var(--shell-muted)]">
            {messages.insights.vendorAlignment.proBody}
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {proReports.map((report) => {
            const card = getVendorAlignmentOverviewCard(report);

            return (
              <Link key={report.key} href={card.href} className="pat-card pat-card-interactive block p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="text-lg font-semibold text-[var(--shell-ink)]">{card.title}</div>
                <span className="rounded-full bg-[var(--shell-accent)]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--shell-accent)]">
                  {card.confidenceLabel}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
                {card.summary}
              </p>
              <p className="mt-4 text-xs leading-5 text-[var(--shell-muted)]">{card.metaLine}</p>
            </Link>
            );
          })}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--shell-ink)]">{messages.insights.vendorAlignment.eliteTitle}</h2>
          <p className="mt-1 text-sm text-[var(--shell-muted)]">
            {messages.insights.vendorAlignment.eliteBody}
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {eliteReports.map((report) => {
            const card = getVendorAlignmentOverviewCard(report);
            return (
              <Link
                key={report.key}
                href={card.href}
                title={card.lockedTitle ?? undefined}
                className="block rounded-[24px] border border-[rgba(79,191,226,0.28)] bg-[rgba(79,191,226,0.13)] p-6 transition-colors duration-150 hover:border-[rgba(79,191,226,0.45)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="text-lg font-semibold text-[var(--shell-ink)]">{card.title}</div>
                  <span className="rounded-full bg-[rgba(6,54,116,0.1)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--shell-accent)]">
                    Locked
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
                  {card.summary}
                </p>
                <p className="mt-4 text-xs leading-5 text-[var(--shell-muted)]">{card.metaLine}</p>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
