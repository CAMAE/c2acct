import Link from "next/link";
import { getVendorAlignmentInsightContent } from "@/lib/insightContent";
import { getRequestLocaleMessages } from "@/lib/requestLocale";
import { VENDOR_PRODUCT_TIER2_HOVER } from "@/lib/vendorPat";
import { getVendorAlignmentInsightBundle } from "@/lib/vendorAlignmentInsightEngine";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Vendor Alignment Insights | C2Acct",
  description: "Vendor alignment insights connected to firm alignment signal.",
};

function formatFreshness(value: Date | null) {
  return value ? value.toLocaleDateString() : "No live update yet";
}

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
            <div className="mt-1 text-xs leading-5">{formatFreshness(bundle.latestUpdatedAt)}</div>
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
          {proReports.map((report) => (
            <Link
              key={report.key}
              href={`/vendor/alignment-insights/${report.key}`}
              className="pat-card pat-card-interactive block p-6"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="text-lg font-semibold text-[var(--shell-ink)]">{report.title}</div>
                <span className="rounded-full bg-[var(--shell-accent)]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--shell-accent)]">
                  {report.confidenceLabel}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
                {report.currentStateSummary}
              </p>
              <div className="mt-4 space-y-2 text-xs leading-5 text-[var(--shell-muted)]">
                <p>{messages.insights.vendorAlignment.signalStatus}: {report.confidenceSummary}</p>
                <p>{messages.insights.vendorAlignment.assessmentBasis}: {report.exactAssessmentBasis}</p>
                <p>
                  {messages.insights.shared.freshness}: {formatFreshness(report.latestUpdatedAt)}. {report.confidenceCaveats[0]}
                </p>
              </div>
            </Link>
          ))}
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
            const content = getVendorAlignmentInsightContent(report.key);
            return (
              <Link
                key={report.key}
                href={`/vendor/alignment-insights/${report.key}`}
                title={content?.lockedState?.disclaimer ?? VENDOR_PRODUCT_TIER2_HOVER}
                className="block rounded-[24px] border border-[rgba(79,191,226,0.28)] bg-[rgba(79,191,226,0.13)] p-6 transition-colors duration-150 hover:border-[rgba(79,191,226,0.45)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="text-lg font-semibold text-[var(--shell-ink)]">{report.title}</div>
                  <span className="rounded-full bg-[rgba(6,54,116,0.1)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--shell-accent)]">
                    Locked
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
                  {content?.lockedState?.summary ?? report.currentStateSummary}
                </p>
                <p className="mt-4 text-xs leading-5 text-[var(--shell-muted)]">
                  {content?.lockedState?.basis ?? report.exactAssessmentBasis}
                </p>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
