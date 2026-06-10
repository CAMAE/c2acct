import { TRACK_COLOR } from "@/lib/scoreBands";

type DivergenceSeries = {
  label: string;
  /** 0-100 score. */
  value: number;
};

type DivergenceBarProps = {
  /** First series, e.g. vendor self-reported. Rendered solid. */
  a: DivergenceSeries;
  /** Second series, e.g. firm-reviewed. Rendered lighter. */
  b: DivergenceSeries;
  /** Accessible description for the chart group. */
  title: string;
  /** Gap callout; defaults to "X pt divergence" from |a - b|. */
  gapLabel?: string;
  valueSuffix?: string;
};

const SERIES_FILL = ["rgba(6, 54, 116, 0.78)", "rgba(79, 191, 226, 0.66)"] as const;

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

export default function DivergenceBar({ a, b, title, gapLabel, valueSuffix = "%" }: DivergenceBarProps) {
  const gap = round1(Math.abs(a.value - b.value));
  const callout = gapLabel ?? `${gap} pt divergence`;

  return (
    <div role="img" aria-label={`${title}: ${a.label} ${a.value}${valueSuffix}, ${b.label} ${b.value}${valueSuffix}, ${callout}`}>
      <ul className="space-y-2.5">
        {[a, b].map((series, index) => {
          const width = Math.max(0, Math.min(100, series.value));
          return (
            <li key={series.label} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1">
              <span className="truncate text-sm leading-5 text-[var(--shell-ink)]" title={series.label}>
                {series.label}
              </span>
              <span className="text-sm tabular-nums text-[var(--shell-ink)]">
                <span className="pat-stat-number">{round1(series.value)}</span>
                {valueSuffix}
              </span>
              <svg
                width="100%"
                height="12"
                viewBox="0 0 100 12"
                preserveAspectRatio="none"
                aria-hidden="true"
                className="col-span-2 block"
              >
                <rect x="0" y="0" width="100" height="12" rx="3" fill={TRACK_COLOR} />
                <rect x="0" y="0" width={width.toFixed(1)} height="12" rx="3" fill={SERIES_FILL[index]} />
              </svg>
            </li>
          );
        })}
      </ul>
      <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full border border-[var(--shell-border)] px-2.5 py-1 text-xs font-semibold text-[var(--shell-ink)]">
        <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-[var(--brand-orange)]" />
        {callout}
      </div>
    </div>
  );
}
