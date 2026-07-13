import DivergenceBar from "@/app/components/charts/DivergenceBar";
import RankedBars from "@/app/components/charts/RankedBars";
import ScoreLockup from "@/app/components/charts/ScoreLockup";
import {
  buildVendorProductGapCallout,
  buildVendorProductPlainLanguage,
  type VendorProductInsightRecord,
  type VendorProductInsightSnapshot,
} from "@/lib/vendorProductInsightEngine";

/**
 * The COMPLETE vendor product Pro insight body — vendor-vs-firm divergence bar,
 * colored self-reported section-signal bars, and the "what this means for your
 * product" readout. Block 12a: rendered BOTH on the product-insight detail route
 * AND inline when a product face card expands, so the inline expansion is the
 * full insight (product cards previously navigated away with no inline readout).
 */
export default function VendorProductInsightDetailBody({
  snapshot,
  record,
}: {
  snapshot: VendorProductInsightSnapshot;
  record: VendorProductInsightRecord | null;
}) {
  const vendorScore = snapshot.vendorSelfReported.latestScore;
  const firmScore = snapshot.firmReviewed.averageScore;

  if (vendorScore === null && firmScore === null) {
    return (
      <section className="pat-card p-6">
        <div className="pat-label">Current-state readout</div>
        <p className="mt-3 text-sm leading-6 text-[var(--shell-ink)]">
          {record?.currentStateSummary ?? snapshot.combinedCurrentPatReadout}
        </p>
      </section>
    );
  }

  const gapCallout = buildVendorProductGapCallout(snapshot);
  const plainLanguage = buildVendorProductPlainLanguage(snapshot, record);
  const sectionEvidence = (record?.vendorSectionEvidence ?? []).filter(
    (section) => section.averageScore !== null
  );

  return (
    <>
      <section className="pat-card p-6">
        <div className="grid gap-8 lg:grid-cols-2">
          <div>
            <div className="pat-label">Vendor story vs firm review</div>
            <div className="mt-4">
              {vendorScore !== null && firmScore !== null ? (
                <DivergenceBar
                  title={`${snapshot.product.name}: vendor self-reported vs firm-reviewed signal`}
                  a={{ label: "Vendor self-reported", value: vendorScore }}
                  b={{ label: "Firm-reviewed", value: firmScore }}
                  gapLabel={gapCallout.label}
                />
              ) : (
                <ScoreLockup
                  label={vendorScore !== null ? "Vendor self-reported signal" : "Firm-reviewed signal"}
                  score={vendorScore ?? firmScore}
                  context={
                    vendorScore !== null
                      ? "No firm-reviewed signal yet — the divergence view opens once the first firm review lands."
                      : "No vendor self-reported signal yet, so the divergence view cannot open."
                  }
                />
              )}
            </div>
          </div>
          {sectionEvidence.length ? (
            <div>
              <div className="pat-label">Self-reported section signal</div>
              <div className="mt-3">
                <RankedBars
                  title="Vendor self-reported section scores behind this insight, ranked strongest to softest"
                  items={[...sectionEvidence]
                    .sort((left, right) => (right.averageScore ?? 0) - (left.averageScore ?? 0))
                    .map((section) => ({
                      key: section.key,
                      label: section.title,
                      value: section.averageScore,
                    }))}
                  colorByBand
                />
              </div>
            </div>
          ) : null}
        </div>
      </section>
      {plainLanguage ? (
        <section className="pat-card p-6">
          <div className="pat-label">What this means for your product</div>
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
