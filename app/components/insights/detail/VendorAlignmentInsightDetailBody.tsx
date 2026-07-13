import RankedBars from "@/app/components/charts/RankedBars";
import ScoreLockup from "@/app/components/charts/ScoreLockup";
import {
  buildVendorAlignmentPlainLanguage,
  readVendorAlignmentInsightHeadline,
  type VendorAlignmentInsightReport,
} from "@/lib/vendorAlignmentInsightEngine";

/**
 * The COMPLETE vendor-alignment Pro insight body — headline number, colored
 * firm-side module + capability evidence bars, and the "what this means for your
 * positioning" readout. Block 12a: rendered BOTH on the detail route AND inline
 * when a face card expands, so the inline expansion is the full insight.
 */
export default function VendorAlignmentInsightDetailBody({
  report,
}: {
  report: VendorAlignmentInsightReport;
}) {
  const headline = readVendorAlignmentInsightHeadline(report);
  const scoredModules = report.contributingModules
    .filter((module) => typeof module.averageScore === "number")
    .sort((left, right) => (right.averageScore ?? 0) - (left.averageScore ?? 0));
  const scoredCapabilities = report.contributingCapabilities
    .filter((capability) => typeof capability.averageScore === "number")
    .sort((left, right) => (right.averageScore ?? 0) - (left.averageScore ?? 0));
  const plainLanguage = buildVendorAlignmentPlainLanguage(report);

  if (report.locked || headline.displayValue === "—" || scoredModules.length === 0) {
    // No chart-grade evidence yet — keep the readout honest with the current-state
    // summary rather than an empty pane.
    return (
      <section className="pat-card p-6">
        <div className="pat-label">Current-state readout</div>
        <p className="mt-3 text-sm leading-6 text-[var(--shell-ink)]">{report.currentStateSummary}</p>
      </section>
    );
  }

  return (
    <>
      <section className="pat-card p-6">
        <div className="grid gap-8 lg:grid-cols-2">
          <ScoreLockup
            label={headline.caption}
            score={headline.score}
            displayValue={headline.displayValue}
            suffix={headline.suffix}
            showBand={headline.showBand}
            context={`This insight's headline signal · ${report.submissionCount} module submission${report.submissionCount === 1 ? "" : "s"} · current-state evidence only`}
          />
          <div className="space-y-6">
            <div>
              <div className="pat-label">Firm-side signal by area · strongest to softest</div>
              <div className="mt-3">
                <RankedBars
                  title="Aggregated firm module signal behind this insight, ranked strongest to softest"
                  items={scoredModules.map((module) => ({
                    key: module.key,
                    label: module.title,
                    value: module.averageScore,
                  }))}
                  colorByBand
                />
              </div>
            </div>
            {scoredCapabilities.length ? (
              <div>
                <div className="pat-label">Supporting capability signal</div>
                <div className="mt-3">
                  <RankedBars
                    title="Aggregated firm capability signal supporting this insight"
                    items={scoredCapabilities.map((capability) => ({
                      key: capability.key,
                      label: capability.title,
                      value: capability.averageScore,
                    }))}
                    colorByBand
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>
      {plainLanguage ? (
        <section className="pat-card p-6">
          <div className="pat-label">What this means for your positioning</div>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--shell-ink)]">{plainLanguage.summary}</p>
        </section>
      ) : null}
    </>
  );
}
