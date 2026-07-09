"use client";

/**
 * Alignment Sandbox positioning radar (Redlines R12.2; re-axised P0 2026-07-09).
 * Two polygons over the five PRODUCT-FIT dimension axes (Workflow Fit,
 * Integration & Data, Implementation, Support & Trust, Value Clarity): the solid
 * blue polygon is the current stack shape; the orange polygon is the PROJECTED
 * shape, which redraws live on every swap. Same visual family + legend language
 * as the consultant-brief FiveModuleRadar (current = blue, projected = orange).
 *
 * Each axis is a real MEAN of stored per-section review evidence — NOT a uniform
 * delta and NOT the firm's five assessment modules (see the roadmap ticket for
 * the product-section → firm-module mapping that would unlock those axes). Axes
 * marked `thin` have no/low signal and are rendered with a hollow marker; the
 * caption says the projection is directional, never faked precision.
 */

const RADIUS = 104;
const CENTER = 140;
const VIEWBOX = 280;
const RING_COUNT = 4;

const CURRENT_COLOR = "#063674"; // c2-blue
const PROJECTED_COLOR = "#f2820c"; // brand orange

export type RadarAxis = {
  title: string;
  current: number | null;
  projected: number | null;
  /** No/low stored signal on this axis — render a hollow marker, don't imply precision. */
  thin?: boolean;
};

function pointAt(index: number, count: number, value: number): { x: number; y: number } {
  const angle = (-90 + (index * 360) / count) * (Math.PI / 180);
  const r = (RADIUS * Math.max(0, Math.min(100, value))) / 100;
  return { x: CENTER + r * Math.cos(angle), y: CENTER + r * Math.sin(angle) };
}

function polygon(values: number[]): string {
  return values
    .map((value, index) => {
      const { x, y } = pointAt(index, values.length, value);
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ")
    .concat(" Z");
}

function shorten(label: string): string {
  return label.length <= 20 ? label : `${label.slice(0, 19)}…`;
}

export default function AlignmentRadar({
  axes,
  showProjected,
  label = "Product-fit dimensions",
  evidenceNote,
}: {
  axes: RadarAxis[];
  showProjected: boolean;
  /** Legend heading — makes clear this is NOT the firm's module alignment radar. */
  label?: string;
  /** Honest one-liner about the projection's evidence basis (e.g. vendor-reported). */
  evidenceNote?: string | null;
}) {
  const count = axes.length;
  const currentValues = axes.map((axis) => axis.current ?? 0);
  const projectedValues = axes.map((axis) => axis.projected ?? axis.current ?? 0);
  const anyThin = axes.some((axis) => axis.thin);

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-6">
      <svg viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} className="h-64 w-64 shrink-0" role="img" aria-label="Alignment positioning radar">
        {/* rings */}
        {Array.from({ length: RING_COUNT }, (_, ring) => {
          const r = (RADIUS * (ring + 1)) / RING_COUNT;
          return <circle key={ring} cx={CENTER} cy={CENTER} r={r} fill="none" stroke="rgba(6,54,116,0.10)" />;
        })}
        {/* spokes */}
        {axes.map((axis, index) => {
          const { x, y } = pointAt(index, count, 100);
          return <line key={axis.title} x1={CENTER} y1={CENTER} x2={x} y2={y} stroke="rgba(6,54,116,0.10)" />;
        })}
        {/* current polygon */}
        <path d={polygon(currentValues)} fill={CURRENT_COLOR} fillOpacity={0.16} stroke={CURRENT_COLOR} strokeWidth={2} />
        {/* projected polygon (live) */}
        {showProjected ? (
          <path
            d={polygon(projectedValues)}
            fill={PROJECTED_COLOR}
            fillOpacity={0.12}
            stroke={PROJECTED_COLOR}
            strokeWidth={2}
            strokeDasharray="5 4"
            style={{ transition: "d .4s ease" }}
          />
        ) : null}
        {/* thin-axis markers: hollow ring at the current vertex where signal is low */}
        {axes.map((axis, index) => {
          if (!axis.thin) return null;
          const { x, y } = pointAt(index, count, axis.current ?? 0);
          return (
            <circle
              key={`${axis.title}-thin`}
              cx={x}
              cy={y}
              r={3.5}
              fill="var(--shell-surface, #fff)"
              stroke={CURRENT_COLOR}
              strokeWidth={1.5}
            />
          );
        })}
        {/* axis labels */}
        {axes.map((axis, index) => {
          const { x, y } = pointAt(index, count, 122);
          const anchor = x < CENTER - 4 ? "end" : x > CENTER + 4 ? "start" : "middle";
          return (
            <text
              key={`${axis.title}-label`}
              x={x}
              y={y}
              textAnchor={anchor}
              dominantBaseline="middle"
              className={axis.thin ? "fill-[var(--shell-muted)] text-[9px] italic" : "fill-[var(--shell-muted)] text-[9px]"}
            >
              {shorten(axis.title)}
              {axis.thin ? " ·" : ""}
            </text>
          );
        })}
      </svg>
      <div className="text-sm">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--shell-muted)]">
          {label}
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: CURRENT_COLOR }} />
          <span className="text-[var(--shell-ink)]">Current stack shape</span>
        </div>
        {showProjected ? (
          <div className="mt-1.5 flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: PROJECTED_COLOR }} />
            <span className="text-[var(--shell-ink)]">Projected after swap</span>
          </div>
        ) : null}
        {anyThin ? (
          <div className="mt-1.5 flex items-center gap-2">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full border-[1.5px]"
              style={{ borderColor: CURRENT_COLOR, background: "var(--shell-surface, #fff)" }}
            />
            <span className="text-[var(--shell-muted)]">Thin evidence (·) — held, not projected</span>
          </div>
        ) : null}
        <p className="mt-3 max-w-[16rem] text-xs leading-5 text-[var(--shell-muted)]">
          Each axis is the mean of your stack&rsquo;s stored per-section review evidence. The projected
          shape re-means with the swap — directional, drawn from real answers, not a firm-verified
          forecast. These are product-fit dimensions, not the firm alignment modules.
        </p>
        {evidenceNote ? (
          <p className="mt-2 max-w-[16rem] text-xs leading-5 text-[var(--brand-orange)]">{evidenceNote}</p>
        ) : null}
      </div>
    </div>
  );
}
