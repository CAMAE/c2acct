import Link from "next/link";
import { signOut } from "@/auth";
import { PatLogoLockup } from "@/app/components/brand/BrandMarks";
import { getSessionUser } from "@/lib/auth/session";
import { getConsultantAccessStateForUser } from "@/lib/consultantAccess";
import { isIndividualSurfacesEnabled } from "@/lib/pilotSurfaces";
import { getPublicOnboardingHomeCards } from "@/lib/publicOnboarding";
import { getRequestLocaleMessages } from "@/lib/requestLocale";

export default async function Home() {
  const sessionUser = await getSessionUser();
  const messages = await getRequestLocaleMessages();
  const individualSurfacesEnabled = isIndividualSurfacesEnabled();
  const signedIn = Boolean(sessionUser);
  // 6/9 audit bug 2: a session with no company and no consultant profile is a
  // shelved (person-level) account — every pilot route rejects it, so the
  // plain "You are signed in" banner was a dead end. Consultants also carry
  // no companyId, so they must be excluded before calling a session shelved.
  const consultantState =
    sessionUser && !sessionUser.companyId
      ? await getConsultantAccessStateForUser(sessionUser)
      : null;
  const shelvedSession = Boolean(
    sessionUser && !sessionUser.companyId && !consultantState && !individualSurfacesEnabled
  );
  const signInHref = "/sign-in";
  const signInCtaLabel = messages.common.continueToSignIn;
  const onboardingCards = getPublicOnboardingHomeCards();
  const signInCopy = signedIn
    ? messages.home.signedInCopy
    : individualSurfacesEnabled
      ? messages.home.signedOutCopy
      : "Vendors and firms sign in here to access their PAT workspace. Person-level and access-code paths are shelved for the current pilot.";

  async function signOutShelvedSession() {
    "use server";
    await signOut({ redirectTo: "/" });
  }

  return (
    <div className="space-y-8">
      <section className="pat-card px-7 py-8 sm:px-10 sm:py-10">
        <PatLogoLockup mode="hero" tone="light" />
        <div className="pat-label mt-6">{messages.home.eyebrow}</div>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-[var(--shell-ink)] sm:text-5xl">
          {messages.home.heroTitle}
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          {messages.home.heroBody}
        </p>
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

        {shelvedSession ? (
          <article className="pat-card block px-7 py-8 sm:px-8 sm:py-9">
            <div className="pat-label">Signed in</div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--shell-ink)]">
              Your account type isn&apos;t part of the current pilot
            </h2>
            <p className="mt-4 text-base leading-7 text-[var(--shell-muted)]">
              You are signed in with a person-level account, and person-level surfaces are shelved
              for the current vendor/firm pilot. Sign out and use a vendor or firm account to reach
              a pilot workspace.
            </p>
            <form action={signOutShelvedSession} className="mt-6">
              <button type="submit" className="pat-button-primary">
                Sign out
              </button>
            </form>
          </article>
        ) : (
          <Link
            href={signInHref}
            className="pat-card pat-card-interactive block px-7 py-8 sm:px-8 sm:py-9"
          >
            <div className="pat-label">Sign in</div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--shell-ink)]">
              Continue to your workspace
            </h2>
            <p className="mt-4 text-base leading-7 text-[var(--shell-muted)]">
              {signInCopy}
            </p>
            <span className="mt-6 inline-flex items-center rounded-full border border-[var(--shell-border)] px-4 py-2 text-sm font-semibold text-[var(--shell-ink)] shadow-[0_6px_18px_rgba(15,23,42,0.04)]">
              {signInCtaLabel}
            </span>
          </Link>
        )}
      </section>

      <section className="pat-card px-7 py-8 sm:px-8 sm:py-9">
        <div className="pat-label">{messages.home.signInLabel}</div>
        <div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--shell-ink)]">
            Choose your path
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
            Pick the role that matches your work, compare the first-value path, and start the assessment that creates real PAT signal. Paid conversion stays clearly staged unless Stripe billing is configured.
          </p>
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
    </div>
  );
}
