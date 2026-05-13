import EmphasisToggle from "@/app/components/consultants/briefEdits/EmphasisToggle";
import PhrasingVariantPicker from "@/app/components/consultants/briefEdits/PhrasingVariantPicker";
import type { VendorBriefData } from "@/lib/briefs";

const SECTION_KEY = "vendor.executive-summary" as const;
const EMPHASIS_TARGETS = ["headline", "confidence-callout"];

function formatGeneratedDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 10);
}

export default function VendorBriefExecutiveSummary({ data }: { data: VendorBriefData }) {
  const { executiveSummary } = data;
  const variants = data.editVariants[SECTION_KEY] ?? [];
  const activeVariantId = data.editChoices.variants[SECTION_KEY];
  const activeEmphasis = data.editChoices.emphasis[SECTION_KEY] ?? [];
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
        data-emphasis-id="headline"
        data-emphasis-active={activeEmphasis.includes("headline") ? "true" : "false"}
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
        <span
          data-emphasis-id="confidence-callout"
          data-emphasis-active={activeEmphasis.includes("confidence-callout") ? "true" : "false"}
        >
          Based on responses from {data.firmCount} {firmLabel} in your network · last refreshed {refreshedDate} · {executiveSummary.confidenceCallout} · scoring methodology: see Section 3 (lands Day 22).
        </span>
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
