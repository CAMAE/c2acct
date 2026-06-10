import { NEUTRAL_BAR_COLOR, TRACK_COLOR, getScoreBand } from "@/lib/scoreBands";

export type RankedBarItem = {
  key: string;
  label: string;
  /** 0-100 score. Null renders an empty track with an em dash value. */
  value: number | null;
  /** Optional muted annotation after the value (e.g. "meets threshold"). */
  meta?: string;
};

type RankedBarsProps = {
  items: RankedBarItem[];
  /** Accessible description for the chart group. */
  title: string;
  /** Vertical tick on every bar (e.g. 60). Caption renders once below. */
  threshold?: number;
  thresholdLabel?: string;
  /** Color fills by maturity band; defaults to neutral gray-blue. */
  colorByBand?: boolean;
  valueSuffix?: string;
};

export default function RankedBars({
  items,
  title,
  threshold,
  thresholdLabel,
  colorByBand = false,
  valueSuffix = "%",
}: RankedBarsProps) {
  return (
    <div role="img" aria-label={title}>
      <ul className="space-y-2.5">
        {items.map((item) => {
          const width = Math.max(0, Math.min(100, item.value ?? 0));
          const fill =
            colorByBand && typeof item.value === "number" ? getScoreBand(item.value).colorVar : NEUTRAL_BAR_COLOR;
          return (
            <li key={item.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
              <span className="truncate text-sm leading-5 text-[var(--shell-ink)]" title={item.label}>
                {item.label}
              </span>
              <span className="text-sm tabular-nums text-[var(--shell-ink)]">
                <span className="pat-stat-number">
                  {typeof item.value === "number" ? Math.round(item.value) : "—"}
                </span>
                {typeof item.value === "number" ? valueSuffix : ""}
                {item.meta ? <span className="ml-1.5 text-xs text-[var(--shell-muted)]">{item.meta}</span> : null}
              </span>
              <svg
                width="100%"
                height="10"
                viewBox="0 0 100 10"
                preserveAspectRatio="none"
                aria-hidden="true"
                className="col-span-2 block"
              >
                <rect x="0" y="0" width="100" height="10" rx="3" fill={TRACK_COLOR} />
                {typeof item.value === "number" ? (
                  <rect x="0" y="0" width={width.toFixed(1)} height="10" rx="3" fill={fill} />
                ) : null}
                {typeof threshold === "number" ? (
                  <rect
                    x={Math.max(0, Math.min(100, threshold)).toFixed(1)}
                    y="-1"
                    width="0.7"
                    height="12"
                    fill="var(--shell-ink)"
                    fillOpacity="0.55"
                  />
                ) : null}
              </svg>
            </li>
          );
        })}
      </ul>
      {typeof threshold === "number" ? (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-[var(--shell-muted)]">
          <span aria-hidden="true" className="inline-block h-3 w-px bg-[var(--shell-ink)] opacity-55" />
          {thresholdLabel ?? `${threshold}% threshold`}
        </div>
      ) : null}
    </div>
  );
}
