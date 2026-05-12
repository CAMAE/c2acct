import Link from "next/link";
import { individualHelpCards } from "@/app/components/individual/IndividualPortalContent";

export const metadata = {
  title: "Individual Help | C2Acct",
  description: "Individual PAT help and route explainer.",
};

export default function UserHelpPage() {
  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <div className="pat-label">Individual help</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
          What each individual page does
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          This page explains the current individual PAT scaffold in plain language so the route set is easy to review before the full person-native flow is built.
        </p>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        {individualHelpCards.map((card) => (
          <div key={card.title} className="pat-card p-6">
            <div className="text-xl font-semibold text-[var(--shell-ink)]">{card.title}</div>
            <div className="mt-4 grid gap-3 text-sm leading-6 text-[var(--shell-muted)]">
              <div><span className="font-semibold text-[var(--shell-ink)]">What it is:</span> {card.what}</div>
              <div><span className="font-semibold text-[var(--shell-ink)]">Why it matters:</span> {card.why}</div>
              <div><span className="font-semibold text-[var(--shell-ink)]">How to use it:</span> {card.how}</div>
            </div>
            <div className="mt-5">
              <Link className="pat-link inline-flex" href={card.href}>
                Open {card.title}
              </Link>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
