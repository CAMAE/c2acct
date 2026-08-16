import ScoreLockup from "@/app/components/charts/ScoreLockup";
import RankedBars from "@/app/components/charts/RankedBars";
import ExecutiveNarrative from "@/app/components/admin/reports/ExecutiveNarrative";
import ReportPrintHeader from "@/app/components/admin/reports/ReportPrintHeader";
import { getPlatformReportData } from "@/lib/adminPlatformPicture";
import { buildReportNarrative } from "@/lib/reportNarrative";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Ecosystem Summary Report | Patalign",
};

export default async function EcosystemSummaryPrintPage() {
  const { picture, firmLeague, hotDivergences } = await getPlatformReportData();
  // The narrative input is exactly the computed payload rendered below —
  // never credentials, emails, or env.
  const narrative = await buildReportNarrative({
    reportKey: "ecosystem-summary",
    reportTitle: "Ecosystem summary",
    payload: { picture, firmLeague, hotDivergences },
  });

  return (
    <div className="space-y-8">
      <ReportPrintHeader
        title="Ecosystem summary"
        description="Platform-wide current-state readout: organization counts, completed assessment evidence, the firm alignment league table, and products with hot vendor/firm divergence. Current-state evidence only — no benchmarks or forecasts."
        backHref="/admin/reports"
        backLabel="Back to report catalog"
      />

      <ExecutiveNarrative narrative={narrative} />

      <section className="pat-card p-6 print:break-inside-avoid">
        <h2 className="pat-label">Platform counts</h2>
        <div className="mt-5 grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
          <ScoreLockup label="Firms" score={null} displayValue={String(picture.firmCount)} context="Firm organizations" />
          <ScoreLockup label="Vendors" score={null} displayValue={String(picture.vendorCount)} context="Vendor organizations" />
          <ScoreLockup
            label="Firm module submissions"
            score={null}
            displayValue={String(picture.firmModuleSubmissionCount)}
            context="Final alignment-module submissions"
          />
          <ScoreLockup
            label="Product assessments"
            score={null}
            displayValue={String(picture.productAssessmentCount)}
            context="Final vendor self-assessments and firm product reviews"
          />
          <ScoreLockup
            label="Avg alignment index"
            score={picture.averageAlignmentIndex}
            context={`Across ${picture.scoredFirmCount} scored firm${picture.scoredFirmCount === 1 ? "" : "s"}`}
          />
          <ScoreLockup
            label="Hot divergences"
            score={null}
            displayValue={String(picture.hotDivergenceCount)}
            context="Products with a >10-pt vendor/firm gap"
          />
        </div>
      </section>

      <section className="pat-card p-6">
        <h2 className="pat-label">Firm league table · needs attention first</h2>
        {firmLeague.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--shell-muted)]">No scored firm evidence yet.</p>
        ) : (
          <div className="mt-4">
            <RankedBars
              title="All scored firms ranked by alignment index, lowest first"
              items={firmLeague.map((row) => ({
                key: row.companyId,
                label: row.companyName,
                value: row.alignmentIndex,
                meta: `${row.scoredModuleCount}/5 modules`,
              }))}
              colorByBand
            />
          </div>
        )}
      </section>

      <section className="pat-card p-6 print:break-inside-avoid">
        <h2 className="pat-label">Hot divergences · widest gap first</h2>
        {hotDivergences.length === 0 ? (
          <p className="mt-4 text-sm text-[var(--shell-muted)]">
            No product currently shows a vendor/firm gap above 10 points.
          </p>
        ) : (
          <table className="mt-4 w-full text-left text-sm">
            <thead>
              <tr className="text-xs font-semibold text-[var(--shell-muted)]">
                <th className="pb-2 pr-3">Product</th>
                <th className="pb-2 pr-3">Vendor</th>
                <th className="pb-2 pr-3 text-right">Self-reported</th>
                <th className="pb-2 pr-3 text-right">Firm-reviewed</th>
                <th className="pb-2 pr-3 text-right">Gap</th>
                <th className="pb-2 text-right">Reviews</th>
              </tr>
            </thead>
            <tbody>
              {hotDivergences.map((row) => (
                <tr key={row.productId} className="border-t border-[var(--shell-border)]">
                  <td className="py-2 pr-3 font-medium text-[var(--shell-ink)]">{row.productName}</td>
                  <td className="py-2 pr-3 text-[var(--shell-muted)]">{row.vendorName}</td>
                  <td className="pat-stat-number py-2 pr-3 text-right">{row.vendorScore}%</td>
                  <td className="pat-stat-number py-2 pr-3 text-right">{row.firmAverage}%</td>
                  <td className="pat-stat-number py-2 pr-3 text-right">{row.gap} pts</td>
                  <td className="pat-stat-number py-2 text-right">{row.reviewCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
