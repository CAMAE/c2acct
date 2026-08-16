"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { PatLogoLockup } from "@/app/components/brand/BrandMarks";
import type { CreateAccountActionState } from "@/app/(app)/create-account/actions";
import type { SelfSignupPlanCard } from "@/lib/selfSignup";
import {
  SELF_SIGNUP_PASSWORD_HINT,
  SELF_SIGNUP_STEPS,
  canLeaveSelfSignupStep,
  createEmptySelfSignupDraft,
  getNextSelfSignupStep,
  getPreviousSelfSignupStep,
  getSelfSignupStepIndex,
  type RenderedSelfSignupRole,
  type SelfSignupDraft,
  type SelfSignupGoalQuestion,
  type SelfSignupOrganizationQuestion,
  type SelfSignupRoleOption,
  type SelfSignupStep,
} from "@/lib/selfSignupWizard";

export type CreateAccountWizardContent = {
  roles: SelfSignupRoleOption[];
  byRole: Record<
    RenderedSelfSignupRole,
    {
      organization: SelfSignupOrganizationQuestion;
      goal: SelfSignupGoalQuestion;
      planCards: SelfSignupPlanCard[];
    }
  >;
};

const STEP_LABELS: Record<SelfSignupStep, string> = {
  role: "Your path",
  organization: "Your organization",
  goal: "Your goal",
  plan: "Your plan",
  account: "Account details",
  checkout: "Checkout",
};

const INITIAL_ACTION_STATE: CreateAccountActionState = { error: null };

export default function CreateAccountWizard({
  content,
  action,
}: {
  content: CreateAccountWizardContent;
  action: (state: CreateAccountActionState, formData: FormData) => Promise<CreateAccountActionState>;
}) {
  const [draft, setDraft] = useState<SelfSignupDraft>(createEmptySelfSignupDraft);
  const [step, setStep] = useState<SelfSignupStep>("role");
  const [direction, setDirection] = useState<"forward" | "back">("forward");
  const [stepError, setStepError] = useState<string | null>(null);
  const [actionState, formAction, submitPending] = useActionState(action, INITIAL_ACTION_STATE);

  const roleContent = draft.role === "vendor" || draft.role === "firm" ? content.byRole[draft.role] : null;
  const stepIndex = getSelfSignupStepIndex(step);

  function updateDraft(patch: Partial<SelfSignupDraft>) {
    setDraft((current) => ({ ...current, ...patch }));
    setStepError(null);
  }

  function goForward() {
    const check = canLeaveSelfSignupStep(step, draft);
    if (!check.ok) {
      setStepError(check.reason);
      return;
    }

    const next = getNextSelfSignupStep(step);
    if (next && next !== "checkout") {
      setDirection("forward");
      setStepError(null);
      setStep(next);
    }
  }

  function goBack() {
    const previous = getPreviousSelfSignupStep(step);
    if (previous) {
      setDirection("back");
      setStepError(null);
      setStep(previous);
    }
  }

  function selectAndAdvance(patch: Partial<SelfSignupDraft>) {
    const next = getNextSelfSignupStep(step);
    setDraft((current) => ({ ...current, ...patch }));
    setStepError(null);
    if (next && next !== "checkout") {
      setDirection("forward");
      setStep(next);
    }
  }

  const error = stepError ?? (step === "account" ? actionState.error : null);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6">
      <section className="pat-card px-7 py-7 sm:px-9 sm:py-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <PatLogoLockup mode="header" tone="light" />
          <div className="pat-label">{STEP_LABELS[step]}</div>
        </div>
        <h1 className="mt-5 text-3xl font-semibold tracking-tight text-[var(--shell-ink)] sm:text-4xl">
          Create an account
        </h1>
        <p className="mt-3 text-base leading-7 text-[var(--shell-muted)]">
          Choose your path, answer two quick questions, pick a plan, and you are in your PAT workspace.
        </p>

        <ol className="mt-6 flex items-center gap-2.5" aria-label="Account creation steps">
          {SELF_SIGNUP_STEPS.map((wizardStep, index) => {
            const state = index < stepIndex ? "done" : index === stepIndex ? "current" : "upcoming";
            return (
              <li key={wizardStep} className="flex items-center" aria-current={state === "current" ? "step" : undefined}>
                <span className="sr-only">{STEP_LABELS[wizardStep]}</span>
                <span
                  aria-hidden="true"
                  className={`block rounded-full transition-all duration-200 ${
                    state === "current"
                      ? "h-2.5 w-7 bg-[var(--shell-ink)]"
                      : state === "done"
                        ? "h-2.5 w-2.5 bg-[rgba(6,54,116,0.55)]"
                        : "h-2.5 w-2.5 bg-[rgba(12,33,66,0.16)]"
                  }`}
                />
              </li>
            );
          })}
        </ol>
      </section>

      <section
        key={step}
        className={`pat-card px-7 py-8 sm:px-9 sm:py-9 ${
          direction === "forward" ? "pat-wizard-step-forward" : "pat-wizard-step-back"
        }`}
      >
        {step === "role" ? (
          <div>
            <div className="pat-label">Step 1</div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">
              Which best describes you?
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {content.roles.map((option) => (
                <button
                  key={option.role}
                  type="button"
                  data-active={draft.role === option.role}
                  onClick={() => selectAndAdvance({ role: option.role, orgSize: null, primaryGoal: null })}
                  className="pat-wizard-choice-card p-5"
                >
                  <div className="pat-label">{option.label}</div>
                  <div className="mt-3 text-lg font-semibold tracking-tight text-[var(--shell-ink)]">
                    {option.title}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">{option.body}</p>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {step === "organization" && roleContent ? (
          <div>
            <div className="pat-label">Step 2</div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">
              {roleContent.organization.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">{roleContent.organization.subtitle}</p>
            <label className="mt-6 block">
              <span className="text-sm font-semibold text-[var(--shell-ink)]">
                {roleContent.organization.nameLabel}
              </span>
              <input
                type="text"
                value={draft.orgName}
                onChange={(event) => updateDraft({ orgName: event.target.value })}
                placeholder={roleContent.organization.namePlaceholder}
                autoFocus
                className="mt-2 w-full rounded-[16px] border border-[var(--shell-border)] bg-white px-4 py-3 text-base text-[var(--shell-ink)] focus:outline-none focus:ring-2 focus:ring-[rgba(6,54,116,0.18)]"
              />
            </label>
            <div className="mt-5">
              <span className="text-sm font-semibold text-[var(--shell-ink)]">
                {roleContent.organization.sizeLabel}
              </span>
              <div className="mt-2 flex flex-wrap gap-2.5">
                {roleContent.organization.sizeOptions.map((size) => (
                  <button
                    key={size}
                    type="button"
                    data-active={draft.orgSize === size}
                    onClick={() => updateDraft({ orgSize: size })}
                    className="pat-question-choice-button rounded-full border border-[var(--shell-border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--shell-ink)]"
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {step === "goal" && roleContent ? (
          <div>
            <div className="pat-label">Step 3</div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">
              {roleContent.goal.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">{roleContent.goal.subtitle}</p>
            <div className="mt-6 grid gap-3">
              {roleContent.goal.options.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  data-active={draft.primaryGoal === option.value}
                  onClick={() => selectAndAdvance({ primaryGoal: option.value })}
                  className="pat-wizard-choice-card px-5 py-4 text-base font-medium text-[var(--shell-ink)]"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {step === "plan" && roleContent ? (
          <div>
            <div className="pat-label">Step 4</div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">
              Choose your plan
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
              You can review the full comparison from your workspace at any time.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {roleContent.planCards.map((plan) => (
                <button
                  key={plan.key}
                  type="button"
                  data-active={draft.plan === plan.key}
                  onClick={() => selectAndAdvance({ plan: plan.key })}
                  className="pat-wizard-choice-card pat-wizard-choice-card--stack p-5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="pat-label">{plan.label}</div>
                    {plan.recommended ? (
                      <span className="rounded-full border border-[var(--shell-border)] px-3 py-1 text-xs font-semibold text-[var(--shell-muted)]">
                        Recommended
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">{plan.tagline}</p>
                  <ul className="mt-4 space-y-2 text-sm leading-6 text-[var(--shell-muted)]">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex gap-2">
                        <span aria-hidden="true" className="text-[var(--shell-ink)]">
                          •
                        </span>
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {step === "account" ? (
          <form action={formAction}>
            <div className="pat-label">Step 5</div>
            <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">
              Account details
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
              This creates your organization and signs you in as its owner. Checkout is the final step.
            </p>

            <input type="hidden" name="role" value={draft.role ?? ""} />
            <input type="hidden" name="orgName" value={draft.orgName} />
            <input type="hidden" name="orgSize" value={draft.orgSize ?? ""} />
            <input type="hidden" name="primaryGoal" value={draft.primaryGoal ?? ""} />
            <input type="hidden" name="plan" value={draft.plan ?? ""} />

            <label className="mt-6 block">
              <span className="text-sm font-semibold text-[var(--shell-ink)]">Your name</span>
              <input
                type="text"
                name="ownerName"
                value={draft.ownerName}
                onChange={(event) => updateDraft({ ownerName: event.target.value })}
                autoComplete="name"
                autoFocus
                className="mt-2 w-full rounded-[16px] border border-[var(--shell-border)] bg-white px-4 py-3 text-base text-[var(--shell-ink)] focus:outline-none focus:ring-2 focus:ring-[rgba(6,54,116,0.18)]"
              />
            </label>
            <label className="mt-4 block">
              <span className="text-sm font-semibold text-[var(--shell-ink)]">Work email</span>
              <input
                type="email"
                name="email"
                value={draft.email}
                onChange={(event) => updateDraft({ email: event.target.value })}
                autoComplete="email"
                className="mt-2 w-full rounded-[16px] border border-[var(--shell-border)] bg-white px-4 py-3 text-base text-[var(--shell-ink)] focus:outline-none focus:ring-2 focus:ring-[rgba(6,54,116,0.18)]"
              />
            </label>
            <label className="mt-4 block">
              <span className="text-sm font-semibold text-[var(--shell-ink)]">Password</span>
              <input
                type="password"
                name="password"
                value={draft.password}
                onChange={(event) => updateDraft({ password: event.target.value })}
                autoComplete="new-password"
                aria-describedby="create-account-password-hint"
                className="mt-2 w-full rounded-[16px] border border-[var(--shell-border)] bg-white px-4 py-3 text-base text-[var(--shell-ink)] focus:outline-none focus:ring-2 focus:ring-[rgba(6,54,116,0.18)]"
              />
            </label>
            <p id="create-account-password-hint" className="mt-2 text-xs leading-5 text-[var(--shell-muted)]">
              {SELF_SIGNUP_PASSWORD_HINT}
            </p>

            {error ? (
              <p role="alert" className="mt-4 rounded-[14px] border border-red-200 bg-red-50/90 px-4 py-3 text-sm leading-6 text-red-900">
                {error}
              </p>
            ) : null}

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <button type="button" onClick={goBack} className="pat-button-secondary">
                Back
              </button>
              <button type="submit" disabled={submitPending} className="pat-button-primary disabled:opacity-60">
                {submitPending ? "Creating your account…" : "Create account and continue to checkout"}
              </button>
            </div>
          </form>
        ) : null}

        {step !== "account" ? (
          <>
            {error ? (
              <p role="alert" className="mt-5 rounded-[14px] border border-red-200 bg-red-50/90 px-4 py-3 text-sm leading-6 text-red-900">
                {error}
              </p>
            ) : null}
            <div className="mt-7 flex flex-wrap items-center gap-3">
              {step !== "role" ? (
                <button type="button" onClick={goBack} className="pat-button-secondary">
                  Back
                </button>
              ) : null}
              <button type="button" onClick={goForward} className="pat-button-primary">
                Continue
              </button>
            </div>
          </>
        ) : null}
      </section>

      <p className="text-center text-sm leading-6 text-[var(--shell-muted)]">
        Already have an account?{" "}
        <Link href="/sign-in" className="font-semibold text-[var(--shell-ink)] underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
