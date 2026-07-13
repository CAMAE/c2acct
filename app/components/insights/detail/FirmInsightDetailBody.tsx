import ChartEmptyState from "@/app/components/charts/ChartEmptyState";
import ProgressMeter from "@/app/components/charts/ProgressMeter";
import RankedBars from "@/app/components/charts/RankedBars";
import ScoreLockup from "@/app/components/charts/ScoreLockup";
import {
  buildFirmInsightPlainLanguage,
  readFirmInsightHeadline,
  type FirmInsightReport,
} from "@/lib/firmInsightEngine";
import { FIRM_TIER1_INSIGHT_DEFINITIONS } from "@/lib/firmPat";

type FirmTier1InsightKey = (typeof FIRM_TIER1_INSIGHT_DEFINITIONS)[number]["key"];

/**
 * The COMPLETE firm Pro insight body — headline number, module-completion meter,
 * colored module + capability evidence bars, and the "what this means" readout.
 * Block 12a: this is the single source rendered BOTH on the /firm/insights/[key]
 * detail route AND inline when a face card expands, so the inline expansion is
 * the full insight (not a text-only middle state).
 */
export default function FirmInsightDetailBody({
  report,
  insightKey,
}: {
  report: FirmInsightReport;
  insightKey: string;
}) {
  const headline = readFirmInsightHeadline(insightKey as FirmTier1InsightKey, report);
  const scoredModules = report.contributingModules
    .filter((module) => typeof module.score === "number")
    .sort((left, right) => (right.score ?? 0) - (left.score ?? 0));

  if (scoredModules.length === 0) {
    return (
      <section className="pat-card p-6">
        <ChartEmptyState
          variant="bars"
          message="This readout charts final module and capability scores. Complete the related alignment modules to open the visual evidence."
          ctaHref="/firm/alignment-assessment"
          ctaLabel="Open the alignment assessment"
        />
      </section>
    );
  }

  const latestEvidenceDate = report.latestUpdatedAt
    ? report.latestUpdatedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : null;
  const capThresholds = [
    ...new Set(report.contributingCapabilities.map((capability) => capability.threshold)),
  ].sort((left, right) => left - right);
  const capBarLine =
    capThresholds.length === 1 ? { threshold: capThresholds[0], thresholdLabel: `${capThresholds[0]}% bar` } : {};
  const capBarTitle =
    capThresholds.length === 1
      ? `Capability scores behind this insight versus the ${capThresholds[0]}% bar`
      : capThresholds.length > 1
        ? `Capability scores behind this insight versus each capability's bar (${capThresholds[0]}–${capThresholds[capThresholds.length - 1]}%)`
        : "Capability scores behind this insight";
  const plainLanguage = buildFirmInsightPlainLanguage(report);

  return (
    <>
      <section className="pat-card p-6">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <ScoreLockup
              label={headline.caption}
              score={headline.score}
              displayValue={headline.displayValue}
              suffix={headline.suffix}
              showBand={headline.showBand}
              context={`This insight's headline signal${latestEvidenceDate ? ` · updated ${latestEvidenceDate}` : ""}`}
            />
            <div className="mt-8">
              <div className="pat-label">Current limits</div>
              <div className="mt-3">
                <ProgressMeter
                  completed={scoredModules.length}
                  total={report.contributingModules.length}
                  unitLabel="relevant modules complete"
                  title="Module completion behind this insight"
                  chips={report.contributingModules.map((module) => ({
                    key: module.key,
                    label: module.title,
                    done: typeof module.score === "number",
                  }))}
                  context={report.confidenceCaveats[0]}
                />
              </div>
            </div>
          </div>
          <div className="space-y-6">
            <div>
              <div className="pat-label">Module evidence · strongest to under pressure</div>
              <div className="mt-3">
                <RankedBars
                  title="Module scores behind this insight, ranked strongest to weakest"
                  items={scoredModules.map((module) => ({
                    key: module.key,
                    label: module.title,
                    value: module.score,
                  }))}
                  colorByBand
                />
              </div>
            </div>
            {report.contributingCapabilities.length ? (
              <div>
                <div className="pat-label">Capability evidence</div>
                <div className="mt-3">
                  <RankedBars
                    title={capBarTitle}
                    items={[...report.contributingCapabilities]
                      .sort((left, right) => (right.score ?? -1) - (left.score ?? -1))
                      .map((capability) => ({
                        key: capability.key,
                        label: capability.title,
                        value: capability.score,
                        meta:
                          capability.score === null
                            ? "no score yet"
                            : `${capability.meetsThreshold ? "meets" : "below"} ${capability.threshold}% bar`,
                      }))}
                    colorByBand
                    {...capBarLine}
                  />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>
      {plainLanguage ? (
        <section className="pat-card p-6">
          <div className="pat-label">What this means for your firm</div>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-[var(--shell-ink)]">{plainLanguage.summary}</p>
          {plainLanguage.nextSteps.length ? (
            <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm leading-6 text-[var(--shell-muted)]">
              {plainLanguage.nextSteps.map((step) => (
                <li key={step}>{step}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
