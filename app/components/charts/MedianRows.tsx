import type { PercentileRow } from "@/app/components/charts/PercentileBand";

/**
 * scoring-core (R63, ruling 13): the "median" display tier (5 to 9 firms in the
 * cohort). Per module: your score beside the peer median, nothing more. The
 * quartile pack, the top-decile line and the percentile open at 10 and 30.
 */
export default function MedianRows({ rows, title }: { rows: PercentileRow[]; title: string }) {
  return (
    <div className="space-y-2" role="group" aria-label={title}>
      {rows.map((row) => (
        <div key={row.key} className="flex flex-wrap items-baseline justify-between gap-2 rounded-[14px] border border-[var(--shell-border)] px-4 py-2.5 text-sm">
          <span className="font-medium text-[var(--shell-ink)]">{row.label}</span>
          {row.suppressed ? (
            <span className="text-xs text-[var(--shell-muted)]">Insufficient peer data</span>
          ) : (
            <span className="tabular-nums text-[var(--shell-muted)]">
              you {typeof row.score === "number" ? Math.round(row.score) : "n/a"} · peer median{" "}
              {typeof row.p50 === "number" ? Math.round(row.p50) : "n/a"}
            </span>
          )}
        </div>
      ))}
      <div className="text-[0.7rem] text-[var(--shell-muted)]">The quartiles open at 10 firms in the cohort; the percentile at 30.</div>
    </div>
  );
}
