import Link from "next/link";
import { AdminMetricCard } from "@/app/components/admin/AdminShell";
import type { EcosystemDetailData } from "@/lib/ecosystem";
import type { MetricKey } from "../explainers/_content/explainerContent";

function formatScore(value: number | null): string {
  return value === null ? "—" : `${value}%`;
}

function formatPercent(value: number | null): string {
  return value === null ? "—" : `${value}%`;
}

function MetricTileLink({
  ecosystemId,
  metricKey,
  label,
  children,
}: {
  ecosystemId: string;
  metricKey: MetricKey;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={`/consultants/ecosystems/${ecosystemId}/explainers/${metricKey}`}
      className="block rounded-[22px] outline-none transition-colors hover:bg-[rgba(6,54,116,0.04)] focus-visible:ring-2 focus-visible:ring-[rgba(6,54,116,0.3)]"
      data-testid="headline-metric-link"
      data-metric-key={metricKey}
      aria-label={`Open ${label} explainer`}
    >
      {children}
    </Link>
  );
}

export default function HeadlineMetricsRow({
  data,
  ecosystemId,
}: {
  data: EcosystemDetailData;
  ecosystemId: string;
}) {
  return (
    <section
      className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5"
      data-testid="ecosystem-detail-headline-metrics"
      style={{ gap: "var(--shell-grid-gap, 12px)" }}
    >
      <MetricTileLink
        ecosystemId={ecosystemId}
        metricKey="avg-alignment"
        label="Average alignment score"
      >
        <AdminMetricCard
          label="Average alignment score"
          value={formatScore(data.avgFirmAlignmentScore)}
          detail={`across ${data.firmCount} firm${data.firmCount === 1 ? "" : "s"}`}
        />
      </MetricTileLink>
      <MetricTileLink
        ecosystemId={ecosystemId}
        metricKey="coverage"
        label="Coverage"
      >
        <AdminMetricCard
          label="Coverage"
          value={`${data.vendorProductCoverage.productCount} products`}
          detail={`evaluated by ${data.vendorProductCoverage.firmReviewCount} firm${data.vendorProductCoverage.firmReviewCount === 1 ? "" : "s"}`}
        />
      </MetricTileLink>
      <MetricTileLink
        ecosystemId={ecosystemId}
        metricKey="module-completion"
        label="Modules"
      >
        <AdminMetricCard
          label="Modules"
          value={formatPercent(data.moduleCompletionRate)}
          detail="complete"
        />
      </MetricTileLink>
      <MetricTileLink
        ecosystemId={ecosystemId}
        metricKey="hot-divergences"
        label="Hot divergences"
      >
        <AdminMetricCard
          label="Hot divergences"
          value={String(data.activeDivergenceCount)}
          detail="capabilities where vendor and firm scores differ by more than 10 points"
        />
      </MetricTileLink>
      <MetricTileLink
        ecosystemId={ecosystemId}
        metricKey="priority-actions"
        label="30-day priority actions"
      >
        <AdminMetricCard
          label="30-day priority actions"
          value={String(data.thirtyDayActionCount)}
          detail="across this ecosystem"
        />
      </MetricTileLink>
    </section>
  );
}
