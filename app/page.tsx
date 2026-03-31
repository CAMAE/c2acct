import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { getRequestLocaleMessages } from "@/lib/requestLocale";

export default async function Home() {
  const sessionUser = await getSessionUser();
  const messages = await getRequestLocaleMessages();
  const signedIn = Boolean(sessionUser);
  const signInHref = "/sign-in";
  const signInTitle = messages.home.signInTitle;
  const signInCtaLabel = messages.common.continueToSignIn;
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
