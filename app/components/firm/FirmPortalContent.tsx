import Link from "next/link";
import MeetPatContent from "@/app/components/pat/MeetPatContent";
import type { PortalSurface } from "@/lib/portalVisibility";
import { FIRM_HELP_CARDS } from "@/lib/firmPat";

export const firmWorkspaceCards: PortalSurface[] = [
  {
    id: "firm-alignment-assessment",
    title: "Alignment Assessment",
    description: "Open the 5-module, 100-question firm alignment system and track progress by module.",
    href: "/firm/alignment-assessment",
    audience: ["firm"],
    section: "operate",
    availability: "enabled",
  },
  {
    id: "firm-product-assessments",
    title: "Product Assessment",
    description: "Review vendor products through utility-aligned firm product assessments that feed vendor product insight.",
    href: "/firm/product-assessments",
    audience: ["firm"],
    section: "operate",
    availability: "enabled",
  },
  {
    id: "firm-insights",
    title: "Insights",
    description: "Open firm-facing Pro membership and Elite membership PAT insights based on current firm and product alignment signal.",
    href: "/firm/insights",
    audience: ["firm"],
    section: "operate",
    availability: "enabled",
  },
];

export const firmAdminHelpCards = [
  {
    title: "Firm profile",
    what: "The editable firm record for company identity, contact details, address, payment notes, and descriptive context.",
    when: "Use it whenever the firm profile changes or when you need the admin surface to reflect the current operating identity cleanly.",
    why: "It keeps the PAT firm record accurate now and keeps the future sync contract honest for later external integration work.",
  },
  {
    title: "User Insight",
    what: "The management path for reviewing invited users, current participation, and firm-level visibility into user progress.",
    when: "Use it when firm leaders need to monitor adoption, open the user insight surface, or review who is active under the firm umbrella.",
    why: "It keeps people-level PAT activity connected to the firm context instead of leaving user oversight fragmented.",
  },
  {
    title: "Invite or update user",
    what: "The simple user-entry tool for adding or updating firm members and their current PAT role.",
    when: "Use it when a new user needs access or an existing user needs a role adjustment.",
    why: "It gives the firm a clean operating path for keeping access current without turning admin into a heavy console.",
  },
  {
    title: "Future sync contract",
    what: "The integration-ready contract view that shows the current firm data shape available for future c2acct.com / six-site connection work.",
    when: "Use it when validating field coverage, reviewing external contract shape, or preparing future integration mapping.",
    why: "It keeps the integration boundary explicit and truthful without pretending a live sync already exists.",
  },
] as const;

export function FirmMeetPatContent() {
  return <MeetPatContent />;
}

export function FirmAdminInlineContent() {
  return (
    <section className="space-y-6">
      <section className="pat-card p-8">
        <div className="pat-label">Firm admin</div>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--shell-ink)]">
          Profile and management without operator clutter
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          Keep firm profile management, user oversight, and future sync readiness together in one restrained PAT admin surface.
        </p>
      </section>

      <section className="pat-card p-6">
        <div className="pat-label">Admin help</div>
        <div className="mt-4 grid gap-4 xl:grid-cols-2">
          {firmAdminHelpCards.map((card) => (
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

type FirmHelpInlineContentProps = {
  topic?: string;
  productId?: string;
  productName?: string;
};

function renderFirmHelpCard(card: (typeof FIRM_HELP_CARDS)[number]) {
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

export function FirmHelpInlineContent({
  topic,
  productId,
  productName,
}: FirmHelpInlineContentProps = {}) {
  const workspaceHelpCards = FIRM_HELP_CARDS.slice(0, 3);
  const scopedCard =
    topic === "product-assessment"
      ? workspaceHelpCards.find((card) => card.title === "Product Assessments")
      : undefined;
  const visibleCards = scopedCard ? [scopedCard] : workspaceHelpCards;
  const supportingCards = scopedCard
    ? workspaceHelpCards.filter((card) => card.title !== scopedCard.title)
    : [];
  const assessmentHref = productId ? `/firm/product-assessments/${productId}` : "/firm/product-assessments";

  return (
    <section className="space-y-6">
      <section className="pat-card p-8">
        <div className="pat-label">Firm help</div>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--shell-ink)]">
          {scopedCard ? "How firm product assessment works" : "What each firm page does"}
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          {scopedCard
            ? `This scoped help view stays inside the existing firm help route and focuses on the current firm product review flow${productName ? ` for ${productName}` : ""}: utility-scoped questions only, truthful current-state scoring, and the connection back to vendor product insight.`
            : "This help view maps the active firm PAT surfaces so leaders can understand what each one does and when to use it."}
        </p>
      </section>

      <section className={`grid gap-5 ${scopedCard ? "md:grid-cols-1 xl:grid-cols-1" : "md:grid-cols-2 xl:grid-cols-3"}`}>
        {visibleCards.map((card) => renderFirmHelpCard(card))}
      </section>

      {scopedCard ? (
        <section className="pat-card p-6">
          <div className="pat-label">Next step</div>
          <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
            Return to the current product review when you are ready to continue answering the utility-scoped firm questions.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link className="pat-button-primary" href={assessmentHref}>
              {productName ? `Back to ${productName}` : "Back to product assessment"}
            </Link>
            <Link className="pat-button-secondary" href="/firm/help">
              Review all firm help
            </Link>
          </div>
        </section>
      ) : null}

      {supportingCards.length > 0 ? (
        <section className="space-y-4">
          <div>
            <h3 className="text-2xl font-semibold text-[var(--shell-ink)]">Other firm help</h3>
            <p className="mt-1 text-sm leading-6 text-[var(--shell-muted)]">
              These adjacent firm help surfaces stay available while the current product review remains in progress.
            </p>
          </div>
          <section className="grid gap-5 md:grid-cols-2">
            {supportingCards.map((card) => renderFirmHelpCard(card))}
          </section>
        </section>
      ) : null}
    </section>
  );
}
