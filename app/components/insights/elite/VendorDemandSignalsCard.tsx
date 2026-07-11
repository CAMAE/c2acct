import SwapFlowTiles from "@/app/components/charts/SwapFlowTiles";
import { EliteEmptyState } from "@/app/components/insights/elite/EliteCardShell";
import type { VendorDemandSignals } from "@/lib/eliteInsightsV2";

export default function VendorDemandSignalsCard({ data }: { data: VendorDemandSignals }) {
  if (!data.available) {
    return <EliteEmptyState message={data.emptyReason ?? "Demand signals not available yet."} />;
  }
  return (
    <section className="pat-card p-6">
      <div className="pat-label">Sandbox demand · {data.windowLabel}</div>
      <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
        First-party intent: how firms moved your products in and out of their simulated stacks. Swapped IN is pipeline;
        swapped OUT is churn risk.
      </p>
      <div className="mt-4">
        <SwapFlowTiles
          swappedIn={data.swappedIn}
          swappedOut={data.swappedOut}
          windowLabel={data.windowLabel}
          earlySignal={data.earlySignal}
        />
      </div>
    </section>
  );
}
