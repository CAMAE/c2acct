import type { VendorBriefData, VendorBriefDeltaRow } from "@/lib/briefs";

// WS11-C: vendor self-report vs firm-reviewed-average per product, as a
// two-polygon radar. Reuses the FiveModuleRadar geometry; only the data
// source (per-product instead of per-module) and colors (canonical WS10-B
// delta semantics: orange = vendor, blue = firm-reviewed average) differ.

const RADIUS = 110;
const CENTER = 140;
const VIEWBOX = 280;
const RING_COUNT = 4;
const MAX_AXES = 8;
const MIN_AXES = 3;

type RadarAxis = {
  slug: string;
  productName: string;
  vendorScore: number | null;
  firmScore: number | null;
};

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function shortenLabel(value: string): string {
  if (value.length <= 16) return value;
  return `${value.slice(0, 15)}…`;
}

function pointOnAxis(
  axisIndex: number,
  axisCount: number,
  score: number | null
): { x: number; y: number } {
  const angle = (axisIndex / axisCount) * 2 * Math.PI - Math.PI / 2;
  const r = ((score ?? 0) / 100) * RADIUS;
  const clamped = Math.max(0, Math.min(RADIUS, r));
  return {
    x: CENTER + Math.cos(angle) * clamped,
    y: CENTER + Math.sin(angle) * clamped,
  };
}

function pointAtRadius(
  axisIndex: number,
  axisCount: number,
  ringFraction: number
): { x: number; y: number } {
  const angle = (axisIndex / axisCount) * 2 * Math.PI - Math.PI / 2;
  return {
    x: CENTER + Math.cos(angle) * RADIUS * ringFraction,
    y: CENTER + Math.sin(angle) * RADIUS * ringFraction,
  };
}

function deriveAxes(rows: readonly VendorBriefDeltaRow[]): RadarAxis[] {
  // Skip rows with no score on either side — they would render as a polygon
  // point at the origin and pull the visual toward zero.
  const usable = rows.filter(
    (row) => row.vendorSelfReported !== null || row.firmReviewedAverage !== null
  );

  // Sort by absolute delta desc so when we trim to MAX_AXES the most
  // story-worthy products land on the radar.
  const ranked = [...usable].sort((a, b) => {
    const aMagnitude =
      a.vendorSelfReported !== null && a.firmReviewedAverage !== null
        ? Math.abs(a.vendorSelfReported - a.firmReviewedAverage)
        : 0;
    const bMagnitude =
      b.vendorSelfReported !== null && b.firmReviewedAverage !== null
        ? Math.abs(b.vendorSelfReported - b.firmReviewedAverage)
        : 0;
    return bMagnitude - aMagnitude;
  });

  const trimmed = ranked.slice(0, MAX_AXES);
  const slugCounts = new Map<string, number>();
  return trimmed.map((row) => {
    const baseSlug = slugify(row.productName) || row.productId;
    const count = slugCounts.get(baseSlug) ?? 0;
    slugCounts.set(baseSlug, count + 1);
    const slug = count === 0 ? baseSlug : `${baseSlug}-${count + 1}`;
    return {
      slug,
      productName: row.productName,
      vendorScore: row.vendorSelfReported,
      firmScore: row.firmReviewedAverage,
    };
  });
}

export default function VendorProductPositioningRadar({
  data,
}: {
  data: VendorBriefData;
}) {
  const axes = deriveAxes(data.selfVsMarketDelta);
  const axisCount = axes.length;

  if (axisCount < MIN_AXES) {
    return (
      <section
        className="pat-soft-panel p-5 text-sm leading-6 text-[var(--shell-muted)]"
        data-testid="vendor-product-positioning-radar-empty"
      >
        Product coverage is too sparse to render a positioning radar yet. The
        Product comparison panel surfaces the full breakdown as a table.
      </section>
    );
  }

  const vendorPath = axes
    .map((axis, idx) => {
      const { x, y } = pointOnAxis(idx, axisCount, axis.vendorScore);
      return `${idx === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .concat("Z")
    .join(" ");

  const firmPath = axes
    .map((axis, idx) => {
      const { x, y } = pointOnAxis(idx, axisCount, axis.firmScore);
      return `${idx === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .concat("Z")
    .join(" ");

  return (
    <section
      className="rounded-[26px] border border-[var(--shell-border)] bg-[var(--shell-panel)] p-6"
      data-testid="vendor-product-positioning-radar-section"
    >
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <div className="pat-label">Product positioning</div>
          <h3 className="mt-2 text-xl font-semibold tracking-tight text-[var(--shell-ink)]">
            Where the vendor says they are vs. where firms say the vendor is
          </h3>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--shell-muted)]">
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5 rounded-sm bg-[var(--brand-orange)]"
            />
            Vendor self-report
          </span>
          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden="true"
              className="inline-block h-2.5 w-2.5 rounded-sm bg-[var(--brand-c2-blue)]"
            />
            Firm-reviewed average
          </span>
        </div>
      </div>

      <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--shell-muted)]">
        Each axis is a product in the vendor&apos;s catalog. Where the orange
        polygon extends past blue, the vendor is over-claiming relative to firm
        consensus; where blue extends past orange, firms see more value than the
        vendor&apos;s self-report.
      </p>

      <div className="mt-4 flex flex-col items-stretch gap-6 sm:items-center">
        <svg
          viewBox={`-70 -40 ${VIEWBOX + 140} ${VIEWBOX + 80}`}
          className="mx-auto h-[24rem] w-full max-w-[26rem]"
          role="img"
          aria-label="Vendor product positioning radar"
          data-testid="vendor-product-positioning-radar"
        >
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

          {/* Vendor polygon (orange) — drawn first so the firm polygon
              overlays on top. */}
          <path
            d={vendorPath}
            fill="var(--brand-orange)"
            fillOpacity="0.18"
            stroke="var(--brand-orange)"
            strokeWidth="2"
          />

          {/* Firm-reviewed polygon (blue) */}
          <path
            d={firmPath}
            fill="var(--brand-c2-blue)"
            fillOpacity="0.18"
            stroke="var(--brand-c2-blue)"
            strokeWidth="2"
          />

          {axes.map((axis, idx) => {
            const { x, y } = pointAtRadius(idx, axisCount, 1.18);
            const anchor =
              Math.abs(x - CENTER) < 4 ? "middle" : x > CENTER ? "start" : "end";
            return (
              <text
                key={`label-${axis.slug}`}
                x={x.toFixed(2)}
                y={y.toFixed(2)}
                textAnchor={anchor}
                dominantBaseline="middle"
                fontSize="10"
                fill="var(--shell-muted)"
              >
                {shortenLabel(axis.productName)}
              </text>
            );
          })}
        </svg>

        <ul className="w-full space-y-2 text-base">
          {axes.map((axis) => (
            <li
              key={axis.slug}
              data-testid={`vendor-product-radar-axis-${axis.slug}`}
              className="flex items-baseline justify-between gap-2 rounded-md border border-[var(--shell-border)] px-3 py-2"
            >
              <span className="text-[var(--shell-ink)]">{axis.productName}</span>
              <span className="text-xs text-[var(--shell-muted)]">
                <span className="pat-stat-number text-[var(--brand-orange)]">
                  {axis.vendorScore ?? "--"}
                </span>{" "}
                vs{" "}
                <span className="pat-stat-number text-[var(--brand-c2-blue)]">
                  {axis.firmScore ?? "--"}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
