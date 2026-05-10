import type { VendorBriefData } from "@/lib/briefs";

export default function VendorBriefExecutiveSummary({ data }: { data: VendorBriefData }) {
  const { executiveSummary } = data;
  return (
    <section
      className="rounded-[26px] border border-[var(--shell-border)] bg-[var(--shell-panel)] p-6"
      data-testid="vendor-brief-executive-summary"
    >
      <div className="pat-label">Executive summary</div>
      <h2
        className="mt-3 font-semibold tracking-tight text-[var(--shell-ink)]"
        style={{ fontSize: "var(--pat-hero-title-size)" }}
      >
        {executiveSummary.headline}
      </h2>
      {executiveSummary.body.length > 0 ? (
        <div className="mt-5 space-y-3">
          {executiveSummary.body.map((paragraph, index) => (
            <p
              key={index}
              className="text-base leading-7 text-[var(--shell-ink)]"
              data-testid="exec-summary-paragraph"
            >
              {paragraph}
            </p>
          ))}
        </div>
      ) : null}
      <div className="mt-5 rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] px-4 py-3 text-sm leading-6 text-[var(--shell-muted)]">
        {executiveSummary.confidenceCallout}
      </div>
    </section>
  );
}
