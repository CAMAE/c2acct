import Link from "next/link";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import {
  PUBLIC_ONBOARDING_COOKIE,
  getPublicOnboardingPageModel,
  isPublicOnboardingAudienceEnabled,
  normalizePublicOnboardingPlan,
  parsePublicOnboardingCookie,
} from "@/lib/publicOnboarding";
import { CREATE_ACCOUNT_PATH, isSelfSignupEnabled } from "@/lib/selfSignup";

type Params = {
  audience: string;
};

type SearchParams = {
  plan?: string;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<Params> }) {
  const { audience } = await params;
  if (!isPublicOnboardingAudienceEnabled(audience)) {
    return {
      title: "PAT Onboarding | C2Acct",
    };
  }

  const model = getPublicOnboardingPageModel({ audience });
  return {
    title: `${model.label} Onboarding | C2Acct`,
    description: model.heroBody,
  };
}

export default async function PublicOnboardingAudiencePage({
  params,
  searchParams,
}: {
  params: Promise<Params>;
  searchParams?: Promise<SearchParams>;
}) {
  const [{ audience }, resolvedSearchParams, cookieStore] = await Promise.all([
    params,
    searchParams,
    cookies(),
  ]);

  if (!isPublicOnboardingAudienceEnabled(audience)) {
    notFound();
  }

  const savedState = parsePublicOnboardingCookie(cookieStore.get(PUBLIC_ONBOARDING_COOKIE)?.value);
  const requestedPlan = normalizePublicOnboardingPlan(
    resolvedSearchParams?.plan ?? (savedState?.audience === audience ? savedState.plan : null)
  );
  const model = getPublicOnboardingPageModel({
    audience,
    selectedPlan: requestedPlan,
  });
  // Public funnel is two doors only: Sign in, or Create an account (when
  // self-signup is live). The save-intent / start-assessment cluster retired
  // in favor of the /create-account wizard.
  const selfSignupEnabled = isSelfSignupEnabled();

  return (
    <div className="space-y-8">
      <section className="pat-card px-7 py-8 sm:px-10 sm:py-10">
        <div className="pat-label">{model.label} first-value onboarding</div>
        <h1 className="mt-4 max-w-4xl text-4xl font-semibold tracking-tight text-[var(--shell-ink)] sm:text-5xl">
          {model.heroTitle}
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          {model.heroBody}
        </p>

        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="pat-button-primary" href={model.signInWorkspaceHref}>
            Sign in to {model.shortLabel} workspace
          </Link>
          {selfSignupEnabled ? (
            <Link className="pat-button-secondary" href={CREATE_ACCOUNT_PATH}>
              Create an account
            </Link>
          ) : null}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="pat-card p-7">
          <div className="pat-label">First PAT value</div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--shell-ink)]">
            {model.valueTitle}
          </h2>
          <p className="mt-4 text-base leading-7 text-[var(--shell-muted)]">
            {model.valueBody}
          </p>
          <ul className="mt-5 grid gap-3 text-sm leading-6 text-[var(--shell-muted)]">
            {model.evidenceNeeded.map((item) => (
              <li key={item} className="rounded-[18px] border border-[var(--shell-border)] bg-white/75 px-4 py-3">
                {item}
              </li>
            ))}
          </ul>
        </div>

        <aside className="pat-soft-panel p-6">
          <div className="pat-label">Billing truth</div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">
            Payment state: {model.selectedBilling.stateLabel}
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
            {model.selectedBilling.truthLabel}
          </p>
          {model.selectedBilling.disabledReason ? (
            <p className="mt-3 text-xs font-semibold uppercase tracking-[0.16em] text-[var(--shell-muted)]">
              Reason: {model.selectedBilling.disabledReason}
            </p>
          ) : null}
          <Link className="pat-button-secondary mt-5" href={model.membershipHref}>
            Compare membership options
          </Link>
        </aside>
      </section>

      <section className="grid gap-5 lg:grid-cols-3" aria-label={`${model.label} plan choices`}>
        {model.planCards.map((plan) => (
          <article
            key={plan.key}
            className={`pat-card p-6 ${plan.key === model.selectedPlan ? "ring-2 ring-[rgba(6,54,116,0.18)]" : ""}`}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="pat-label">{plan.label}</div>
              <span className="rounded-full border border-[var(--shell-border)] px-3 py-1 text-xs font-semibold text-[var(--shell-muted)]">
                {plan.routeLabel}
              </span>
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">
              {plan.title}
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
              {plan.summary}
            </p>
            <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
              {plan.value}
            </p>
            <div className="mt-4 rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-4 text-sm leading-6 text-[var(--shell-muted)]">
              <div className="font-semibold text-[var(--shell-ink)]">{plan.billingLabel}</div>
              <div className="mt-1">{plan.billingTruth}</div>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link className="pat-button-primary" href={plan.actionHref}>
                {plan.actionLabel}
              </Link>
              {plan.detailHref ? (
                <Link className="pat-button-secondary" href={plan.detailHref}>
                  Plan detail
                </Link>
              ) : null}
            </div>
          </article>
        ))}
      </section>

      <section className="pat-card p-7">
        <div className="pat-label">Conversion-safe empty state</div>
        <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--shell-ink)]">
          {model.emptyStateTitle}
        </h2>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          {model.emptyStateBody}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="pat-button-primary" href={model.signInWorkspaceHref}>
            Sign in to {model.shortLabel} workspace
          </Link>
          {selfSignupEnabled ? (
            <Link className="pat-button-secondary" href={CREATE_ACCOUNT_PATH}>
              Create an account
            </Link>
          ) : null}
        </div>
      </section>
    </div>
  );
}
