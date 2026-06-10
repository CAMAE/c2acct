import { GUIDE_COLOR, getScoreBand } from "@/lib/scoreBands";

export type RadarChartAxis = {
  key: string;
  label: string;
  /** 0-100 score for the "you" series. Null axes plot at the center. */
  value: number | null;
  /** Optional benchmark score for the dashed comparison outline. */
  benchmark?: number | null;
};

type RadarChartProps = {
  axes: RadarChartAxis[];
  /** Accessible description used for the SVG <title>. */
  title: string;
  /** Legend label for the dashed outline when any axis carries a benchmark. */
  benchmarkLabel?: string;
  className?: string;
};

const RADIUS = 100;
const CENTER = 130;
const VIEWBOX = 260;
const RING_COUNT = 4;

function axisPoint(index: number, count: number, fraction: number) {
  const angle = (index / count) * 2 * Math.PI - Math.PI / 2;
  return {
    x: CENTER + Math.cos(angle) * RADIUS * fraction,
    y: CENTER + Math.sin(angle) * RADIUS * fraction,
  };
}

function scoreFraction(score: number | null) {
  return Math.max(0, Math.min(100, score ?? 0)) / 100;
}

function polygonPath(axes: RadarChartAxis[], pick: (axis: RadarChartAxis) => number | null) {
  return axes
    .map((axis, idx) => {
      const { x, y } = axisPoint(idx, axes.length, scoreFraction(pick(axis)));
      return `${idx === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .concat("Z")
    .join(" ");
}

function shortenLabel(label: string): string {
  if (label.length <= 18) return label;
  const stripped = label.replace(/^[A-Z][a-z]+ /, "");
  return stripped.length <= 18 ? stripped : `${label.slice(0, 16)}…`;
}

export default function RadarChart({ axes, title, benchmarkLabel, className }: RadarChartProps) {
  const count = axes.length;
  const hasBenchmark = axes.some((axis) => typeof axis.benchmark === "number");

  return (
    <div className={className}>
      <svg
        viewBox={`-64 -28 ${VIEWBOX + 128} ${VIEWBOX + 56}`}
        className="mx-auto h-auto w-full max-w-[24rem]"
        role="img"
        aria-label={title}
      >
        <title>{title}</title>

        {Array.from({ length: RING_COUNT }, (_, ringIdx) => {
          const fraction = (ringIdx + 1) / RING_COUNT;
          const points = axes
            .map((_, idx) => {
              const { x, y } = axisPoint(idx, count, fraction);
              return `${x.toFixed(2)},${y.toFixed(2)}`;
            })
            .join(" ");
          return <polygon key={ringIdx} points={points} fill="none" stroke={GUIDE_COLOR} strokeWidth="1" />;
        })}

        {axes.map((axis, idx) => {
          const { x, y } = axisPoint(idx, count, 1);
          return (
            <line
              key={axis.key}
              x1={CENTER}
              y1={CENTER}
              x2={x.toFixed(2)}
              y2={y.toFixed(2)}
              stroke="rgba(6,54,116,0.14)"
              strokeWidth="1"
            />
          );
        })}

        {hasBenchmark ? (
          <path
            d={polygonPath(axes, (axis) => axis.benchmark ?? null)}
            fill="none"
            stroke="rgba(6,54,116,0.55)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
        ) : null}

        <path
          d={polygonPath(axes, (axis) => axis.value)}
          fill="var(--brand-c2-blue)"
          fillOpacity="0.18"
          stroke="var(--brand-c2-blue)"
          strokeWidth="2"
        />

        {axes.map((axis, idx) => {
          if (axis.value === null) return null;
          const { x, y } = axisPoint(idx, count, scoreFraction(axis.value));
          return (
            <circle
              key={`dot-${axis.key}`}
              cx={x.toFixed(2)}
              cy={y.toFixed(2)}
              r="4.5"
              fill={getScoreBand(axis.value).colorVar}
              stroke="white"
              strokeWidth="1.5"
            />
          );
        })}

        {axes.map((axis, idx) => {
          const { x, y } = axisPoint(idx, count, 1.18);
          const anchor = Math.abs(x - CENTER) < 4 ? "middle" : x > CENTER ? "start" : "end";
          return (
            <text
              key={`label-${axis.key}`}
              x={x.toFixed(2)}
              y={y.toFixed(2)}
              textAnchor={anchor}
              dominantBaseline="middle"
              fontSize="10"
              fill="var(--shell-muted)"
            >
              {shortenLabel(axis.label)}
            </text>
          );
        })}
      </svg>

      {hasBenchmark && benchmarkLabel ? (
        <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-[var(--shell-muted)]">
          <span aria-hidden="true" className="inline-block h-0 w-4 border-t border-dashed border-[rgba(6,54,116,0.55)]" />
          {benchmarkLabel}
        </div>
      ) : null}
    </div>
  );
}
