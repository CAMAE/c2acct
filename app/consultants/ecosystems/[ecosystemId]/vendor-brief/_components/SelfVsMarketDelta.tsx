import type { VendorBriefData, VendorBriefDeltaRow } from "@/lib/briefs";

const SECTION_KEY = "vendor.self-vs-market-delta" as const;

function formatGeneratedDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 10);
}

function bigNumber(row: VendorBriefDeltaRow): string {
  if (row.delta === null) return "—";
  if (row.delta === 0) return "0";
  const sign = row.delta > 0 ? "+" : "−";
  return `${sign}${Math.abs(row.delta)}`;
}

function bigNumberLabel(row: VendorBriefDeltaRow): string {
  if (row.delta === null) return "Awaiting firm review";
  if (row.deltaDirection === "neutral") return "Matched";
  if (row.deltaDirection === "vendor-higher") return "Vendor higher";
  if (row.deltaDirection === "firm-higher") return "Firms higher";
  return "—";
}

const AWAITING_REVIEW_HELPER =
  "Score unlocks at N≥2 firm responses for this product.";

function bigNumberColorClass(row: VendorBriefDeltaRow): string {
  if (row.delta === null) return "text-[var(--shell-muted)]";
  if (row.isHotDivergence) return "text-[var(--brand-orange)]";
  if (row.deltaDirection === "neutral") return "text-[var(--shell-muted)]";
  return "text-[var(--brand-c2-blue)]";
}

function clampPct(value: number | null): number {
  if (value === null || Number.isNaN(value)) return 0;
  if (value < 0) return 0;
  if (value > 100) return 100;
  return value;
}

type PairedBarTone = "green" | "red" | "neutral" | "muted";

function pairedBarFillClass(tone: PairedBarTone): string {
  if (tone === "green") return "bg-green-600/80";
  if (tone === "red") return "bg-[var(--brand-orange)]";
  if (tone === "muted") return "bg-[var(--shell-muted)]/40";
  return "bg-[var(--brand-c2-blue)]/60";
}

function vendorBarTone(row: VendorBriefDeltaRow): PairedBarTone {
  if (row.vendorSelfReported === null) return "muted";
  if (row.isHotDivergence) return "red";
  if (row.deltaDirection === "vendor-higher") return "green";
  if (row.deltaDirection === "neutral") return "neutral";
  return "red";
}

function firmBarTone(row: VendorBriefDeltaRow): PairedBarTone {
  if (row.firmReviewedAverage === null) return "muted";
  if (row.isHotDivergence) return "red";
  if (row.deltaDirection === "firm-higher") return "green";
  if (row.deltaDirection === "neutral") return "neutral";
  return "red";
}

function actionTitleFromDelta(rows: VendorBriefDeltaRow[], vendorName: string): string {
  if (rows.length === 0) {
    return `${vendorName} has no completed product self-assessments yet — the delta lens unlocks once those land.`;
  }
  const top = rows[0];
  const hotCount = rows.filter((r) => r.isHotDivergence).length;
  if (top.delta === null) {
    return `${vendorName}: no firm reviews on file yet for any catalog product.`;
  }
  if (top.delta === 0 && hotCount === 0) {
    return `${vendorName} self-reports and firm-reviewed averages track within a 10-point band across the catalog.`;
  }
  const direction =
    top.deltaDirection === "vendor-higher"
      ? "above"
      : top.deltaDirection === "firm-higher"
        ? "below"
        : "level with";
  const magnitude = Math.abs(top.delta);
  return `${vendorName}'s ${top.productName} self-report sits ${direction} firm-reviewed scores by ${magnitude} point${magnitude === 1 ? "" : "s"}${hotCount > 0 ? ` · ${hotCount} hot divergence${hotCount === 1 ? "" : "s"} across the catalog` : ""}.`;
}

export default function SelfVsMarketDelta({ data }: { data: VendorBriefData }) {
  const rows = data.selfVsMarketDelta;
  const activeEmphasis = data.editChoices.emphasis[SECTION_KEY] ?? [];
  const firmLabel = data.firmCount === 1 ? "firm" : "firms";
  const refreshedDate = formatGeneratedDate(data.generatedAt);
  const actionTitle = actionTitleFromDelta(rows, data.vendorCompanyName);

  return (
    <section
      id="section-3-positioning-visual"
      className="scroll-mt-8 rounded-[26px] border border-[var(--shell-border)] bg-[var(--shell-panel)] p-8"
      data-testid="self-vs-market-delta"
    >
      <div className="pat-label">Section 3 · Positioning visual</div>

      <h2
        className="mt-4 font-semibold tracking-tight text-[var(--shell-ink)]"
        style={{ fontSize: "var(--pat-hero-title-size)", lineHeight: 1.15 }}
      >
        {actionTitle}
      </h2>

      <p className="mt-3 text-sm text-[var(--shell-muted)]">
        Self-reported vendor scores vs ecosystem firm-reviewed averages, by product. Sorted by absolute delta.
      </p>

      {rows.length === 0 ? (
        <p className="mt-8 text-sm text-[var(--shell-muted)]">
          No vendor products with completed self-assessment yet. Delta unlocks when the
          vendor finishes the product assessment.
        </p>
      ) : (
        <div className="mt-8 divide-y divide-[var(--shell-border)]">
          {rows.map((row, rowIndex) => {
            const emphasisId = `row-${rowIndex}`;
            const isEmphasized = activeEmphasis.includes(emphasisId);
            return (
              <div
                key={row.productId}
                data-testid="delta-row"
                data-product-id={row.productId}
                data-hot-divergence={row.isHotDivergence ? "1" : "0"}
                data-emphasis-id={emphasisId}
                data-emphasis-active={isEmphasized ? "true" : "false"}
                className="grid grid-cols-1 items-baseline gap-4 bg-[var(--shell-panel)] py-6 md:grid-cols-[1.5fr_auto_1.2fr]"
              >
                <div>
                  <div className="text-base font-semibold text-[var(--shell-ink)]">
                    {row.productName}
                  </div>
                  <div className="mt-1 text-xs text-[var(--shell-muted)]">
                    {row.firmReviewCount} firm review{row.firmReviewCount === 1 ? "" : "s"} · vendor self-report {row.vendorSelfReported === null ? "—" : row.vendorSelfReported} · firm avg {row.firmReviewedAverage === null ? "—" : row.firmReviewedAverage}
                  </div>
                </div>
                {/* WS4 Block B (manual-review item 22): replace the giant 6xl
                    delta number with paired bars — vendor self-report stacked
                    over firm-reviewed average, proportional to a 0-100 scale,
                    tinted green/red/neutral per the row's delta direction. The
                    numeric delta stays as a smaller right-aligned label. */}
                <div className="w-full md:w-[260px]" data-testid="delta-paired-bars">
                  <div data-testid="delta-bar-vendor">
                    <div className="flex items-baseline justify-between text-[11px] text-[var(--shell-muted)]">
                      <span>Vendor</span>
                      <span className="font-semibold tabular-nums text-[var(--shell-ink)]">
                        {row.vendorSelfReported === null ? "—" : row.vendorSelfReported}
                      </span>
                    </div>
                    <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-[var(--shell-panel-soft)]">
                      <div
                        className={`h-full rounded-full ${pairedBarFillClass(vendorBarTone(row))}`}
                        style={{ width: `${clampPct(row.vendorSelfReported)}%` }}
                        data-tone={vendorBarTone(row)}
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                  <div className="mt-2" data-testid="delta-bar-firm">
                    <div className="flex items-baseline justify-between text-[11px] text-[var(--shell-muted)]">
                      <span>Firm</span>
                      <span className="font-semibold tabular-nums text-[var(--shell-ink)]">
                        {row.firmReviewedAverage === null ? "—" : row.firmReviewedAverage}
                      </span>
                    </div>
                    <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-[var(--shell-panel-soft)]">
                      <div
                        className={`h-full rounded-full ${pairedBarFillClass(firmBarTone(row))}`}
                        style={{ width: `${clampPct(row.firmReviewedAverage)}%` }}
                        data-tone={firmBarTone(row)}
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                  <div
                    className={`mt-2 text-right text-sm font-semibold tabular-nums ${bigNumberColorClass(row)}`}
                    data-testid="delta-bar-value"
                  >
                    {bigNumber(row)}
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex flex-wrap items-baseline gap-3">
                    <div className="text-sm font-medium text-[var(--shell-ink)]">
                      {bigNumberLabel(row)}
                    </div>
                    {row.isHotDivergence ? (
                      <span
                        className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-orange)]"
                        data-testid="hot-divergence-flag"
                      >
                        Hot divergence
                      </span>
                    ) : null}
                  </div>
                  {row.delta === null ? (
                    <div
                      className="text-xs leading-5 text-[var(--shell-muted)]"
                      data-testid="delta-row-awaiting-helper"
                    >
                      {AWAITING_REVIEW_HELPER}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div
        className="mt-10 border-t border-[var(--shell-border)] pt-5 text-xs leading-6 text-[var(--shell-muted)]"
        data-testid="self-vs-market-methodology-footer"
      >
        Based on responses from {data.firmCount} {firmLabel} in your network · last refreshed {refreshedDate} · {rows.length} product{rows.length === 1 ? "" : "s"} compared · hot-divergence threshold ≥10 points · scoring methodology: see Section 2 above.
      </div>

    </section>
  );
}
