import type { VendorBriefData, VendorBriefDeltaRow } from "@/lib/briefs";
import PerFirmHeatmap from "./PerFirmHeatmap";

function formatGeneratedDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 10);
}

function formatScore(value: number | null): string {
  return value === null ? "—" : String(value);
}

function deltaCellNumber(row: VendorBriefDeltaRow): string {
  if (row.delta === null) return "—";
  if (row.delta === 0) return "0";
  const sign = row.delta > 0 ? "+" : "−";
  return `${sign}${Math.abs(row.delta)}`;
}

function deltaCellColorClass(row: VendorBriefDeltaRow): string {
  // WS10-B Block B: canonical delta-color semantics — see SelfVsMarketDelta.
  if (row.delta === null) return "text-[var(--shell-muted)]";
  if (row.deltaDirection === "vendor-higher") return "text-[var(--brand-orange)]";
  if (row.deltaDirection === "firm-higher") return "text-green-600";
  return "text-[var(--shell-ink)]";
}

function directionLabel(row: VendorBriefDeltaRow): string {
  if (row.delta === null) return "Awaiting firm review";
  if (row.isHotDivergence) return "Hot divergence";
  if (row.deltaDirection === "neutral") return "Matched";
  if (row.deltaDirection === "vendor-higher") return "Vendor leads";
  if (row.deltaDirection === "firm-higher") return "Firms lead";
  return "—";
}

function directionColorClass(row: VendorBriefDeltaRow): string {
  // WS10-B Block B: align Direction label color with the Delta cell color
  // semantics: vendor-higher = orange, firm-higher = green, neutral = ink,
  // null = muted.
  if (row.delta === null) return "text-[var(--shell-muted)]";
  if (row.deltaDirection === "vendor-higher") return "text-[var(--brand-orange)]";
  if (row.deltaDirection === "firm-higher") return "text-green-600";
  return "text-[var(--shell-ink)]";
}

function actionTitleFromRows(rows: VendorBriefDeltaRow[], vendorName: string): string {
  if (rows.length === 0) {
    return `Product comparison populates once ${vendorName} publishes a product catalog.`;
  }
  const scored = rows.filter((r) => r.delta !== null);
  if (scored.length === 0) {
    return `Product comparison populates as firm responses land — 0 of ${rows.length} product scores in.`;
  }
  const leads = scored.filter(
    (r) => r.deltaDirection === "vendor-higher" && !r.isHotDivergence
  ).length;
  const trails = scored.filter(
    (r) => r.deltaDirection === "firm-higher" || r.isHotDivergence
  ).length;
  if (leads + trails === 0) {
    return `Across ${scored.length} scored ${scored.length === 1 ? "product" : "products"}, ${vendorName} tracks the network average within the conversation-grade band.`;
  }
  if (trails === 0) {
    return `Across ${scored.length} scored ${scored.length === 1 ? "product" : "products"}, ${vendorName} leads on ${leads} and matches the network on the rest.`;
  }
  if (leads === 0) {
    return `Across ${scored.length} scored ${scored.length === 1 ? "product" : "products"}, ${vendorName} trails the network on ${trails}.`;
  }
  return `Across ${scored.length} scored ${scored.length === 1 ? "product" : "products"}, ${vendorName} leads on ${leads} and trails on ${trails}.`;
}

export default function ProductComparison({ data }: { data: VendorBriefData }) {
  const rows = data.selfVsMarketDelta;
  const firmLabel = data.firmCount === 1 ? "firm" : "firms";
  const refreshedDate = formatGeneratedDate(data.generatedAt);
  const actionTitle = actionTitleFromRows(rows, data.vendorCompanyName);
  const firmsNeeded = Math.max(2 - data.firmCount, 1);

  return (
    <section
      id="section-5-product-comparison"
      className="scroll-mt-8 rounded-[26px] border border-[var(--shell-border)] bg-[var(--shell-panel)] p-8"
      data-testid="product-comparison"
    >
      <div className="pat-label">Section 5 · Product comparison</div>

      <h2
        className="mt-4 font-semibold tracking-tight text-[var(--shell-ink)]"
        style={{ fontSize: "var(--pat-hero-title-size)", lineHeight: 1.15 }}
      >
        {actionTitle}
      </h2>

      <p className="mt-3 text-sm text-[var(--shell-muted)]">
        Scorecard table — every product at a glance. Use Section 3 for the headline divergences; this section is the full scoreboard.
      </p>

      {rows.length === 0 ? (
        <div className="mt-8 border-t border-dashed border-[var(--shell-border)] pt-6">
          <div
            className="text-base font-semibold leading-snug text-[var(--shell-ink)]"
            data-testid="product-comparison-empty"
          >
            Awaiting product responses from {firmsNeeded} more firm{firmsNeeded === 1 ? "" : "s"} to surface peer-validated comparisons.
          </div>
          <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
            The product table populates once {data.vendorCompanyName} publishes a product catalog AND at least one firm-side review lands. Vendor self-report alone is not enough — peer grounding is the whole point of the section.
          </p>
        </div>
      ) : (
        <div className="mt-8 overflow-x-auto">
          {/* WS2-E (manual-review item 24): table-fixed + colgroup widths
              spread the columns across the full card width instead of
              jamming on the left. Product gets the biggest slice (30%) since
              it carries multi-line text; numeric columns each get 14-18%;
              Direction gets 24% for the longest label. */}
          <table
            className="w-full table-fixed text-left text-sm"
            data-testid="product-comparison-table"
          >
            <colgroup>
              <col className="w-[30%]" />
              <col className="w-[18%]" />
              <col className="w-[14%]" />
              <col className="w-[14%]" />
              <col className="w-[24%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-[var(--shell-border)] text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--shell-muted)]">
                <th scope="col" className="py-3 pr-4">
                  Product
                </th>
                <th scope="col" className="py-3 pr-4 text-right tabular-nums whitespace-nowrap">
                  Vendor self-report
                </th>
                <th scope="col" className="py-3 pr-4 text-right tabular-nums whitespace-nowrap">
                  Firm avg
                </th>
                <th scope="col" className="py-3 pr-4 text-right tabular-nums whitespace-nowrap">
                  Delta
                </th>
                <th scope="col" className="py-3">
                  Direction
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--shell-border)]">
              {rows.map((row) => (
                <tr
                  key={row.productId}
                  data-testid="product-row"
                  data-product-id={row.productId}
                  data-hot-divergence={row.isHotDivergence ? "1" : "0"}
                  className="align-baseline"
                >
                  <td className="py-4 pr-4">
                    <div className="text-base font-semibold text-[var(--shell-ink)]">
                      {row.productName}
                    </div>
                    <div className="mt-1 text-xs text-[var(--shell-muted)]">
                      <span className="pat-stat-number">{row.firmReviewCount}</span> firm review{row.firmReviewCount === 1 ? "" : "s"}
                    </div>
                  </td>
                  <td className="pat-stat-number py-4 pr-4 text-right text-base">
                    {formatScore(row.vendorSelfReported)}
                  </td>
                  <td className="pat-stat-number py-4 pr-4 text-right text-base">
                    {formatScore(row.firmReviewedAverage)}
                  </td>
                  <td
                    className={`pat-stat-number py-4 pr-4 text-right text-2xl tracking-tight ${deltaCellColorClass(row)}`}
                  >
                    {deltaCellNumber(row)}
                  </td>
                  <td className={`py-4 text-sm font-medium ${directionColorClass(row)}`}>
                    {directionLabel(row)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mt-10 border-t border-dashed border-[var(--shell-border)] pt-6">
        <div className="pat-label text-[11px]">Per-firm coverage matrix</div>
        <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
          Firm-by-product cells using the Section 2 bands (high &ge; 75, mid 50&ndash;74, low &lt; 50, not yet reviewed). Use this view to spot the firms that haven&apos;t yet reviewed a given product.
        </p>
        <div className="mt-4">
          <PerFirmHeatmap data={data} />
        </div>
      </div>

      <div
        className="mt-10 border-t border-[var(--shell-border)] pt-5 text-xs leading-6 text-[var(--shell-muted)]"
        data-testid="product-comparison-methodology-footer"
      >
        Based on responses from {data.firmCount} {firmLabel} in your network · last refreshed {refreshedDate} · {rows.length} {rows.length === 1 ? "product" : "products"} tracked · hot-divergence threshold &ge; 10 points · scoring methodology: see Section 2 above.
      </div>
    </section>
  );
}
