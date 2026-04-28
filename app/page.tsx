import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { getPublicOnboardingHomeCards } from "@/lib/publicOnboarding";
import { getRequestLocaleMessages } from "@/lib/requestLocale";

export default async function Home() {
  const sessionUser = await getSessionUser();
  const messages = await getRequestLocaleMessages();
  const signedIn = Boolean(sessionUser);
  const signInHref = "/sign-in";
  const signInTitle = messages.home.signInTitle;
  const signInCtaLabel = messages.common.continueToSignIn;
  const onboardingCards = getPublicOnboardingHomeCards();
  const signInCopy = signedIn
    ? messages.home.signedInCopy
    : messages.home.signedOutCopy;

  return (
    <div className="space-y-8">
      <section className="pat-card px-7 py-8 sm:px-10 sm:py-10">
        <div className="flex flex-wrap items-center gap-3 text-left sm:gap-4">
          <div className="brand-pat-wordmark text-[2rem] leading-none text-[var(--shell-ink)] sm:text-[2.5rem]">
            PAT
          </div>
          <div className="h-10 w-px bg-[rgba(12,33,66,0.12)] sm:h-12" aria-hidden="true" />
          <div className="text-sm font-medium tracking-[0.08em] text-[var(--shell-ink)] sm:text-base">
            {messages.home.productName}
          </div>
        </div>
        <div className="pat-label mt-6">{messages.home.eyebrow}</div>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-[var(--shell-ink)] sm:text-5xl">
          {messages.home.heroTitle}
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          {messages.home.heroBody}
        </p>
      </section>

      <section className="pat-card px-7 py-8 sm:px-8 sm:py-9">
        <div className="pat-label">{messages.home.signInLabel}</div>
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--shell-ink)]">
              Choose your path
            </h2>
            <p className="mt-4 text-base leading-7 text-[var(--shell-muted)]">
              Pick the role that matches your work, compare the first-value path, and start the assessment that creates real PAT signal. Paid conversion stays clearly staged unless Stripe billing is configured.
            </p>
          </div>
          <div className="rounded-[24px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-5 text-sm leading-6 text-[var(--shell-muted)]">
            <div className="font-semibold text-[var(--shell-ink)]">First-value rule</div>
            <div className="mt-2">
              PAT does not claim generated insights are ready until the matching vendor, firm, or individual assessment evidence exists.
            </div>
          </div>
        </div>

        <div className="mt-7 grid gap-5 lg:grid-cols-3" aria-label="PAT public onboarding paths">
          {onboardingCards.map((card) => (
            <Link
              key={card.audience}
              href={card.href}
              className="rounded-[24px] border border-[var(--shell-border)] bg-white/75 p-5 transition hover:-translate-y-0.5 hover:border-[rgba(6,54,116,0.22)] hover:shadow-[0_18px_50px_rgba(15,23,42,0.08)]"
            >
              <div className="pat-label">{card.label}</div>
              <h3 className="mt-3 text-xl font-semibold tracking-tight text-[var(--shell-ink)]">
                {card.title}
              </h3>
              <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
                {card.body}
              </p>
              <span className="mt-5 inline-flex rounded-full border border-[var(--shell-border)] px-4 py-2 text-sm font-semibold text-[var(--shell-ink)] shadow-[0_6px_18px_rgba(15,23,42,0.04)]">
                {card.ctaLabel}
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Link
          href="/pat"
          className="pat-card pat-card-interactive block px-7 py-8 sm:px-8 sm:py-9"
        >
          <div className="pat-label">{messages.home.welcomeLabel}</div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--shell-ink)]">
            {messages.home.meetPatTitle}
          </h2>
          <p className="mt-4 text-base leading-7 text-[var(--shell-muted)]">
            {messages.home.meetPatBody}
          </p>
          <span className="mt-6 inline-flex items-center rounded-full border border-[var(--shell-border)] px-4 py-2 text-sm font-semibold text-[var(--shell-ink)] shadow-[0_6px_18px_rgba(15,23,42,0.04)]">
            {messages.home.meetPatCta}
          </span>
        </Link>

        <Link
          href={signInHref}
          className="pat-card pat-card-interactive block px-7 py-8 sm:px-8 sm:py-9"
        >
          <div className="pat-label">{messages.home.signInLabel}</div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--shell-ink)]">
            {signInTitle}
          </h2>
          <p className="mt-4 text-base leading-7 text-[var(--shell-muted)]">
            {signInCopy}
          </p>
          <span className="mt-6 inline-flex items-center rounded-full border border-[var(--shell-border)] px-4 py-2 text-sm font-semibold text-[var(--shell-ink)] shadow-[0_6px_18px_rgba(15,23,42,0.04)]">
            {signInCtaLabel}
          </span>
        </Link>
      </section>
    </div>
  );
}
