import { notFound } from "next/navigation";
import Link from "next/link";
import { PatLogoLockup } from "@/app/components/brand/BrandMarks";
import PortalAudienceEyebrow from "@/app/components/pat/PortalAudienceEyebrow";
import PatAudienceTitle from "@/app/components/pat/PatAudienceTitle";
import { requireConsultantSession } from "@/lib/consultantAccess";
import { getEcosystemDetailForConsultant } from "@/lib/ecosystem";
import {
  EXPLAINER_CONTENT,
  isMetricKey,
} from "../_content/explainerContent";

export const dynamic = "force-dynamic";

export default async function MetricExplainerPage({
  params,
}: {
  params: Promise<{ ecosystemId: string; metricKey: string }>;
}) {
  const { ecosystemId, metricKey } = await params;
  if (!isMetricKey(metricKey)) {
    notFound();
  }

  const access = await requireConsultantSession(
    `/consultants/ecosystems/${ecosystemId}/explainers/${metricKey}`
  );
  if (!access) return null;

  const ecosystem = await getEcosystemDetailForConsultant(
    access.consultantProfileId,
    ecosystemId
  );
  if (!ecosystem) {
    notFound();
  }

  const content = EXPLAINER_CONTENT[metricKey];
  const currentValue = content.valueFrom(ecosystem);

  return (
    <div
      className="space-y-8"
      data-testid="explainer-page"
      data-metric-key={metricKey}
    >
      <section className="pat-card p-8" data-testid="explainer-hero">
        <PatLogoLockup mode="hero" tone="light" />
        <PortalAudienceEyebrow
          className="pat-label mt-6"
          label={`${ecosystem.vendorCompanyName} · Consultant`}
          audienceLabel="Consultant"
        />
        <PatAudienceTitle
          as="h1"
          title={content.title}
          audienceTerms={[content.title]}
          className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]"
        />
        <div className="mt-6 flex items-baseline gap-4">
          <div className="pat-stat-number text-5xl">{currentValue}</div>
          <div className="text-sm text-[var(--shell-muted)]">{content.unitLabel}</div>
        </div>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          {content.headline}
        </p>
        <div className="mt-6">
          <Link
            href={`/consultants/ecosystems/${ecosystemId}`}
            className="inline-flex items-center gap-2 rounded-full border border-[rgba(6,54,116,0.16)] bg-[rgba(6,54,116,0.06)] px-4 py-2.5 text-sm font-semibold text-[var(--shell-ink)] transition-colors hover:bg-[rgba(6,54,116,0.1)]"
            data-testid="explainer-back-link"
          >
            <span aria-hidden="true">←</span> Back to ecosystem
          </Link>
        </div>
      </section>

      <section className="pat-card p-8" data-testid="explainer-body">
        <div className="pat-label">What this measures</div>
        <p className="mt-3 text-base leading-7 text-[var(--shell-ink)]">
          {content.whatItMeasures}
        </p>

        <div className="pat-label mt-8">How it&apos;s computed</div>
        <p className="mt-3 text-base leading-7 text-[var(--shell-ink)]">
          {content.howComputed}
        </p>

        {content.bands ? (
          <>
            <div className="pat-label mt-8">Reading the number</div>
            <ul className="mt-3 grid gap-2 sm:grid-cols-2">
              {content.bands.map((band) => (
                <li
                  key={band.label}
                  className="rounded-md border border-[var(--shell-border)] px-3 py-2 text-sm"
                  data-testid="explainer-band"
                >
                  <span className="pat-stat-number">{band.range}</span>
                  <span className="ml-2 text-[var(--shell-ink)]">{band.label}</span>
                  <div className="mt-1 text-xs text-[var(--shell-muted)]">
                    {band.note}
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {content.whereToDrill ? (
          <>
            <div className="pat-label mt-8">Drill down</div>
            <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
              {content.whereToDrill}
            </p>
          </>
        ) : null}
      </section>

      {content.perFirmDrilldown ? (
        <section className="pat-card p-8" data-testid="explainer-drilldown">
          <div className="pat-label">Per-firm breakdown</div>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--shell-ink)]">
            How each firm contributes
          </h2>
          <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
            Sorted lowest to highest. Click any firm name to drill into its brief.
          </p>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-sm" data-testid="explainer-drilldown-table">
              <colgroup>
                <col className="w-[60%]" />
                <col className="w-[40%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-[var(--shell-border)] text-xs font-semibold text-[var(--shell-muted)]">
                  <th className="py-3">Firm</th>
                  <th className="py-3 text-right">{content.perFirmDrilldown.columnLabel}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--shell-border)]">
                {content.perFirmDrilldown
                  .rowsFrom(ecosystem)
                  .slice()
                  .sort((a, b) => a.sortKey - b.sortKey)
                  .map((row) => (
                    <tr key={row.firmCompanyId} data-testid="explainer-drilldown-row">
                      <td className="py-3">
                        <Link
                          href={`/consultants/ecosystems/${ecosystemId}/firm/${row.firmCompanyId}`}
                          className="inline-flex items-center gap-1 text-[var(--brand-c2-blue)] hover:underline"
                        >
                          {row.firmCompanyName}
                          <span aria-hidden="true" className="text-xs">›</span>
                        </Link>
                      </td>
                      <td className="pat-stat-number py-3 text-right">{row.value}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}
    </div>
  );
}
