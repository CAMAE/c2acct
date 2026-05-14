import type { VendorBriefData } from "@/lib/briefs";

function formatGeneratedDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toISOString().slice(0, 10);
}

export default function MarketContext({ data }: { data: VendorBriefData }) {
  const firmLabel = data.firmCount === 1 ? "firm" : "firms";
  const refreshedDate = formatGeneratedDate(data.generatedAt);

  return (
    <section
      id="section-2-market-context"
      className="scroll-mt-8 rounded-[26px] border border-[var(--shell-border)] bg-[var(--shell-panel)] p-8"
      data-testid="market-context"
    >
      <div className="pat-label">Section 2 · Market context</div>

      <h2
        className="mt-4 font-semibold tracking-tight text-[var(--shell-ink)]"
        style={{ fontSize: "var(--pat-hero-title-size)", lineHeight: 1.15 }}
      >
        {data.productCount === 0
          ? `${data.vendorCompanyName} has not yet published a product catalog for ${data.ecosystemName}'s ${data.firmCount} ${firmLabel}.`
          : `${data.vendorCompanyName} serves ${data.ecosystemName}'s ${data.firmCount} ${firmLabel} with ${data.productCount} reviewed ${data.productCount === 1 ? "product" : "products"}.`}
      </h2>

      <p className="mt-6 text-base leading-7 text-[var(--shell-ink)]">
        Vendor performance in this network is evaluated against firm-side stack maturity, integration depth, and the operational fit revealed by capability-level scoring. This brief synthesizes responses from the firms in your assigned ecosystem and the vendor&apos;s own self-assessment to surface where {data.vendorCompanyName} fits the network and where the network challenges it.
      </p>

      <p className="mt-4 text-base leading-7 text-[var(--shell-muted)]">
        Use Section 4 (Positioning Visual) to spot the headline divergences at a glance, Section 6 (Capability Comparison) for the scorecard view across products, and Section 7 (Action Roadmap) for the near-term commitments aggregated from firm-side briefings.
      </p>

      <div
        className="mt-10 border-t border-[var(--shell-border)] pt-5 text-xs leading-6 text-[var(--shell-muted)]"
        data-testid="market-context-methodology-footer"
      >
        Based on responses from {data.firmCount} {firmLabel} in your network · last refreshed {refreshedDate} · category framing applies network-wide · scoring methodology: see Section 3 below.
      </div>
    </section>
  );
}
