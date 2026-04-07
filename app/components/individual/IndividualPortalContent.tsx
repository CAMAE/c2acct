import Link from "next/link";
import MeetPatContent from "@/app/components/pat/MeetPatContent";
import type { PortalSurface } from "@/lib/portalVisibility";

export const individualWorkspaceCards: PortalSurface[] = [
  {
    id: "individual-alignment-assessment",
    title: "Alignment Assessment",
    description: "Open the live person-level PAT alignment assessment and carry the saved signal into individual insight visibility.",
    href: "/user/alignment-assessment",
    audience: ["individual"],
    section: "operate",
    availability: "enabled",
  },
  {
    id: "individual-product-assessment",
    title: "Product Assessment",
    description: "Open the staged individual product-assessment route that shows what PAT already has versus what still blocks truthful person-level product review.",
    href: "/user/product-assessment",
    audience: ["individual"],
    section: "operate",
    availability: "enabled",
  },
  {
    id: "individual-insights",
    title: "Insights",
    description: "Review the individual-facing insight route structure and Pro membership / Elite membership PAT framing.",
    href: "/user/insights",
    audience: ["individual"],
    section: "operate",
    availability: "enabled",
  },
];

export const individualHelpCards = [
  {
    title: "Alignment Assessment",
    what: "The live home for the person-level PAT alignment assessment.",
    why: "Individuals need a clean entry into their own PAT signal, not only firm or vendor views.",
    how: "Open it to use the existing PAT survey runtime and carry real person-level signal into the individual insight layer.",
    href: "/user/alignment-assessment",
  },
  {
    title: "Product Assessment",
    what: "The staged route for future person-level product review and fit signal.",
    why: "Individual experience with products is a distinct PAT layer, but PAT should not fake a live product runtime before the person-to-product plumbing actually exists.",
    how: "Use it to review the real readiness state now: person subject support is live, shared product plumbing exists, and the missing individual submit and insight-consumption path are called out explicitly.",
    href: "/user/product-assessment",
  },
  {
    title: "Insights",
    what: "The individual-facing PAT insight route with Pro membership and locked Elite membership presentation.",
    why: "It shows how person-native insight will be framed when the deeper signal path arrives.",
    how: "Open the route to review the initial information architecture and locked-card treatment.",
    href: "/user/insights",
  },
  {
    title: "Profile",
    what: "The clean scaffold for future individual PAT profile detail.",
    why: "The route needs to exist now so the next phase has a stable destination.",
    how: "Use it to review the basic structure and signed-in context presentation.",
    href: "/user/profile",
  },
  {
    title: "Help",
    what: "A simple explainer for the individual homepage cards.",
    why: "It keeps the individual scaffold understandable while the deeper workflows are still being built.",
    how: "Use it as the lightweight guide to the current individual PAT route set.",
    href: "/user/help",
  },
] as const;

export function IndividualMeetPatContent() {
  return <MeetPatContent />;
}

type IndividualHelpInlineContentProps = {
  topic?: string;
};

function renderIndividualHelpCard(card: (typeof individualHelpCards)[number]) {
  return (
    <div key={card.title} className="pat-card p-6">
      <div className="text-xl font-semibold text-[var(--shell-ink)]">{card.title}</div>
      <div className="mt-4 grid gap-3 text-sm leading-6 text-[var(--shell-muted)]">
        <div>
          <span className="font-semibold text-[var(--shell-ink)]">What it is:</span> {card.what}
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

export function IndividualHelpInlineContent({
  topic,
}: IndividualHelpInlineContentProps = {}) {
  const scopedCard =
    topic === "product-assessment"
      ? individualHelpCards.find((card) => card.title === "Product Assessment")
      : undefined;
  const visibleCards = scopedCard ? [scopedCard] : individualHelpCards;
  const supportingCards = scopedCard
    ? individualHelpCards.filter((card) => card.title !== scopedCard.title)
    : [];

  return (
    <section className="space-y-6">
      <section className="pat-card p-8">
        <div className="pat-label">Individual help</div>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--shell-ink)]">
          {scopedCard ? "How individual product assessment is staged" : "What each individual page does"}
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          {scopedCard
            ? "This scoped help view focuses on the current individual product-assessment truth: person subjects and the shared product model exist, but PAT does not yet have a live individual submit path, product selection contract, or person-level product insight consumer."
            : "This help view explains the current individual PAT route set in plain language so the staged person-native flow is easy to review without pretending deeper product behavior already exists."}
        </p>
      </section>

      <section className={`grid gap-5 ${scopedCard ? "md:grid-cols-1" : "md:grid-cols-2"}`}>
        {visibleCards.map((card) => renderIndividualHelpCard(card))}
      </section>

      {scopedCard ? (
        <section className="pat-card p-6">
          <div className="pat-label">Next step</div>
          <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
            Return to the individual product-assessment route to review the staged readiness map, or open the live individual alignment flow if you need person-native PAT signal today.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="pat-button-primary" href="/user/product-assessment">
              Back to product assessment
            </Link>
            <Link className="pat-button-secondary" href="/user/help">
              Review all individual help
            </Link>
          </div>
        </section>
      ) : null}

      {supportingCards.length > 0 ? (
        <section className="space-y-4">
          <div>
            <h3 className="text-2xl font-semibold text-[var(--shell-ink)]">Other individual help</h3>
            <p className="mt-1 text-sm leading-6 text-[var(--shell-muted)]">
              The other individual surfaces remain available while the product-assessment path stays staged.
            </p>
          </div>
          <section className="grid gap-5 md:grid-cols-2">
            {supportingCards.map((card) => renderIndividualHelpCard(card))}
          </section>
        </section>
      ) : null}
    </section>
  );
}
