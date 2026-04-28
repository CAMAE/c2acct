import Link from "next/link";
import { getPublicOnboardingHomeCards } from "@/lib/publicOnboarding";

export const metadata = {
  title: "PAT Onboarding | C2Acct",
  description: "Choose a PAT role and start the first assessment path.",
};

export default function PublicOnboardingPage() {
  const cards = getPublicOnboardingHomeCards();

  return (
    <div className="space-y-8">
      <section className="pat-card px-7 py-8 sm:px-10 sm:py-10">
        <div className="pat-label">Public onboarding</div>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-[var(--shell-ink)] sm:text-5xl">
          Choose a role, select a plan path, and reach the first useful PAT assessment.
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          PAT onboarding starts before sign-in so vendors, firms, and individuals can see what the product does, what evidence is required, and when billing is staged versus provider-backed.
        </p>
      </section>

      <section className="grid gap-6 lg:grid-cols-3" aria-label="PAT onboarding role paths">
        {cards.map((card) => (
          <Link
            key={card.audience}
            href={card.href}
            className="pat-card pat-card-interactive block px-7 py-8 sm:px-8 sm:py-9"
          >
            <div className="pat-label">{card.label}</div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--shell-ink)]">
              {card.title}
            </h2>
            <p className="mt-4 text-base leading-7 text-[var(--shell-muted)]">
              {card.body}
            </p>
            <span className="mt-6 inline-flex rounded-full border border-[var(--shell-border)] px-4 py-2 text-sm font-semibold text-[var(--shell-ink)] shadow-[0_6px_18px_rgba(15,23,42,0.04)]">
              {card.ctaLabel}
            </span>
          </Link>
        ))}
      </section>

      <section className="pat-soft-panel p-6">
        <div className="pat-label">Plan and payment truth</div>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">
          Checkout is explicit, never implied.
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--shell-muted)]">
          Free onboarding starts with assessment evidence. Paid paths connect to the existing membership checkout pages, which show Stripe-hosted checkout only when billing is configured and otherwise state that no live charge will be created.
        </p>
      </section>
    </div>
  );
}
