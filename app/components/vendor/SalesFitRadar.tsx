"use client";
import { pillarForModule } from "@/lib/firmPillars";

/**
 * BattleCard mini radar (Redlines R16, P1 detail card). One filled polygon = the
 * firm's own alignment-module shape (real, from its assessment). A dashed
 * reference CIRCLE marks the vendor's OVERALL product strength — deliberately a
 * ring, not a second polygon, because there is no honest per-module vendor
 * strength yet (that awaits the product-section → firm-module mapping; see the
 * roadmap ticket). Modules whose vertex falls inside the ring are headroom the
 * vendor could lift. Unassessed axes (null) render a hollow marker.
 */

const RADIUS = 92;
const CENTER = 120;
const VIEWBOX = 240;
const RING_COUNT = 4;

const FIRM_COLOR = "#063674"; // c2-blue
const VENDOR_COLOR = "#f2820c"; // brand orange

export type SalesRadarAxis = { title: string; score: number | null };

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

export default function SalesFitRadar({
  axes,
  vendorStrength,
}: {
  axes: SalesRadarAxis[];
  vendorStrength: number | null;
}) {
  const count = axes.length;
  if (count === 0) return null;
  const firmValues = axes.map((axis) => axis.score ?? 0);
  const ringRadius = vendorStrength !== null ? (RADIUS * Math.max(0, Math.min(100, vendorStrength))) / 100 : null;

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center sm:gap-5">
      <svg viewBox={`0 0 ${VIEWBOX} ${VIEWBOX}`} className="h-56 w-56 shrink-0" role="img" aria-label="Firm alignment vs your product strength">
        {Array.from({ length: RING_COUNT }, (_, ring) => {
          const r = (RADIUS * (ring + 1)) / RING_COUNT;
          return <circle key={ring} cx={CENTER} cy={CENTER} r={r} fill="none" stroke="rgba(6,54,116,0.10)" />;
        })}
        {axes.map((axis, index) => {
          const { x, y } = pointAt(index, count, 100);
          return <line key={axis.title} x1={CENTER} y1={CENTER} x2={x} y2={y} stroke="rgba(6,54,116,0.10)" />;
        })}
        {/* firm shape */}
        <path d={polygon(firmValues)} fill={FIRM_COLOR} fillOpacity={0.16} stroke={FIRM_COLOR} strokeWidth={2} />
        {/* vendor overall-strength reference ring */}
        {ringRadius !== null ? (
          <circle
            cx={CENTER}
            cy={CENTER}
            r={ringRadius}
            fill="none"
            stroke={VENDOR_COLOR}
            strokeWidth={2}
            strokeDasharray="5 4"
          />
        ) : null}
        {/* hollow markers on unassessed axes */}
        {axes.map((axis, index) => {
          if (axis.score !== null) return null;
          const { x, y } = pointAt(index, count, 0);
          return <circle key={`${axis.title}-null`} cx={x} cy={y} r={3.5} fill="#fff" stroke={FIRM_COLOR} strokeWidth={1.5} />;
        })}
        {axes.map((axis, index) => {
          const { x, y } = pointAt(index, count, 118);
          const anchor = x < CENTER - 4 ? "end" : x > CENTER + 4 ? "start" : "middle";
          return (
            <text key={`${axis.title}-label`} x={x} y={y} textAnchor={anchor} dominantBaseline="middle" className="fill-[var(--shell-muted)] text-[8px]">
              {pillarForModule(axis.title)}
            </text>
          );
        })}
      </svg>
      <div className="text-sm">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: FIRM_COLOR }} />
          <span className="text-[var(--shell-ink)]">Firm alignment shape</span>
        </div>
        <div className="mt-1.5 flex items-center gap-2">
          <span className="inline-block h-0 w-3 border-t-2 border-dashed" style={{ borderColor: VENDOR_COLOR }} />
          <span className="text-[var(--shell-ink)]">Your product strength (overall)</span>
        </div>
        <p className="mt-3 max-w-[15rem] text-xs leading-5 text-[var(--shell-muted)]">
          Modules inside the dashed ring are headroom — the firm sits below your product strength
          there. Overall strength is a single real number, not a per-module claim.
        </p>
      </div>
    </div>
  );
}
