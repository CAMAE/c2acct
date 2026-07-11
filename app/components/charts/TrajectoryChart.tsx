/**
 * Trajectory chart (Elite Insights v2, F3). A real time-series line from snapshot
 * history, with an optional dashed directional-projection segment and a shaded
 * uncertainty band. Every projection is clearly directional — the band is the
 * honest "we don't know exactly" region, never a promise.
 */

export type TrajectoryPoint = { label: string; score: number };
export type TrajectoryProjection = { score: number; low: number; high: number; label: string };

const W = 340;
const H = 170;
const PAD_L = 26;
const PAD_R = 12;
const PAD_T = 12;
const PAD_B = 24;

function yFor(score: number): number {
  const inner = H - PAD_T - PAD_B;
  return PAD_T + inner * (1 - Math.max(0, Math.min(100, score)) / 100);
}

export default function TrajectoryChart({
  history,
  projection = null,
  title,
}: {
  history: TrajectoryPoint[];
  projection?: TrajectoryProjection | null;
  title: string;
}) {
  const totalPoints = history.length + (projection ? 1 : 0);
  if (history.length === 0) {
    return (
      <div className="rounded-[16px] border border-dashed border-[var(--shell-border)] p-6 text-sm text-[var(--shell-muted)]">
        Not enough snapshot history yet to chart a trajectory.
      </div>
    );
  }
  const innerW = W - PAD_L - PAD_R;
  const step = totalPoints > 1 ? innerW / (totalPoints - 1) : 0;
  const xAt = (i: number) => PAD_L + step * i;

  const historyPts = history.map((p, i) => ({ ...p, x: xAt(i), y: yFor(p.score) }));
  const linePath = historyPts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const last = historyPts[historyPts.length - 1];
  const projX = projection ? xAt(history.length) : null;

  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={title}>
        <title>{title}</title>
        {/* y gridlines */}
        {[0, 25, 50, 75, 100].map((g) => (
          <g key={g}>
            <line x1={PAD_L} x2={W - PAD_R} y1={yFor(g)} y2={yFor(g)} stroke="rgba(12,33,66,0.08)" strokeWidth={1} />
            <text x={PAD_L - 5} y={yFor(g) + 3} textAnchor="end" fontSize={8} fill="var(--shell-muted)">
              {g}
            </text>
          </g>
        ))}
        {/* projection band + dashed segment */}
        {projection && projX !== null ? (
          <>
            <polygon
              points={`${last.x},${last.y} ${projX},${yFor(projection.high)} ${projX},${yFor(projection.low)}`}
              fill="rgba(242,130,12,0.16)"
            />
            <line
              x1={last.x}
              y1={last.y}
              x2={projX}
              y2={yFor(projection.score)}
              stroke="var(--brand-orange)"
              strokeWidth={2}
              strokeDasharray="4 3"
            />
            <circle cx={projX} cy={yFor(projection.score)} r={3.5} fill="var(--brand-orange)" />
            <text x={projX} y={yFor(projection.score) - 7} textAnchor="middle" fontSize={8} fill="var(--brand-orange)">
              {Math.round(projection.score)}
            </text>
          </>
        ) : null}
        {/* history line */}
        <path d={linePath} fill="none" stroke="var(--brand-c2-blue)" strokeWidth={2} strokeLinejoin="round" />
        {historyPts.map((p) => (
          <circle key={p.label} cx={p.x} cy={p.y} r={3} fill="var(--brand-c2-blue)" />
        ))}
        {/* x labels: first + last history + projection */}
        <text x={historyPts[0].x} y={H - 8} textAnchor="start" fontSize={8} fill="var(--shell-muted)">
          {historyPts[0].label}
        </text>
        <text x={last.x} y={H - 8} textAnchor={projection ? "middle" : "end"} fontSize={8} fill="var(--shell-muted)">
          {last.label}
        </text>
        {projection && projX !== null ? (
          <text x={projX} y={H - 8} textAnchor="end" fontSize={8} fill="var(--brand-orange)">
            {projection.label}
          </text>
        ) : null}
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-3 text-[0.7rem] text-[var(--shell-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 bg-[var(--brand-c2-blue)]" /> your alignment index over time
        </span>
        {projection ? (
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-4 bg-[rgba(242,130,12,0.16)]" /> directional projection (not verified)
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}
