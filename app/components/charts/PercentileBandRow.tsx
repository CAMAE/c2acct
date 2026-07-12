/**
 * Percentile band row (Elite Insights v2, V1 Category Position — Block 11b).
 * An F1-standings-style horizontal field bar that replaces the bell curve: the
 * peer field runs left→right on the 0-100 strength scale, split into the bottom
 * quartile, the interquartile pack (p25–p75), and the highlighted top quartile
 * (≥ p75 — the target), with YOUR marker placed at your score. Reads as a
 * position on the grid, not a density model. Directional — a model of the peer
 * field, not a claim about any single competitor. Shares the visual language of
 * PercentileBand (F1 Peer Position): interquartile pack shading + band-coloured
 * "you" marker; adds the top-quartile target zone specific to Category Position.
 */

import { getScoreBand } from "@/lib/scoreBands";

const W = 340;
const H = 58;
const PAD = 14;
const TRACK_Y = 16;
const TRACK_H = 18;

export default function PercentileBandRow({
  p25,
  p75,
  mean,
  marker,
  percentile,
  title,
}: {
  p25?: number | null;
  p75?: number | null;
  mean: number;
  marker: number | null;
  /** Your percentile in the field (0-100), for the marker label. */
  percentile?: number | null;
  title: string;
}) {
  const innerW = W - PAD * 2;
  const xTo = (score: number) => PAD + (Math.max(0, Math.min(100, score)) / 100) * innerW;

  const hasQuartiles = typeof p25 === "number" && typeof p75 === "number";
  const p25x = hasQuartiles ? xTo(p25 as number) : null;
  const p75x = hasQuartiles ? xTo(p75 as number) : null;
  const markerX = typeof marker === "number" ? xTo(marker) : null;
  const meanX = xTo(mean);
  // Band-coloured marker, matching PercentileBand's convention.
  const markerColor = typeof marker === "number" ? `var(${getScoreBand(marker).colorVar})` : "var(--brand-orange)";

  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={title}>
        <title>{title}</title>

        {/* base field track */}
        <rect x={PAD} y={TRACK_Y} width={innerW} height={TRACK_H} rx={4} fill="rgba(12,33,66,0.06)" />

        {hasQuartiles ? (
          <>
            {/* interquartile pack (middle 50% of the field) */}
            <rect
              x={p25x as number}
              y={TRACK_Y}
              width={Math.max(0, (p75x as number) - (p25x as number))}
              height={TRACK_H}
              fill="rgba(6,54,116,0.18)"
            />
            {/* top-quartile zone (≥ p75) — the target */}
            <rect
              x={p75x as number}
              y={TRACK_Y}
              width={Math.max(0, W - PAD - (p75x as number))}
              height={TRACK_H}
              rx={4}
              fill="rgba(34,163,101,0.16)"
            />
            {/* p75 divider — the top-quartile bar */}
            <line
              x1={p75x as number}
              x2={p75x as number}
              y1={TRACK_Y - 3}
              y2={TRACK_Y + TRACK_H + 3}
              stroke="var(--shell-positive)"
              strokeWidth={1.5}
              strokeDasharray="3 2"
            />
          </>
        ) : null}

        {/* peer mean tick */}
        <line
          x1={meanX}
          x2={meanX}
          y1={TRACK_Y}
          y2={TRACK_Y + TRACK_H}
          stroke="rgba(12,33,66,0.32)"
          strokeWidth={1}
        />

        {/* your position marker */}
        {markerX !== null ? (
          <>
            <line
              x1={markerX}
              x2={markerX}
              y1={TRACK_Y - 5}
              y2={TRACK_Y + TRACK_H + 5}
              stroke={markerColor}
              strokeWidth={2}
            />
            <circle cx={markerX} cy={TRACK_Y + TRACK_H / 2} r={5} fill={markerColor} stroke="white" strokeWidth={1.5} />
            <text
              x={Math.max(PAD + 10, Math.min(W - PAD - 10, markerX))}
              y={TRACK_Y - 8}
              textAnchor="middle"
              fontSize={9}
              fontWeight={600}
              fill="var(--shell-ink)"
            >
              you {Math.round(marker as number)}
              {typeof percentile === "number" ? ` · p${Math.round(percentile)}` : ""}
            </text>
          </>
        ) : null}

        {/* scale ticks */}
        {[0, 25, 50, 75, 100].map((g) => (
          <text key={g} x={xTo(g)} y={H - 4} textAnchor="middle" fontSize={8} fill="var(--shell-muted)">
            {g}
          </text>
        ))}
      </svg>
      <figcaption className="mt-1 flex flex-wrap gap-3 text-[0.7rem] text-[var(--shell-muted)]">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm bg-[rgba(6,54,116,0.12)]" /> the pack (p25–p75)
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-4 rounded-sm bg-[rgba(34,163,101,0.16)]" /> top quartile
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full border-2 border-white bg-[var(--brand-c2-blue)] shadow" /> you
        </span>
      </figcaption>
    </figure>
  );
}
