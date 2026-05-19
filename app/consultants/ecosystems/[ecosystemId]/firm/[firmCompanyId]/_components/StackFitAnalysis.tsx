import type {
  FirmBriefData,
  FirmBriefStackFitRow,
  FirmBriefStackFitStatus,
} from "@/lib/firmBriefs";

const STATUS_LABEL: Record<FirmBriefStackFitStatus, string> = {
  strong: "Strong",
  aligned: "Aligned",
  gap: "Gap",
  "not-reviewed": "Not reviewed",
};

const STATUS_BADGE_CLASS: Record<FirmBriefStackFitStatus, string> = {
  strong: "bg-[var(--brand-c2-blue)] text-white",
  aligned: "border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] text-[var(--shell-ink)]",
  gap: "border border-[var(--brand-orange)] text-[var(--brand-orange)]",
  "not-reviewed": "border border-dashed border-[var(--shell-border)] text-[var(--shell-muted)]",
};

function formatScore(value: number | null): string {
  return value === null ? "--" : String(value);
}

function deltaLabel(row: FirmBriefStackFitRow): string {
  if (row.delta === null) return "—";
  if (row.delta === 0) return "0 — matched";
  if (row.delta > 0) return `↓ -${row.delta} firm lower`;
  return `↑ +${Math.abs(row.delta)} firm higher`;
}

// WS10-B Block B: row.delta is (vendor - firm). Positive = vendor over-
// promised (bad), negative = firms rate vendor above self-report (good).
function deltaColorClass(row: FirmBriefStackFitRow): string {
  if (row.delta === null) return "text-[var(--shell-muted)]";
  if (row.delta > 0) return "text-[var(--brand-orange)]";
  if (row.delta < 0) return "text-[var(--shell-positive)]";
  return "text-[var(--shell-ink)]";
}

export default function StackFitAnalysis({ data }: { data: FirmBriefData }) {
  const rows = data.stackFitAnalysis;
  const reviewedCount = rows.filter((row) => row.status !== "not-reviewed").length;

  return (
    <section
      className="rounded-[26px] border border-[var(--shell-border)] bg-[var(--shell-panel)] p-6"
      data-testid="stack-fit-analysis"
    >
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <div>
          <div className="pat-label">Stack fit</div>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-[var(--shell-ink)]">
            Your current vendor products
          </h2>
        </div>
        <div className="text-sm text-[var(--shell-muted)]">
          {reviewedCount} of {rows.length} reviewed
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="text-sm text-[var(--shell-muted)]">No vendor products in scope yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--shell-muted)]">
                <th className="pb-2 pr-3">Product</th>
                <th className="pb-2 pr-3">Category</th>
                <th className="pb-2 pr-3">Firm score</th>
                <th className="pb-2 pr-3">Vendor self-report</th>
                <th className="pb-2 pr-3">Delta</th>
                <th className="pb-2 pr-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.productId}
                  data-testid="stack-fit-row"
                  data-product-id={row.productId}
                  data-status={row.status}
                  data-hot-divergence={row.isHotDivergence ? "1" : "0"}
                  className="border-t border-[var(--shell-border)]"
                >
                  <td className="py-2 pr-3 font-medium text-[var(--shell-ink)]">
                    {row.productName}
                    <div className="text-xs text-[var(--shell-muted)]">{row.vendorName}</div>
                  </td>
                  <td className="py-2 pr-3 text-[var(--shell-muted)]">
                    {row.utilityLabels.length > 0 ? row.utilityLabels.join(", ") : "—"}
                  </td>
                  <td className="pat-stat-number py-2 pr-3">
                    {formatScore(row.firmReviewedScore)}
                  </td>
                  <td className="pat-stat-number py-2 pr-3">
                    {formatScore(row.vendorSelfReportedScore)}
                  </td>
                  <td className={`pat-stat-number py-2 pr-3 ${deltaColorClass(row)}`}>
                    {deltaLabel(row)}
                    {row.isHotDivergence ? (
                      <span className="ml-2 inline-flex items-center rounded-md border border-[var(--brand-orange)] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-[var(--brand-orange)]">
                        Hot
                      </span>
                    ) : null}
                  </td>
                  <td className="py-2 pr-3">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold ${STATUS_BADGE_CLASS[row.status]}`}
                    >
                      {STATUS_LABEL[row.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
