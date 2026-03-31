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
    description: "Open the individual product-review route scaffold tied to future person-native product signal.",
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
    what: "The future home for the person-level PAT alignment assessment.",
    why: "Individuals need a clean entry into their own PAT signal, not only firm or vendor views.",
    how: "This pass creates the route and homepage card so the next phase can attach the real assessment flow.",
    href: "/user/alignment-assessment",
  },
  {
    title: "Product Assessment",
    what: "The future route for person-level product review and fit signal.",
    why: "Individual experience with products is a distinct PAT layer and should not be collapsed into firm-only data.",
    how: "This pass establishes the route and keeps the structure reviewable without overbuilding the full workflow.",
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

export function IndividualHelpInlineContent() {
  return (
    <section className="space-y-6">
      <section className="pat-card p-8">
        <div className="pat-label">Individual help</div>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--shell-ink)]">
          What each individual page does
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          This help view explains the current individual PAT scaffold in plain language so the route set is easy to review before the full person-native flow is built.
        </p>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        {individualHelpCards.map((card) => (
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
        ))}
      </section>
    </section>
  );
}
