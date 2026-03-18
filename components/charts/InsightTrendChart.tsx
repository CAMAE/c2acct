import type { InsightTrendSeries } from "@/lib/intelligence/chartSeries";

type InsightTrendChartProps = {
  title: string;
  series: InsightTrendSeries;
};

function buildPolyline(points: Array<{ x: number; y: number | null }>) {
  return points
    .filter((point): point is { x: number; y: number } => typeof point.y === "number")
    .map((point) => `${point.x},${point.y}`)
    .join(" ");
}

function scaleY(value: number) {
  return 110 - value;
}

export default function InsightTrendChart(props: InsightTrendChartProps) {
  const { title, series } = props;
  const step = series.points.length <= 1 ? 180 : 180 / (series.points.length - 1);
  const selfPoints = series.points.map((point, index) => ({
    x: 20 + index * step,
    y: point.selfScoreAvg === null ? null : scaleY(point.selfScoreAvg),
  }));
  const observedPoints = series.points.map((point, index) => ({
    x: 20 + index * step,
    y: point.observedScoreAvg === null ? null : scaleY(point.observedScoreAvg),
  }));

  return (
    <div className="rounded-3xl border border-slate-200 bg-white/85 p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{series.granularity}</div>
          <div className="mt-1 text-lg font-semibold text-slate-950">{title}</div>
        </div>
        <div className="text-xs text-slate-500">{series.points.length} periods</div>
      </div>

      {series.points.length === 0 ? (
        <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
          {series.note}
        </div>
      ) : (
        <>
          <svg viewBox="0 0 220 132" className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3">
            {[0, 25, 50, 75, 100].map((tick) => {
              const y = scaleY(tick);
              return (
                <g key={tick}>
                  <line x1="16" y1={y} x2="204" y2={y} stroke="rgba(148,163,184,0.35)" strokeDasharray="2 3" />
                  <text x="0" y={y + 4} fontSize="8" fill="#64748b">
                    {tick}
                  </text>
                </g>
              );
            })}
            <polyline fill="none" stroke="#0f172a" strokeWidth="2.5" points={buildPolyline(selfPoints)} />
            <polyline fill="none" stroke="#2563eb" strokeWidth="2.5" points={buildPolyline(observedPoints)} />
            {selfPoints.map((point, index) =>
              point.y === null ? null : <circle key={`self:${series.points[index].periodKey}`} cx={point.x} cy={point.y} r="3" fill="#0f172a" />
            )}
            {observedPoints.map((point, index) =>
              point.y === null ? null : <circle key={`observed:${series.points[index].periodKey}`} cx={point.x} cy={point.y} r="3" fill="#2563eb" />
            )}
          </svg>

          <div className="mt-4 flex flex-wrap gap-4 text-xs text-slate-600">
            <div className="inline-flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-slate-900" />
              Self signal
            </div>
            <div className="inline-flex items-center gap-2">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-blue-600" />
              Observed signal
            </div>
          </div>

          <div className="mt-4 grid gap-2 text-xs text-slate-600">
            {series.points.map((point) => (
              <div key={point.periodKey} className="grid grid-cols-[72px_repeat(4,minmax(0,1fr))] gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <div className="font-semibold text-slate-900">{point.label}</div>
                <div>Self: {point.selfScoreAvg === null ? "--" : point.selfScoreAvg.toFixed(1)}</div>
                <div>Observed: {point.observedScoreAvg === null ? "--" : point.observedScoreAvg.toFixed(1)}</div>
                <div>Submissions: {point.selfSubmissionCount}</div>
                <div>Reviews: {point.observedReviewCount}</div>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-slate-500">{series.note}</div>
        </>
      )}
    </div>
  );
}
