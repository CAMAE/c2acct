import EmphasisToggle from "@/app/components/consultants/briefEdits/EmphasisToggle";
import PhrasingVariantPicker from "@/app/components/consultants/briefEdits/PhrasingVariantPicker";
import type { VendorBriefData } from "@/lib/briefs";

const SECTION_KEY = "vendor.executive-summary" as const;
const EMPHASIS_TARGETS = ["headline", "confidence-callout"];

export default function VendorBriefExecutiveSummary({ data }: { data: VendorBriefData }) {
  const { executiveSummary } = data;
  const variants = data.editVariants[SECTION_KEY] ?? [];
  const activeVariantId = data.editChoices.variants[SECTION_KEY];
  const activeEmphasis = data.editChoices.emphasis[SECTION_KEY] ?? [];

  return (
    <section
      className="rounded-[26px] border border-[var(--shell-border)] bg-[var(--shell-panel)] p-6"
      data-testid="vendor-brief-executive-summary"
    >
      <div className="pat-label">Executive summary</div>
      <h2
        className="mt-3 font-semibold tracking-tight text-[var(--shell-ink)]"
        style={{ fontSize: "var(--pat-hero-title-size)" }}
        data-emphasis-id="headline"
        data-emphasis-active={activeEmphasis.includes("headline") ? "true" : "false"}
      >
        {executiveSummary.headline}
      </h2>
      {variants.length > 0 ? (
        <div className="mt-4">
          <PhrasingVariantPicker
            briefKind="vendor"
            briefId={data.vendorCompanyId}
            ecosystemId={data.ecosystemId}
            sectionKey={SECTION_KEY}
            variants={variants}
            activeVariantId={activeVariantId}
          />
        </div>
      ) : null}
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
      <div
        className="mt-5 rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] px-4 py-3 text-sm leading-6 text-[var(--shell-muted)]"
        data-emphasis-id="confidence-callout"
        data-emphasis-active={activeEmphasis.includes("confidence-callout") ? "true" : "false"}
      >
        {executiveSummary.confidenceCallout}
      </div>
      <div className="mt-4">
        <EmphasisToggle
          briefKind="vendor"
          briefId={data.vendorCompanyId}
          ecosystemId={data.ecosystemId}
          sectionKey={SECTION_KEY}
          targetElementIds={EMPHASIS_TARGETS}
          activeEmphasisIds={activeEmphasis}
        />
      </div>
    </section>
  );
}
