import type { FirmBriefData, FirmBriefRadarBand } from "@/lib/firmBriefs";

const RADIUS = 110;
const CENTER = 140;
const VIEWBOX = 280;
const RING_COUNT = 4; // background concentric guides at 25/50/75/100

const BAND_COLOR: Record<FirmBriefRadarBand, string> = {
  "deep-green": "#0e7c3a",
  green: "#3aab66",
  amber: "#b58420",
  red: "#c25441",
  "deep-red": "#8a2f24",
  "no-signal": "rgba(6,54,116,0.18)",
};

const BAND_LEGEND: Array<{ band: FirmBriefRadarBand; label: string }> = [
  { band: "deep-green", label: ">15 above avg" },
  { band: "green", label: "6 to 15 above" },
  { band: "amber", label: "within ±5" },
  { band: "red", label: "6 to 15 below" },
  { band: "deep-red", label: ">15 below avg" },
];

function pointOnAxis(axisIndex: number, axisCount: number, score: number): { x: number; y: number } {
  // Place axis 0 at the top (12 o'clock), rotate clockwise.
  const angle = (axisIndex / axisCount) * 2 * Math.PI - Math.PI / 2;
  const r = Math.max(0, Math.min(100, score)) / 100 * RADIUS;
  return {
    x: CENTER + Math.cos(angle) * r,
    y: CENTER + Math.sin(angle) * r,
  };
}

function pointAtRadius(axisIndex: number, axisCount: number, ringFraction: number): { x: number; y: number } {
  const angle = (axisIndex / axisCount) * 2 * Math.PI - Math.PI / 2;
  return {
    x: CENTER + Math.cos(angle) * RADIUS * ringFraction,
    y: CENTER + Math.sin(angle) * RADIUS * ringFraction,
  };
}

function shortenLabel(title: string): string {
  // Module titles are long; pull the first 1-2 meaningful words.
  if (title.length <= 22) return title;
  const stripped = title.replace(/^[A-Z][a-z]+ /, "");
  return stripped.length <= 22 ? stripped : `${title.slice(0, 20)}…`;
}

// WS10-B Block B: axis.delta is firmScore - ecosystemAverage. For the
// firm-brief consultant lens, firm above peers reads green (this firm is
// doing well), below peers reads orange (areas to improve). Matched = ink.
function deltaColorClass(delta: number | null): string {
  if (delta === null) return "text-[var(--shell-muted)]";
  if (delta > 0) return "text-green-600";
  if (delta < 0) return "text-[var(--brand-orange)]";
  return "text-[var(--shell-ink)]";
}

export default function FiveModuleRadar({ data }: { data: FirmBriefData }) {
  const axes = data.fiveModuleRadar;
  const axisCount = axes.length;

  const firmPath = axes
    .map((axis, idx) => {
      const score = axis.firmScore ?? 0;
      const { x, y } = pointOnAxis(idx, axisCount, score);
      return `${idx === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .concat("Z")
    .join(" ");

  const ecosystemPath = axes
    .map((axis, idx) => {
      const score = axis.ecosystemAverage ?? 0;
      const { x, y } = pointOnAxis(idx, axisCount, score);
      return `${idx === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .concat("Z")
    .join(" ");

  return (
    <section
      className="rounded-[26px] border border-[var(--shell-border)] bg-[var(--shell-panel)] p-6"
      data-testid="five-module-radar"
    >
      <div className="pat-label">Five-module maturity profile</div>
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--shell-ink)]">
        Module score vs ecosystem peers
      </h2>

      <div className="mt-4 flex flex-wrap items-start gap-6">
        <svg
          viewBox={`-30 -30 ${VIEWBOX + 60} ${VIEWBOX + 60}`}
          className="h-72 w-72 shrink-0"
          role="img"
          aria-label="Five-module maturity radar"
        >
          {/* Background concentric rings */}
          {Array.from({ length: RING_COUNT }, (_, ringIdx) => {
            const fraction = (ringIdx + 1) / RING_COUNT;
            const ringPoints = axes
              .map((_, idx) => {
                const { x, y } = pointAtRadius(idx, axisCount, fraction);
                return `${x.toFixed(2)},${y.toFixed(2)}`;
              })
              .join(" ");
            return (
              <polygon
                key={ringIdx}
                points={ringPoints}
                fill="none"
                stroke="rgba(6,54,116,0.10)"
                strokeWidth="1"
              />
            );
          })}

          {/* Axis spokes */}
          {axes.map((_, idx) => {
            const { x, y } = pointAtRadius(idx, axisCount, 1);
            return (
              <line
                key={idx}
                x1={CENTER}
                y1={CENTER}
                x2={x.toFixed(2)}
                y2={y.toFixed(2)}
                stroke="rgba(6,54,116,0.14)"
                strokeWidth="1"
              />
            );
          })}

          {/* Ecosystem average — dashed line, muted */}
          <path
            d={ecosystemPath}
            fill="none"
            stroke="rgba(6,54,116,0.55)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />

          {/* Firm shape — solid, brand accent fill at low opacity */}
          <path
            d={firmPath}
            fill="var(--brand-c2-blue)"
            fillOpacity="0.18"
            stroke="var(--brand-c2-blue)"
            strokeWidth="2"
          />

          {/* Per-axis vertex dots colored by band */}
          {axes.map((axis, idx) => {
            if (axis.firmScore === null) return null;
            const { x, y } = pointOnAxis(idx, axisCount, axis.firmScore);
            return (
              <circle
                key={axis.moduleKey}
                data-testid={`radar-axis-${axis.moduleKey}`}
                data-band={axis.band}
                data-firm-score={String(axis.firmScore)}
                data-ecosystem-average={
                  axis.ecosystemAverage === null ? "" : String(axis.ecosystemAverage)
                }
                data-delta={axis.delta === null ? "" : String(axis.delta)}
                cx={x.toFixed(2)}
                cy={y.toFixed(2)}
                r="5"
                fill={BAND_COLOR[axis.band]}
                stroke="white"
                strokeWidth="1.5"
              />
            );
          })}

          {/* Axis labels — outside the outermost ring */}
          {axes.map((axis, idx) => {
            const { x, y } = pointAtRadius(idx, axisCount, 1.18);
            const anchor =
              Math.abs(x - CENTER) < 4 ? "middle" : x > CENTER ? "start" : "end";
            return (
              <text
                key={`label-${axis.moduleKey}`}
                x={x.toFixed(2)}
                y={y.toFixed(2)}
                textAnchor={anchor}
                dominantBaseline="middle"
                fontSize="10"
                fill="var(--shell-muted)"
              >
                {shortenLabel(axis.moduleTitle)}
              </text>
            );
          })}
        </svg>

        <div className="flex-1 min-w-[14rem] space-y-2">
          <ul className="space-y-1.5 text-sm leading-6 text-[var(--shell-ink)]">
            {axes.map((axis) => (
              <li
                key={`row-${axis.moduleKey}`}
                className="flex items-center justify-between gap-3 border-b border-[var(--shell-border)] pb-1.5"
              >
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: BAND_COLOR[axis.band] }}
                  />
                  <span>{axis.moduleTitle}</span>
                </span>
                <span className="text-xs text-[var(--shell-muted)]">
                  {axis.firmScore === null ? (
                    "--"
                  ) : axis.ecosystemAverage === null ? (
                    <span className="pat-stat-number">{axis.firmScore}</span>
                  ) : (
                    <>
                      <span className="pat-stat-number">{axis.firmScore}</span> vs{" "}
                      <span className="pat-stat-number">{axis.ecosystemAverage}</span> (Δ{" "}
                      <span className={`pat-stat-number ${deltaColorClass(axis.delta)}`}>
                        {axis.delta !== null && axis.delta >= 0 ? "+" : ""}
                        {axis.delta ?? "--"}
                      </span>
                      )
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-wrap gap-3 text-xs text-[var(--shell-muted)]">
            {BAND_LEGEND.map((entry) => (
              <div key={entry.band} className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className="inline-block h-2.5 w-4 rounded-sm"
                  style={{ background: BAND_COLOR[entry.band] }}
                />
                {entry.label}
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="inline-block h-0 w-4 border-t border-dashed border-[rgba(6,54,116,0.55)]"
              />
              ecosystem avg
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
