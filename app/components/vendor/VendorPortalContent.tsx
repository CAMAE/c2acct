import Link from "next/link";
import MeetPatContent from "@/app/components/pat/MeetPatContent";
import type { PortalSurface } from "@/lib/portalVisibility";

export const vendorWorkspaceCards: PortalSurface[] = [
  {
    id: "product-assessment",
    title: "Product Assessment",
    description: "Select a software product, declare the features it solves, and run the per-product PAT assessment.",
    href: "/vendor/product-assessment",
    audience: ["vendor"],
    section: "operate",
    availability: "enabled",
  },
  {
    id: "product-insight",
    title: "Product Insight",
    description: "Open the product intelligence catalog and review standalone product insight pages.",
    href: "/vendor/product-insight",
    audience: ["vendor"],
    section: "operate",
    availability: "enabled",
  },
  {
    id: "alignment-insights",
    title: "Alignment Insight",
    description: "Review Pro membership and Elite membership vendor alignment insight groups tied to firm alignment signal.",
    href: "/vendor/alignment-insights",
    audience: ["vendor"],
    section: "operate",
    availability: "enabled",
  },
  {
    // R5: entry point to the BattleCard. Filtered out in app/vendor/page.tsx
    // unless PAT_ENABLE_BATTLECARD is on.
    id: "vendor-battlecard",
    title: "BattleCard",
    description: "Rank the firms in your ecosystem by fit and see exactly where your product strengths close each firm's alignment gap.",
    href: "/vendor/battlecard",
    audience: ["vendor"],
    section: "operate",
    availability: "enabled",
  },
];

export const vendorHelpCards = [
  {
    title: "Product Assessment",
    what: "A per-product PAT assessment driven by declared feature coverage.",
    where: "Routes to the product list, then into a product-specific assessment page.",
    why: "Each product needs its own self-signal and cannot be buried under one generic vendor score.",
    how: "Choose a product, declare features, complete the scaled question bank, and submit.",
    href: "/vendor/product-assessment",
  },
  {
    title: "Product Insight",
    what: "A product intelligence catalog with one standalone intelligence page per product.",
    where: "Routes to the product insight catalog and then into a selected product intelligence page.",
    why: "Vendors need product-specific intelligence, not only broad vendor-level commentary.",
    how: "Open a product, review vendor self-signal, then see current Pro membership and locked Elite membership framing.",
    href: "/vendor/product-insight",
  },
  {
    title: "Alignment Insight",
    what: "Vendor-facing alignment insights tied to the current firm alignment layer.",
    where: "Routes to the vendor alignment insight catalog and then into detail pages.",
    why: "This connects vendor decision support back to actual firm assessment signal.",
    how: "Open the insight group, then inspect each detail page for what, why, and how to use it.",
    href: "/vendor/alignment-insights",
  },
] as const;

export const vendorAdminHelpCards = [
  {
    title: "Profile management",
    what: "The editable vendor record for company identity, contact details, payment notes, address, and descriptive profile context.",
    when: "Use it when vendor profile information changes or when the PAT record needs to stay ready for later sync work.",
    why: "It keeps the live PAT vendor record current and makes the external contract more useful without pretending a live sync exists.",
  },
  {
    title: "Product management",
    what: "The simple product-entry surface for adding software products that will feed vendor product assessment and insight workflows.",
    when: "Use it when a new product needs to be added or when product inventory needs to stay current before assessment work begins.",
    why: "It keeps vendor product intelligence tied to real products instead of abstract company-only signal.",
  },
  {
    title: "Future sync contract",
    what: "The integration-ready contract view showing the current vendor profile and product payload shape.",
    when: "Use it when reviewing field coverage, validating mapping shape, or preparing for later c2acct.com / six-site connection work.",
    why: "It keeps the adapter boundary explicit and professional without overstating current integration status.",
  },
] as const;

type VendorHelpInlineContentProps = {
  topic?: string;
  productId?: string;
  productName?: string;
};

export function VendorMeetPatContent() {
  return <MeetPatContent />;
}

export function VendorAdminInlineContent() {
  return (
    <section className="space-y-6">
      <section className="pat-card p-8">
        <div className="pat-label">Vendor admin</div>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--shell-ink)]">
          Simple admin and profile management
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          Keep vendor profile settings, product inventory, and future sync readiness together without turning the vendor workspace into a sprawling backend.
        </p>
      </section>

      <section className="pat-card p-6">
        <div className="pat-label">Admin help</div>
        <div className="mt-4 grid gap-4 xl:grid-cols-3">
          {vendorAdminHelpCards.map((card) => (
            <article
              key={card.title}
              className="rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-5"
            >
              <div className="text-lg font-semibold text-[var(--shell-ink)]">{card.title}</div>
              <div className="mt-3 space-y-2 text-sm leading-6 text-[var(--shell-muted)]">
                <div>
                  <span className="font-semibold text-[var(--shell-ink)]">What:</span> {card.what}
                </div>
                <div>
                  <span className="font-semibold text-[var(--shell-ink)]">When:</span> {card.when}
                </div>
                <div>
                  <span className="font-semibold text-[var(--shell-ink)]">Why:</span> {card.why}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}

function renderVendorHelpCard(card: (typeof vendorHelpCards)[number]) {
  return (
    <div key={card.title} className="pat-card p-6">
      <div className="text-xl font-semibold text-[var(--shell-ink)]">{card.title}</div>
      <div className="mt-4 grid gap-3 text-sm leading-6 text-[var(--shell-muted)]">
        <div>
          <span className="font-semibold text-[var(--shell-ink)]">What it is:</span> {card.what}
        </div>
        <div>
          <span className="font-semibold text-[var(--shell-ink)]">Where it goes:</span> {card.where}
        </div>
        <div>
          <span className="font-semibold text-[var(--shell-ink)]">Why it matters:</span> {card.why}
        </div>
        <div>
          <span className="font-semibold text-[var(--shell-ink)]">How to use it:</span> {card.how}
        </div>
      </div>
    </div>
  );
}

export function VendorHelpInlineContent({
  topic,
  productId,
  productName,
}: VendorHelpInlineContentProps = {}) {
  const scopedCard =
    topic === "product-assessment"
      ? vendorHelpCards.find((card) => card.title === "Product Assessment")
      : undefined;
  const visibleCards = scopedCard ? [scopedCard] : vendorHelpCards;
  const supportingCards = scopedCard
    ? vendorHelpCards.filter((card) => card.title !== scopedCard.title)
    : [];
  const assessmentHref = productId ? `/vendor/product-assessment/${productId}` : "/vendor/product-assessment";

  return (
    <section className="space-y-6">
      <section className="pat-card p-8">
        <div className="pat-label">Vendor help</div>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--shell-ink)]">
          {scopedCard ? "How vendor product assessment works" : "What each vendor page does"}
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          {scopedCard
            ? `This scoped help view stays inside the existing vendor help route and focuses on the per-product PAT assessment flow${productName ? ` for ${productName}` : ""}: the first-page feature declaration, the 10-question pacing, and what PAT expects before submission.`
            : "This help view explains each active vendor workspace surface in plain product language: what it is, where it goes, why it matters, and how to use it."}
        </p>
      </section>

      <section className={`grid gap-5 ${scopedCard ? "md:grid-cols-1 xl:grid-cols-1" : "md:grid-cols-2 xl:grid-cols-3"}`}>
        {visibleCards.map((card) => renderVendorHelpCard(card))}
      </section>

      {scopedCard ? (
        <section className="pat-card p-6">
          <div className="pat-label">Next step</div>
          <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
            Return to the current product assessment when you are ready to continue through the feature-scored pages and final open-ended responses.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="pat-button-primary" href={assessmentHref}>
              {productName ? `Back to ${productName}` : "Back to product assessment"}
            </Link>
            <Link className="pat-button-secondary" href="/vendor/help">
              Review all vendor help
            </Link>
          </div>
        </section>
      ) : null}

      {supportingCards.length > 0 ? (
        <section className="space-y-4">
          <div>
            <h3 className="text-2xl font-semibold text-[var(--shell-ink)]">Other vendor help</h3>
            <p className="mt-1 text-sm leading-6 text-[var(--shell-muted)]">
              These vendor help surfaces stay available if you need the adjacent PAT routes after finishing the product assessment.
            </p>
          </div>
          <section className="grid gap-5 md:grid-cols-2">
            {supportingCards.map((card) => renderVendorHelpCard(card))}
          </section>
        </section>
      ) : null}
    </section>
  );
}
