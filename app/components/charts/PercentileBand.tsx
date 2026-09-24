import { ordinal } from "@/lib/ordinal";
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

export type PercentileBandDesign = "classic" | "labelled";

const W = 340;
const H = 66;
const PAD = 14;
const TRACK_Y = 24;
const TRACK_H = 16;

/**
 * R40 (box 2d, 2026-09-25): the labelled design — one SVG per row: bottom quartile,
 * the pack (p25–p75, labelled), the top quartile (≥ p75, labelled), the median tick
 * with its value, the top-decile line, your marker with its value, a 0–100 axis on
 * the last row and one legend for the group. Flag-on callers ask for it; "classic"
 * is production's row unchanged.
 */
function LabelledRow({ row, showAxis }: { row: PercentileRow; showAxis: boolean }) {
  const innerW = W - PAD * 2;
  const xTo = (score: number) => PAD + (Math.max(0, Math.min(100, score)) / 100) * innerW;
  const hasPack = typeof row.p25 === "number" && typeof row.p75 === "number";
  const p25x = hasPack ? xTo(row.p25 as number) : null;
  const p75x = hasPack ? xTo(row.p75 as number) : null;
  const medianX = typeof row.p50 === "number" ? xTo(row.p50) : null;
  const p90x = typeof row.p90 === "number" ? xTo(row.p90) : null;
  const markerX = typeof row.score === "number" ? xTo(row.score) : null;
  const markerColor = typeof row.score === "number" ? `var(${getScoreBand(row.score).colorVar})` : "var(--brand-c2-blue)";
  const clampLabel = (x: number) => Math.max(PAD + 16, Math.min(W - PAD - 16, x));
  const height = showAxis ? H : H - 12;
  return (
    <svg viewBox={`0 0 ${W} ${height}`} className="w-full" role="img" aria-label={`${row.label}: ${typeof row.score === "number" ? `you ${Math.round(row.score)}` : "no score"}${typeof row.p50 === "number" ? `, peer median ${Math.round(row.p50)}` : ""}`}>
      <rect x={PAD} y={TRACK_Y} width={innerW} height={TRACK_H} rx={4} fill="rgba(12,33,66,0.06)" />
      {hasPack ? (
        <>
          <rect x={p25x as number} y={TRACK_Y} width={Math.max(0, (p75x as number) - (p25x as number))} height={TRACK_H} fill="rgba(6,54,116,0.18)" />
          <rect x={p75x as number} y={TRACK_Y} width={Math.max(0, W - PAD - (p75x as number))} height={TRACK_H} rx={4} fill="rgba(34,163,101,0.16)" />
          <line x1={p75x as number} x2={p75x as number} y1={TRACK_Y - 3} y2={TRACK_Y + TRACK_H + 3} stroke="var(--shell-positive)" strokeWidth={1.5} strokeDasharray="3 2" />
          {(p75x as number) - (p25x as number) >= 44 && (markerX === null || Math.abs(markerX - ((p25x as number) + (p75x as number)) / 2) > 16) ? (
            <text x={((p25x as number) + (p75x as number)) / 2} y={TRACK_Y + TRACK_H / 2 + 2.5} textAnchor="middle" fontSize={6.5} fontWeight={600} fill="rgba(12,33,66,0.62)">
              pack
            </text>
          ) : null}
          {W - PAD - (p75x as number) >= 64 ? (
            <text x={(p75x as number) + 6} y={TRACK_Y + TRACK_H / 2 + 2.5} textAnchor="start" fontSize={6.5} fontWeight={600} fill="var(--shell-positive)">
              top quartile
            </text>
          ) : null}
        </>
      ) : null}
      {medianX !== null ? (
        <>
          <line x1={medianX} x2={medianX} y1={TRACK_Y - 2} y2={TRACK_Y + TRACK_H + 2} stroke="rgba(12,33,66,0.55)" strokeWidth={1.5} />
          <text x={clampLabel(medianX)} y={TRACK_Y + TRACK_H + 10} textAnchor="middle" fontSize={6.5} fill="var(--shell-muted)">
            median {Math.round(row.p50 as number)}
          </text>
        </>
      ) : null}
      {p90x !== null ? (
        <line x1={p90x} x2={p90x} y1={TRACK_Y - 3} y2={TRACK_Y + TRACK_H + 3} stroke="var(--radar-green)" strokeWidth={1} />
      ) : null}
      {markerX !== null ? (
        <>
          <line x1={markerX} x2={markerX} y1={TRACK_Y - 6} y2={TRACK_Y + TRACK_H + 6} stroke={markerColor} strokeWidth={2} />
          <circle cx={markerX} cy={TRACK_Y + TRACK_H / 2} r={5} fill="var(--brand-c2-blue)" stroke="white" strokeWidth={2} />
          <text x={clampLabel(markerX)} y={TRACK_Y - 9} textAnchor="middle" fontSize={7} fontWeight={600} fill="var(--shell-ink)">
            you {Math.round(row.score as number)}
            {typeof row.percentile === "number" ? ` · ${ordinal(row.percentile)} pct` : ""}
          </text>
        </>
      ) : null}
      {showAxis
        ? [0, 25, 50, 75, 100].map((g) => (
            <text key={g} x={xTo(g)} y={height - 3} textAnchor="middle" fontSize={6.5} fill="var(--shell-muted)">
              {g}
            </text>
          ))
        : null}
    </svg>
  );
}

function LabelledBand({ rows, title }: { rows: PercentileRow[]; title: string }) {
  const lastIndex = rows.length - 1;
  return (
    <div className="space-y-3" role="group" aria-label={title}>
      {rows.map((row, index) => (
        <div key={row.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div>
            <div className="text-sm font-medium text-[var(--shell-ink)]">{row.label}</div>
            {row.suppressed ? (
              <div className="mt-1.5 rounded-full border border-dashed border-[var(--shell-border)] px-3 py-1 text-xs text-[var(--shell-muted)]">
                Insufficient peer data — benchmark withheld
              </div>
            ) : (
              <LabelledRow row={row} showAxis={index === lastIndex} />
            )}
          </div>
          <div className="pt-0.5 text-right">
            {row.suppressed || typeof row.percentile !== "number" ? (
              <span className="text-xs text-[var(--shell-muted)]">—</span>
            ) : (
              <span className="rounded-full bg-[rgba(6,54,116,0.06)] px-2.5 py-1 text-xs font-semibold tabular-nums text-[var(--shell-ink)]">
                {ordinal(row.percentile)} pct
              </span>
            )}
          </div>
        </div>
      ))}
      <div className="text-[0.7rem] text-[var(--shell-muted)]">Scale: score 0–100, left to right.</div>
      <div className="flex flex-wrap items-center gap-3 text-[0.7rem] text-[var(--shell-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm bg-[rgba(6,54,116,0.18)]" /> the pack (p25–p75)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm bg-[rgba(34,163,101,0.16)]" /> top quartile (≥ p75)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-px bg-[rgba(12,33,66,0.55)]" /> peer median
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-3 w-px bg-[var(--radar-green)]" /> top decile (p90)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border-2 border-white bg-[var(--brand-c2-blue)] shadow" /> you
        </span>
      </div>
    </div>
  );
}

export default function PercentileBand({
  rows,
  title,
  design = "classic",
}: {
  rows: PercentileRow[];
  title: string;
  design?: PercentileBandDesign;
}) {
  if (design === "labelled") return <LabelledBand rows={rows} title={title} />;
  return (
    <div className="space-y-3" role="group" aria-label={title}>
      {rows.map((row) => {
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
                      className="absolute top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-[var(--brand-c2-blue)] shadow"
                      style={{ left: `${pct(row.score)}%` }}
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
