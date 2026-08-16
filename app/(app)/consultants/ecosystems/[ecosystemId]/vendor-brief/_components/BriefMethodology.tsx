import type { VendorBriefData } from "@/lib/briefs";

export default function BriefMethodology({ data }: { data: VendorBriefData }) {
  const generated = new Date(data.generatedAt);
  const generatedLabel = Number.isNaN(generated.getTime())
    ? data.generatedAt
    : generated.toUTCString();

  return (
    <section
      className="rounded-[22px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-5"
      data-testid="brief-methodology"
    >
      <div className="pat-label">Methodology</div>
      <p className="mt-3 text-sm leading-6 text-[var(--shell-ink)]">
        This brief is engine-derived. No consultant interpretation has been applied at this stage.
      </p>
      <dl className="mt-4 space-y-2 text-xs text-[var(--shell-muted)]">
        <div>
          <dt className="inline font-semibold uppercase tracking-[0.18em]">Data sources:</dt>{" "}
          <dd className="inline">
            {data.methodology.dataSources.join(", ")}
          </dd>
        </div>
        <div>
          <dt className="inline font-semibold uppercase tracking-[0.18em]">Sample sizes:</dt>{" "}
          <dd className="inline">
            {data.methodology.sampleSizes.firmCount} firm
            {data.methodology.sampleSizes.firmCount === 1 ? "" : "s"} ·{" "}
            {data.methodology.sampleSizes.submissionCount} firm-side submission
            {data.methodology.sampleSizes.submissionCount === 1 ? "" : "s"} ·{" "}
            {data.methodology.sampleSizes.reviewCount} firm-side product review
            {data.methodology.sampleSizes.reviewCount === 1 ? "" : "s"}
          </dd>
        </div>
        <div>
          <dt className="inline font-semibold uppercase tracking-[0.18em]">Generated:</dt>{" "}
          <dd className="inline">{generatedLabel}</dd>
        </div>
      </dl>
    </section>
  );
}
