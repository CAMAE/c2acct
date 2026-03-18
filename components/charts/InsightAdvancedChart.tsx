import type { InsightTrendSeries } from "@/lib/intelligence/chartSeries";

type InsightAdvancedChartProps = {
  title: string;
  series: InsightTrendSeries;
};

function scaleGap(value: number) {
  const bounded = Math.max(-100, Math.min(100, value));
  return 70 - bounded * 0.6;
}

function scaleIntegrity(value: number) {
  return 118 - value * 80;
}

export default function InsightAdvancedChart(props: InsightAdvancedChartProps) {
  const { title, series } = props;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{series.granularity}</div>
          <div className="mt-1 text-lg font-semibold text-slate-950">{title}</div>
        </div>
        <div className="text-xs text-slate-500">Gap vs integrity</div>
      </div>

      {series.points.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
          {series.note}
        </div>
      ) : (
        <>
          <svg viewBox="0 0 260 132" className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <line x1="16" y1="70" x2="244" y2="70" stroke="rgba(148,163,184,0.45)" strokeDasharray="4 3" />
            <text x="18" y="66" fontSize="8" fill="#64748b">
              zero gap
            </text>
            {series.points.map((point, index) => {
              const x = 32 + index * (series.points.length <= 1 ? 0 : 200 / (series.points.length - 1));
              const gapY = point.scoreGap === null ? 70 : scaleGap(point.scoreGap);
              const integrityY =
                point.observedIntegrityAvg === null ? null : scaleIntegrity(point.observedIntegrityAvg);
              return (
                <g key={point.periodKey}>
                  {point.scoreGap === null ? null : (
                    <line
                      x1={x}
                      y1="70"
                      x2={x}
                      y2={gapY}
                      stroke={point.scoreGap >= 0 ? "#0f172a" : "#dc2626"}
                      strokeWidth="10"
                      strokeLinecap="round"
                    />
                  )}
                  {integrityY === null ? null : <circle cx={x} cy={integrityY} r="4" fill="#2563eb" />}
                  <text x={x - 10} y="124" fontSize="8" fill="#475569">
                    {point.label}
                  </text>
                </g>
              );
            })}
          </svg>

          <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-600">
            <div className="inline-flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-900" />
              Positive self vs observed gap
            </div>
            <div className="inline-flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-600" />
              Negative self vs observed gap
            </div>
            <div className="inline-flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-600" />
              Observed integrity average
            </div>
          </div>

          <div className="mt-4 grid gap-2 text-xs text-slate-600">
            {series.points.map((point) => (
              <div key={point.periodKey} className="grid grid-cols-[72px_repeat(3,minmax(0,1fr))] gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="font-semibold text-slate-900">{point.label}</div>
                <div>Gap: {point.scoreGap === null ? "--" : point.scoreGap.toFixed(1)}</div>
                <div>Observed integrity: {point.observedIntegrityAvg === null ? "--" : point.observedIntegrityAvg.toFixed(2)}</div>
                <div>Observed reviews: {point.observedReviewCount}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-slate-500">
            This analytical chart stays empty when either observed score history or integrity history is absent. No synthetic divergence is generated.
          </div>
        </>
      )}
    </div>
  );
}
