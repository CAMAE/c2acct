import { getScoreBand } from "@/lib/scoreBands";

/**
 * Percentile band (Elite Insights v2, F1 Peer Position). Per row: a 0–100 track
 * with the shaded p25–p75 interquartile band, a p90 "top decile" tick, and YOUR
 * marker positioned at your score. Suppressed rows (insufficient peer data) show
 * the state instead of a fabricated band. The #1 premium-analytics gate.
 */

export type PercentileRow = {
  key: string;
  label: string;
  p25: number | null;
  p50: number | null;
  p75: number | null;
  p90: number | null;
  /** Your score for this metric. */
  score: number | null;
  /** Your percentile rank 0–100. */
  percentile: number | null;
  /** True when the peer cut is below the minimum-n safe harbor. */
  suppressed?: boolean;
};

function pct(n: number | null): number {
  return Math.max(0, Math.min(100, n ?? 0));
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

export default function PercentileBand({ rows, title }: { rows: PercentileRow[]; title: string }) {
  return (
    <div className="space-y-3" role="group" aria-label={title}>
      {rows.map((row) => {
        const band = typeof row.score === "number" ? getScoreBand(row.score) : null;
        return (
          <div key={row.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <div>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-sm font-medium text-[var(--shell-ink)]">{row.label}</span>
                <span className="text-xs tabular-nums text-[var(--shell-muted)]">
                  {typeof row.score === "number" ? `you ${Math.round(row.score)}` : "—"}
                </span>
              </div>
              {row.suppressed ? (
                <div className="mt-1.5 rounded-full border border-dashed border-[var(--shell-border)] px-3 py-1 text-xs text-[var(--shell-muted)]">
                  Insufficient peer data — benchmark withheld
                </div>
              ) : (
                <div className="relative mt-1.5 h-3 w-full rounded-full bg-[rgba(6,54,116,0.06)]">
                  {/* p25–p75 interquartile band */}
                  <div
                    className="absolute top-0 h-3 rounded-full bg-[rgba(6,54,116,0.18)]"
                    style={{ left: `${pct(row.p25)}%`, width: `${Math.max(0, pct(row.p75) - pct(row.p25))}%` }}
                    aria-hidden="true"
                  />
                  {/* p90 top-decile tick */}
                  {typeof row.p90 === "number" ? (
                    <div
                      className="absolute top-[-2px] h-[16px] w-px bg-[var(--radar-green)]"
                      style={{ left: `${pct(row.p90)}%` }}
                      aria-hidden="true"
                      title="Top-decile (p90)"
                    />
                  ) : null}
                  {/* your marker */}
                  {typeof row.score === "number" ? (
                    <div
                      className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow"
                      style={{
                        left: `${pct(row.score)}%`,
                        backgroundColor: band ? `var(${band.colorVar})` : "var(--brand-c2-blue)",
                      }}
                      aria-hidden="true"
                    />
                  ) : null}
                </div>
              )}
            </div>
            <div className="text-right">
              {row.suppressed || typeof row.percentile !== "number" ? (
                <span className="text-xs text-[var(--shell-muted)]">—</span>
              ) : (
                <span className="rounded-full bg-[rgba(6,54,116,0.06)] px-2.5 py-1 text-xs font-semibold tabular-nums text-[var(--shell-ink)]">
                  {ordinal(row.percentile)} pct
                </span>
              )}
            </div>
          </div>
        );
      })}
      <div className="flex flex-wrap items-center gap-3 pt-1 text-[0.7rem] text-[var(--shell-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-full bg-[rgba(6,54,116,0.18)]" /> peer middle 50% (p25–p75)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-px bg-[var(--radar-green)]" /> top-decile line (p90)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border-2 border-white bg-[var(--brand-c2-blue)] shadow" /> you
        </span>
      </div>
    </div>
  );
}
