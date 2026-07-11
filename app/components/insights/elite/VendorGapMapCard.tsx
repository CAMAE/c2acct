import HeatmapGrid from "@/app/components/charts/HeatmapGrid";
import { EliteEmptyState } from "@/app/components/insights/elite/EliteCardShell";
import type { VendorGapMap } from "@/lib/eliteInsightsV2";

export default function VendorGapMapCard({ data }: { data: VendorGapMap }) {
  if (!data.available) {
    return <EliteEmptyState message={data.emptyReason ?? "Gap map not available yet."} />;
  }
  return (
    <section className="pat-card p-6">
      <div className="pat-label">Where firms confirm — or dispute — your story</div>
      <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
        Per product-fit dimension: the number is how firm reviews land relative to your self-report. Green means firms
        confirm your story; orange means firms read you lower than you rate yourself — that is where the story needs work.
        Only dimensions with enough firm reviews are scored.
      </p>
      <div className="mt-4">
        <HeatmapGrid columns={data.columns} rows={data.rows} title="Per-dimension alignment gap map" />
      </div>
    </section>
  );
}
