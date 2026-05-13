import EmphasisToggle from "@/app/components/consultants/briefEdits/EmphasisToggle";
import PhrasingVariantPicker from "@/app/components/consultants/briefEdits/PhrasingVariantPicker";
import type { VendorBriefData, VendorBriefDeltaRow } from "@/lib/briefs";

const SECTION_KEY = "vendor.self-vs-market-delta" as const;
const EMPHASIS_TARGETS = ["row-0", "row-1", "row-2"];

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
  if (row.delta === null) return "No comparable score";
  if (row.deltaDirection === "neutral") return "Matched";
  if (row.deltaDirection === "vendor-higher") return "Vendor higher";
  if (row.deltaDirection === "firm-higher") return "Firms higher";
  return "—";
}

function bigNumberColorClass(row: VendorBriefDeltaRow): string {
  if (row.delta === null) return "text-[var(--shell-muted)]";
  if (row.isHotDivergence) return "text-[var(--brand-orange)]";
  if (row.deltaDirection === "neutral") return "text-[var(--shell-muted)]";
  return "text-[var(--brand-c2-blue)]";
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
  const variants = data.editVariants[SECTION_KEY] ?? [];
  const activeVariantId = data.editChoices.variants[SECTION_KEY];
  const activeEmphasis = data.editChoices.emphasis[SECTION_KEY] ?? [];
  const firmLabel = data.firmCount === 1 ? "firm" : "firms";
  const refreshedDate = formatGeneratedDate(data.generatedAt);
  const actionTitle = actionTitleFromDelta(rows, data.vendorCompanyName);

  return (
    <section
      className="rounded-[26px] border border-[var(--shell-border)] bg-[var(--shell-panel)] p-8"
      data-testid="self-vs-market-delta"
    >
      <div className="pat-label">Section 4 · Positioning visual</div>

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
                <div
                  className={`text-6xl font-bold tabular-nums tracking-tight ${bigNumberColorClass(row)}`}
                >
                  {bigNumber(row)}
                </div>
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
              </div>
            );
          })}
        </div>
      )}

      <div
        className="mt-10 border-t border-[var(--shell-border)] pt-5 text-xs leading-6 text-[var(--shell-muted)]"
        data-testid="self-vs-market-methodology-footer"
      >
        Based on responses from {data.firmCount} {firmLabel} in your network · last refreshed {refreshedDate} · {rows.length} product{rows.length === 1 ? "" : "s"} compared · hot-divergence threshold ≥10 points · scoring methodology: see Section 3 (lands Day 22).
      </div>

      {variants.length > 0 || EMPHASIS_TARGETS.length > 0 ? (
        <div className="mt-4 space-y-3 border-t border-dashed border-[var(--shell-border)] pt-4">
          <div className="pat-label text-[10px]">Editorial controls</div>
          {variants.length > 0 ? (
            <PhrasingVariantPicker
              briefKind="vendor"
              briefId={data.vendorCompanyId}
              ecosystemId={data.ecosystemId}
              sectionKey={SECTION_KEY}
              variants={variants}
              activeVariantId={activeVariantId}
            />
          ) : null}
          <EmphasisToggle
            briefKind="vendor"
            briefId={data.vendorCompanyId}
            ecosystemId={data.ecosystemId}
            sectionKey={SECTION_KEY}
            targetElementIds={EMPHASIS_TARGETS}
            activeEmphasisIds={activeEmphasis}
          />
        </div>
      ) : null}
    </section>
  );
}
