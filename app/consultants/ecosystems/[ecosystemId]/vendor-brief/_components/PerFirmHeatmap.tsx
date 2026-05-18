import type { VendorBriefData, VendorBriefHeatmapBand } from "@/lib/briefs";

const BAND_CELL_CLASSES: Record<VendorBriefHeatmapBand, string> = {
  high: "bg-[var(--brand-c2-blue)] text-white",
  mid: "bg-[var(--shell-panel-soft)] text-[var(--shell-ink)] border border-[var(--shell-border)]",
  low: "bg-white text-[var(--shell-muted)] border border-dashed border-[var(--shell-border)]",
  unreviewed: "bg-white text-[var(--shell-muted)]",
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
    <div data-testid="per-firm-heatmap">
      <div className="mb-3 text-xs text-[var(--shell-muted)]">
        <span className="pat-stat-number">{firms.length}</span> firm{firms.length === 1 ? "" : "s"} &times; <span className="pat-stat-number">{products.length}</span> product
        {products.length === 1 ? "" : "s"} = <span className="pat-stat-number">{cells.length}</span> cell{cells.length === 1 ? "" : "s"}
      </div>

      {firms.length === 0 || products.length === 0 ? (
        <div
          className="border-t border-dashed border-[var(--shell-border)] pt-4"
          data-testid="per-firm-heatmap-empty"
        >
          <div className="text-base font-semibold leading-snug text-[var(--shell-ink)]">
            Awaiting capability response from firms to populate the coverage matrix.
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
            The matrix populates when the vendor catalog and at least one firm-side review are both on file.
          </p>
        </div>
      ) : (
        <>
          {/* WS2-E (manual-review item 25): widen the per-firm matrix to use
              the full Section 5 card width. min-w-full → w-full so columns
              stretch to fill available width instead of jamming on the left. */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
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
                      // Day-27 P1i (RK7): never drop a cell silently. If the
                      // composer didn't emit a cell for this (firm, product)
                      // pair, render the credibility-frame "Awaiting" cell so
                      // the matrix doesn't show a hole.
                      const cell = cellByKey.get(`${firm.id}:${product.id}`) ?? {
                        firmCompanyId: firm.id,
                        productId: product.id,
                        score: null,
                        band: "unreviewed" as const,
                      };
                      const scoreLabel = cell.score === null ? "—" : String(cell.score);
                      const titleText =
                        cell.score === null
                          ? `${firm.name} · ${product.name} · Awaiting capability response`
                          : `${firm.name} · ${product.name} · ${scoreLabel}`;
                      return (
                        <td key={product.id} className="py-1.5 pr-2">
                          <div
                            data-testid="heatmap-cell"
                            data-firm-id={firm.id}
                            data-product-id={product.id}
                            data-band={cell.band}
                            title={titleText}
                            className={`pat-stat-number flex h-9 min-w-[3.5rem] items-center justify-center rounded-md px-2 text-sm ${BAND_CELL_CLASSES[cell.band]}`}
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
    </div>
  );
}
