import SwapFlowTiles from "@/app/components/charts/SwapFlowTiles";
import { EliteEmptyState } from "@/app/components/insights/elite/EliteCardShell";
import EvidenceMethodPanel from "@/app/components/insights/elite/EvidenceMethodPanel";
import type { DemandCategoryRow, DemandTrend, VendorDemandSignals } from "@/lib/eliteInsightsV2";

/**
 * V2 · Demand Signals card. Swapped-IN (pipeline) and swapped-OUT (churn risk)
 * grouped by canonical product category. Per Cam's 2026-07-12 classification the
 * counts are Pro-tier (always shown); the trend arrow, top product, and ranked
 * action are Elite-only and arrive as null on the Pro projection — so a Pro
 * vendor sees the signal (counts) and an explicit upsell naming what Elite adds.
 */

const TREND_GLYPH: Record<DemandTrend, string> = { up: "↑", down: "↓", flat: "→" };
const TREND_CLASS: Record<DemandTrend, string> = {
  up: "text-[var(--shell-positive)]",
  down: "text-[var(--brand-orange)]",
  flat: "text-[var(--shell-muted)]",
};

function DemandRow({ row, side }: { row: DemandCategoryRow; side: "in" | "out" }) {
  const countClass = row.count === 0 ? "text-[var(--shell-muted)]" : "text-[var(--shell-ink)]";
  return (
    <li className="flex items-center justify-between gap-3 border-b border-[var(--shell-border)] py-2 last:border-b-0">
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-[var(--shell-ink)]">{row.category}</div>
        {row.topProduct ? (
          <div className="truncate text-xs text-[var(--shell-muted)]">
            top: {row.topProduct}
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-2 tabular-nums">
        {row.trend ? (
          <span className={`text-sm font-semibold ${TREND_CLASS[row.trend]}`} aria-label={`trend ${row.trend}`}>
            {TREND_GLYPH[row.trend]}
          </span>
        ) : null}
        <span className={`text-lg font-semibold ${countClass}`}>{row.count}</span>
        <span className="text-[0.7rem] text-[var(--shell-muted)]">{side === "in" ? "in" : "out"}</span>
      </div>
    </li>
  );
}

function DemandSection({
  title,
  sublabel,
  rows,
  side,
}: {
  title: string;
  sublabel: string;
  rows: DemandCategoryRow[];
  side: "in" | "out";
}) {
  return (
    <div className="rounded-[14px] border border-[var(--shell-border)] bg-white/70 p-4">
      <div className="pat-label">{title}</div>
      <p className="mt-0.5 text-xs text-[var(--shell-muted)]">{sublabel}</p>
      {rows.length ? (
        <ul className="mt-3">
          {rows.map((row) => (
            <DemandRow key={row.key} row={row} side={side} />
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-[var(--shell-muted)]">
          No {side === "in" ? "swap-ins" : "swap-outs"} by category in this window.
        </p>
      )}
    </div>
  );
}

export default function VendorDemandSignalsCard({ data }: { data: VendorDemandSignals }) {
  if (!data.available) {
    return <EliteEmptyState message={data.emptyReason ?? "Demand signals not available yet."} />;
  }
  return (
    <section className="pat-card p-6">
      <div className="pat-label">Sandbox demand · by category · {data.windowLabel}</div>
      <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
        First-party intent: how firms moved your products in and out of their simulated stacks, grouped by product
        category. Swapped IN is pipeline; swapped OUT is churn risk.
      </p>
      <div className="mt-4">
        <SwapFlowTiles
          swappedIn={data.totalIn}
          swappedOut={data.totalOut}
          windowLabel={data.windowLabel}
          earlySignal={data.earlySignal}
        />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <DemandSection title="Swapped in" sublabel="pipeline · by category" rows={data.swappedIn} side="in" />
        <DemandSection title="Swapped out" sublabel="churn risk · by category" rows={data.swappedOut} side="out" />
      </div>

      {data.identityAllowed ? (
        data.rankedAction ? (
          <div className="mt-4 rounded-[14px] border border-[var(--shell-border)] bg-white/70 px-4 py-3">
            <div className="pat-label">Your next move</div>
            <p className="mt-1 text-sm leading-6 text-[var(--shell-ink)]">{data.rankedAction}</p>
          </div>
        ) : null
      ) : (
        <div className="mt-4 rounded-[14px] border border-dashed border-[var(--shell-border)] bg-white/50 px-4 py-3">
          <p className="text-sm leading-6 text-[var(--shell-ink)]">
            You are seeing the counts — the signal. Elite adds <span className="font-semibold">who is moving,
            which products</span>, and <span className="font-semibold">what to do about it</span>: per-category
            trend direction, your most-swapped product in each area, and a ranked next move.
          </p>
        </div>
      )}

      <EvidenceMethodPanel
        rows={[
          { label: "Window", value: data.windowLabel },
          { label: "Volume", value: `${data.totalIn} swapped in · ${data.totalOut} swapped out` },
          { label: "Source", value: "First-party Alignment Sandbox swap events, by product category" },
        ]}
        note="Counts are every firm swap of your products in or out of a simulated stack during the window — raw first-party intent, not a survey. Identity of the moving firms and per-category trend detail are Elite-gated and shown only when the safe harbor allows."
      />
    </section>
  );
}
