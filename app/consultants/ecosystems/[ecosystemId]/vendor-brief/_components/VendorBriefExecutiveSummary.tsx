import type { VendorBriefData } from "@/lib/briefs";

function formatGeneratedDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 10);
}

export default function VendorBriefExecutiveSummary({ data }: { data: VendorBriefData }) {
  const { executiveSummary } = data;
  const firmLabel = data.firmCount === 1 ? "firm" : "firms";
  const refreshedDate = formatGeneratedDate(data.generatedAt);

  return (
    <section
      id="section-1-executive-summary"
      className="scroll-mt-8 rounded-[26px] border border-[var(--shell-border)] bg-[var(--shell-panel)] p-8"
      data-testid="vendor-brief-executive-summary"
    >
      <div className="pat-label">Section 1 · Executive summary</div>

      <h2
        className="mt-4 font-semibold tracking-tight text-[var(--shell-ink)]"
        style={{ fontSize: "var(--pat-hero-title-size)", lineHeight: 1.15 }}
      >
        {executiveSummary.headline}
      </h2>

      {executiveSummary.body.length > 0 ? (
        <ul className="mt-8 space-y-5">
          {executiveSummary.body.map((paragraph, index) => (
            <li
              key={index}
              className="flex gap-4 text-2xl leading-snug text-[var(--shell-ink)]"
              data-testid="exec-summary-paragraph"
            >
              <span
                className="shrink-0 select-none text-[var(--brand-c2-blue)]"
                aria-hidden="true"
              >
                ·
              </span>
              <span>{paragraph}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <div
        className="mt-10 border-t border-[var(--shell-border)] pt-5 text-xs leading-6 text-[var(--shell-muted)]"
        data-testid="executive-summary-methodology-footer"
      >
        Based on responses from {data.firmCount} {firmLabel} in your network · last refreshed {refreshedDate} · {executiveSummary.confidenceCallout} · scoring methodology: see Section 2 below.
      </div>
    </section>
  );
}
