import Link from "next/link";
import { GUIDE_COLOR, TRACK_COLOR } from "@/lib/scoreBands";

type ChartEmptyStateProps = {
  /** Which ghosted chart silhouette to render behind the message. */
  variant: "radar" | "bars";
  message: string;
  ctaHref: string;
  ctaLabel: string;
};

function GhostRadar() {
  const center = 70;
  const radius = 52;
  const rings = [0.33, 0.66, 1];
  const ghostShape = [62, 48, 55, 40, 58];
  const point = (idx: number, fraction: number) => {
    const angle = (idx / 5) * 2 * Math.PI - Math.PI / 2;
    return `${(center + Math.cos(angle) * radius * fraction).toFixed(1)},${(center + Math.sin(angle) * radius * fraction).toFixed(1)}`;
  };
  return (
    <svg viewBox="0 0 140 140" className="h-32 w-32" aria-hidden="true">
      {rings.map((fraction) => (
        <polygon
          key={fraction}
          points={Array.from({ length: 5 }, (_, idx) => point(idx, fraction)).join(" ")}
          fill="none"
          stroke={GUIDE_COLOR}
          strokeWidth="1"
        />
      ))}
      <polygon
        points={ghostShape.map((score, idx) => point(idx, score / 100)).join(" ")}
        fill={TRACK_COLOR}
        stroke="rgba(6,54,116,0.22)"
        strokeWidth="1.5"
        strokeDasharray="4 4"
      />
    </svg>
  );
}

function GhostBars() {
  const widths = [82, 64, 51, 38];
  return (
    <svg viewBox="0 0 140 76" className="h-20 w-36" aria-hidden="true">
      {widths.map((width, idx) => (
        <g key={width}>
          <rect x="0" y={idx * 19} width="140" height="11" rx="3" fill={TRACK_COLOR} />
          <rect
            x="0"
            y={idx * 19}
            width={width}
            height="11"
            rx="3"
            fill="rgba(6,54,116,0.16)"
            stroke="rgba(6,54,116,0.22)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        </g>
      ))}
    </svg>
  );
}

export default function ChartEmptyState({ variant, message, ctaHref, ctaLabel }: ChartEmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-[18px] border border-dashed border-[var(--shell-border)] bg-[var(--shell-panel-soft)] px-6 py-8 text-center">
      {variant === "radar" ? <GhostRadar /> : <GhostBars />}
      <p className="max-w-md text-sm leading-6 text-[var(--shell-muted)]">{message}</p>
      <Link href={ctaHref} className="pat-button-primary">
        {ctaLabel}
      </Link>
    </div>
  );
}
