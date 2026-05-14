import { AdminMetricCard } from "@/app/components/admin/AdminShell";
import type { EcosystemDetailData } from "@/lib/ecosystem";

function formatScore(value: number | null): string {
  return value === null ? "—" : `${value}%`;
}

function formatPercent(value: number | null): string {
  return value === null ? "—" : `${value}%`;
}

export default function HeadlineMetricsRow({ data }: { data: EcosystemDetailData }) {
  return (
    <section
      className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5"
      data-testid="ecosystem-detail-headline-metrics"
      style={{ gap: "var(--shell-grid-gap, 12px)" }}
    >
      <AdminMetricCard
        label="Average alignment score"
        value={formatScore(data.avgFirmAlignmentScore)}
        detail={`across ${data.firmCount} firm${data.firmCount === 1 ? "" : "s"}`}
      />
      <AdminMetricCard
        label="Coverage"
        value={`${data.vendorProductCoverage.productCount} products`}
        detail={`evaluated by ${data.vendorProductCoverage.firmReviewCount} firm${data.vendorProductCoverage.firmReviewCount === 1 ? "" : "s"}`}
      />
      <AdminMetricCard
        label="Modules"
        value={formatPercent(data.moduleCompletionRate)}
        detail="complete"
      />
      <AdminMetricCard
        label="Hot divergences"
        value={String(data.activeDivergenceCount)}
        detail="capabilities where vendor and firm scores differ by more than 10 points"
      />
      <AdminMetricCard
        label="30-day priority actions"
        value={String(data.thirtyDayActionCount)}
        detail="across this ecosystem"
      />
    </section>
  );
}
