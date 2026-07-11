/**
 * Distribution curve (Elite Insights v2, V1 Category Position). A smoothed normal
 * density from the cohort mean + stdev with YOUR marker positioned on it, and the
 * interquartile region shaded. The curve is a model of the peer distribution
 * (directional), not a claim about any single competitor.
 */

const W = 340;
const H = 150;
const PAD = 14;

export default function DistributionCurve({
  mean,
  stdev,
  p25,
  p75,
  marker,
  title,
}: {
  mean: number;
  stdev: number;
  p25?: number | null;
  p75?: number | null;
  marker: number | null;
  title: string;
}) {
  const sigma = Math.max(6, stdev); // floor so a tight cohort still renders a curve
  const innerW = W - PAD * 2;
  const innerH = H - PAD * 2 - 10;
  const xTo = (score: number) => PAD + (Math.max(0, Math.min(100, score)) / 100) * innerW;
  const density = (x: number) => Math.exp(-((x - mean) ** 2) / (2 * sigma * sigma));
  const peak = 1; // density(mean)
  const yTo = (d: number) => PAD + innerH * (1 - d / peak);

  const samples: string[] = [];
  for (let s = 0; s <= 100; s += 2) {
    samples.push(`${xTo(s).toFixed(1)},${yTo(density(s)).toFixed(1)}`);
  }
  const linePath = `M${samples.join(" L")}`;
  const areaPath = `M${xTo(0).toFixed(1)},${(PAD + innerH).toFixed(1)} L${samples.join(" L")} L${xTo(100).toFixed(1)},${(PAD + innerH).toFixed(1)} Z`;

  const markerX = typeof marker === "number" ? xTo(marker) : null;
  const markerY = typeof marker === "number" ? yTo(density(marker)) : null;

  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={title}>
        <title>{title}</title>
        {/* interquartile shaded region */}
        {typeof p25 === "number" && typeof p75 === "number" ? (
          <rect
            x={xTo(p25)}
            y={PAD}
            width={Math.max(0, xTo(p75) - xTo(p25))}
            height={innerH}
            fill="rgba(6,54,116,0.06)"
          />
        ) : null}
        <path d={areaPath} fill="rgba(6,54,116,0.10)" />
        <path d={linePath} fill="none" stroke="var(--brand-c2-blue)" strokeWidth={2} />
        {/* baseline + score ticks */}
        <line x1={PAD} x2={W - PAD} y1={PAD + innerH} y2={PAD + innerH} stroke="rgba(12,33,66,0.12)" strokeWidth={1} />
        {[0, 25, 50, 75, 100].map((g) => (
          <text key={g} x={xTo(g)} y={H - 4} textAnchor="middle" fontSize={8} fill="var(--shell-muted)">
            {g}
          </text>
        ))}
        {/* your marker */}
        {markerX !== null && markerY !== null ? (
          <>
            <line x1={markerX} y1={markerY} x2={markerX} y2={PAD + innerH} stroke="var(--brand-orange)" strokeWidth={2} />
            <circle cx={markerX} cy={markerY} r={4} fill="var(--brand-orange)" stroke="white" strokeWidth={1.5} />
            <text x={markerX} y={markerY - 7} textAnchor="middle" fontSize={9} fontWeight={600} fill="var(--brand-orange)">
              you {Math.round(marker as number)}
            </text>
          </>
        ) : null}
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-3 text-[0.7rem] text-[var(--shell-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-4 bg-[rgba(6,54,116,0.10)]" /> peer distribution
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-px bg-[var(--brand-orange)]" /> your position
        </span>
      </figcaption>
    </figure>
  );
}
