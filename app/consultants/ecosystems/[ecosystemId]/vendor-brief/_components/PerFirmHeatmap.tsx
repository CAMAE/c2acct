import type { VendorBriefData, VendorBriefHeatmapBand } from "@/lib/briefs";

const BAND_CELL_CLASSES: Record<VendorBriefHeatmapBand, string> = {
  high: "bg-[var(--brand-accent)] text-white",
  mid: "bg-[var(--shell-panel-soft)] text-[var(--shell-ink)] border border-[var(--shell-border)]",
  low: "bg-white text-[var(--shell-muted)] border border-[var(--brand-accent)]",
  unreviewed:
    "bg-[var(--shell-panel-soft)] text-[var(--shell-muted)] border border-dashed border-[var(--shell-border)]",
};

const BAND_LEGEND: Array<{ band: VendorBriefHeatmapBand; label: string }> = [
  { band: "high", label: "≥ 75" },
  { band: "mid", label: "50–74" },
  { band: "low", label: "< 50" },
  { band: "unreviewed", label: "Not yet reviewed" },
];

export default function PerFirmHeatmap({ data }: { data: VendorBriefData }) {
  const { firms, products, cells } = data.perFirmHeatmap;
  const cellByKey = new Map(
    cells.map((cell) => [`${cell.firmCompanyId}:${cell.productId}`, cell])
  );

  return (
    <section
      className="rounded-[26px] border border-[var(--shell-border)] bg-[var(--shell-panel)] p-6"
      data-testid="per-firm-heatmap"
    >
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div>
          <div className="pat-label">Per-firm heatmap</div>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--shell-ink)]">
            Firm × product review scores
          </h2>
        </div>
        <div className="text-sm text-[var(--shell-muted)]">
          {firms.length} × {products.length} = {cells.length} cell{cells.length === 1 ? "" : "s"}
        </div>
      </div>

      {firms.length === 0 || products.length === 0 ? (
        <p className="text-sm text-[var(--shell-muted)]">
          Heatmap unlocks when the vendor catalog and firm reviews both have data.
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-xs">
              <thead>
                <tr>
                  <th
                    scope="col"
                    className="sticky left-0 z-10 bg-[var(--shell-panel)] pb-2 pr-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--shell-muted)]"
                  >
                    Firm
                  </th>
                  {products.map((product) => (
                    <th
                      key={product.id}
                      scope="col"
                      className="pb-2 pr-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--shell-muted)]"
                    >
                      {product.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {firms.map((firm) => (
                  <tr key={firm.id} className="border-t border-[var(--shell-border)]">
                    <th
                      scope="row"
                      className="sticky left-0 z-10 bg-[var(--shell-panel)] py-1.5 pr-3 text-left font-medium text-[var(--shell-ink)]"
                    >
                      {firm.name}
                    </th>
                    {products.map((product) => {
                      const cell = cellByKey.get(`${firm.id}:${product.id}`);
                      if (!cell) return null;
                      const scoreLabel = cell.score === null ? "—" : String(cell.score);
                      return (
                        <td key={product.id} className="py-1.5 pr-2">
                          <div
                            data-testid="heatmap-cell"
                            data-firm-id={firm.id}
                            data-product-id={product.id}
                            data-band={cell.band}
                            title={`${firm.name} · ${product.name} · ${scoreLabel}`}
                            className={`flex h-9 min-w-[3.5rem] items-center justify-center rounded-md px-2 text-xs font-semibold ${BAND_CELL_CLASSES[cell.band]}`}
                          >
                            {scoreLabel}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-[var(--shell-muted)]">
            {BAND_LEGEND.map((entry) => (
              <div key={entry.band} className="flex items-center gap-1.5">
                <span
                  aria-hidden="true"
                  className={`inline-flex h-3 w-5 rounded-sm ${BAND_CELL_CLASSES[entry.band]}`}
                />
                {entry.label}
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
