import type { VendorBriefData, VendorBriefDeltaRow } from "@/lib/briefs";

function formatScore(value: number | null): string {
  return value === null ? "--" : String(value);
}

function deltaLabel(row: VendorBriefDeltaRow): string {
  if (row.delta === null) return "No comparable score";
  const abs = Math.abs(row.delta);
  if (row.deltaDirection === "neutral") return "0 — matched";
  if (row.deltaDirection === "vendor-higher") return `↓ -${abs} (vendor higher)`;
  if (row.deltaDirection === "firm-higher") return `↑ +${abs} (firms higher)`;
  return "—";
}

function deltaBadgeClass(row: VendorBriefDeltaRow): string {
  if (row.isHotDivergence) {
    return "bg-[var(--brand-accent)] text-white";
  }
  if (row.deltaDirection === "no-signal") {
    return "border border-[var(--shell-border)] text-[var(--shell-muted)]";
  }
  if (row.deltaDirection === "neutral") {
    return "border border-[var(--shell-border)] text-[var(--shell-ink)]";
  }
  return "border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] text-[var(--shell-ink)]";
}

function barWidthPercent(value: number | null): number {
  if (value === null) return 0;
  return Math.max(0, Math.min(100, value));
}

export default function SelfVsMarketDelta({ data }: { data: VendorBriefData }) {
  const rows = data.selfVsMarketDelta;

  return (
    <section
      className="rounded-[26px] border border-[var(--shell-border)] bg-[var(--shell-panel)] p-6"
      data-testid="self-vs-market-delta"
    >
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div>
          <div className="pat-label">Self-vs-Market Delta</div>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--shell-ink)]">
            Vendor self-report vs ecosystem firm reviews
          </h2>
        </div>
        <div className="text-sm text-[var(--shell-muted)]">
          {rows.length} product{rows.length === 1 ? "" : "s"} · sorted by |delta|
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-[var(--shell-muted)]">
          No vendor products with completed self-assessment yet. Delta unlocks when the
          vendor finishes the product assessment.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.productId}
              data-testid="delta-row"
              data-product-id={row.productId}
              data-hot-divergence={row.isHotDivergence ? "1" : "0"}
              className="grid grid-cols-1 gap-3 rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-4 md:grid-cols-[1.2fr_1.8fr_1fr]"
            >
              <div>
                <div className="text-sm font-semibold text-[var(--shell-ink)]">
                  {row.productName}
                </div>
                <div className="mt-1 text-xs text-[var(--shell-muted)]">
                  {row.firmReviewCount} firm review{row.firmReviewCount === 1 ? "" : "s"}
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="w-16 shrink-0 text-xs uppercase tracking-[0.18em] text-[var(--shell-muted)]">
                    Vendor
                  </div>
                  <div
                    className="h-2 flex-1 overflow-hidden rounded-full bg-[rgba(6,54,116,0.08)]"
                    aria-hidden="true"
                  >
                    <div
                      className="h-full rounded-full bg-[var(--brand-accent)] opacity-40"
                      style={{ width: `${barWidthPercent(row.vendorSelfReported)}%` }}
                    />
                  </div>
                  <div className="w-10 shrink-0 text-right text-sm font-semibold text-[var(--shell-ink)]">
                    {formatScore(row.vendorSelfReported)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-16 shrink-0 text-xs uppercase tracking-[0.18em] text-[var(--shell-muted)]">
                    Firms
                  </div>
                  <div
                    className="h-2 flex-1 overflow-hidden rounded-full bg-[rgba(6,54,116,0.08)]"
                    aria-hidden="true"
                  >
                    <div
                      className="h-full rounded-full bg-[var(--brand-accent)]"
                      style={{ width: `${barWidthPercent(row.firmReviewedAverage)}%` }}
                    />
                  </div>
                  <div className="w-10 shrink-0 text-right text-sm font-semibold text-[var(--shell-ink)]">
                    {formatScore(row.firmReviewedAverage)}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-semibold ${deltaBadgeClass(row)}`}
                >
                  {deltaLabel(row)}
                </span>
                {row.isHotDivergence ? (
                  <span
                    className="inline-flex items-center rounded-md border border-[var(--brand-accent)] px-2 py-1 text-xs font-semibold text-[var(--brand-accent)]"
                    data-testid="hot-divergence-flag"
                  >
                    Hot divergence
                  </span>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
