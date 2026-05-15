type AlignmentDeltaChartProps = {
  firmAvg: number | null;
  vendorSelfReport: number | null;
};

function clampPct(value: number | null): number {
  if (value === null || Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

function formatScoreLabel(value: number | null): string {
  return value === null ? "—" : String(value);
}

export default function AlignmentDeltaChart({
  firmAvg,
  vendorSelfReport,
}: AlignmentDeltaChartProps) {
  const bothPresent = firmAvg !== null && vendorSelfReport !== null;
  const delta = bothPresent ? firmAvg - vendorSelfReport : null;
  const firmPct = clampPct(firmAvg);
  const vendorPct = clampPct(vendorSelfReport);

  let deltaLabel = "Awaiting firm review";
  let deltaColorClass = "text-[var(--shell-muted)]";
  if (delta !== null) {
    if (delta === 0) {
      deltaLabel = "0 · matched";
      deltaColorClass = "text-[var(--shell-muted)]";
    } else if (delta > 0) {
      deltaLabel = `+${delta} firm-higher`;
      deltaColorClass = "text-[var(--brand-c2-blue)]";
    } else {
      deltaLabel = `${delta} vendor-higher`;
      deltaColorClass = "text-[var(--brand-orange)]";
    }
  }

  return (
    <div
      data-testid="alignment-delta-chart"
      data-firm-avg={firmAvg ?? "null"}
      data-vendor-self-report={vendorSelfReport ?? "null"}
      className="rounded-2xl border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-5"
    >
      <div className="flex items-baseline justify-between">
        <div className="pat-label text-[11px]">Alignment delta</div>
        <div
          className={`text-sm font-semibold tabular-nums ${deltaColorClass}`}
          data-testid="alignment-delta-indicator"
        >
          {deltaLabel}
        </div>
      </div>

      <div className="mt-4 space-y-3">
        <div data-testid="alignment-delta-bar-firm">
          <div className="flex items-baseline justify-between text-xs text-[var(--shell-muted)]">
            <span>Firm average</span>
            <span className="font-semibold tabular-nums text-[var(--shell-ink)]">
              {formatScoreLabel(firmAvg)}
              {firmAvg !== null ? "%" : ""}
            </span>
          </div>
          <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-[var(--brand-c2-blue)]"
              style={{ width: `${firmPct}%` }}
              aria-hidden="true"
            />
          </div>
        </div>

        <div data-testid="alignment-delta-bar-vendor">
          <div className="flex items-baseline justify-between text-xs text-[var(--shell-muted)]">
            <span>Vendor self-report</span>
            <span className="font-semibold tabular-nums text-[var(--shell-ink)]">
              {formatScoreLabel(vendorSelfReport)}
              {vendorSelfReport !== null ? "%" : ""}
            </span>
          </div>
          <div className="mt-1 h-3 w-full overflow-hidden rounded-full bg-white">
            <div
              className="h-full rounded-full bg-[var(--shell-muted)]"
              style={{ width: `${vendorPct}%` }}
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
