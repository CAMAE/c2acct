import Link from "next/link";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { hasCompany } from "@/lib/authz";
import { resolveAssessmentSubjectContext } from "@/lib/subjectContext";

export default async function Home() {
  const sessionUser = await getSessionUser();
  const assessmentContext = sessionUser ? await resolveAssessmentSubjectContext(sessionUser) : null;
  const latestSubmission = assessmentContext?.companyId
    ? await prisma.surveySubmission.findFirst({
        where: assessmentContext.subjectId
          ? { subjectId: assessmentContext.subjectId }
          : { companyId: assessmentContext.companyId },
        orderBy: { createdAt: "desc" },
        include: {
          SurveyModule: {
            select: {
              title: true,
            },
          },
        },
      })
    : null;

  const signedIn = Boolean(sessionUser);
  const companyReady = hasCompany(sessionUser);
  const hasSubmission = Boolean(latestSubmission);

  const nextAction = !signedIn
    ? {
        href: "/login?callbackUrl=%2Fsurvey",
        label: "Sign in to start",
        detail: "Access the PAT workflow and return directly to assessment readiness.",
      }
    : !companyReady
      ? {
          href: "/platform",
          label: "Open workspace",
          detail: "Your account is active, but PAT still needs a company-backed operating context.",
        }
      : !hasSubmission
        ? {
            href: "/survey",
            label: "Begin assessment",
            detail: "Start the current PAT assessment and unlock the Tier 1 results layer.",
          }
        : {
            href: "/results",
            label: "Continue to results",
            detail: `Resume from the latest ${latestSubmission?.SurveyModule?.title ?? "assessment"} submission and move into outputs.`,
          };

  return (
    <div className="space-y-12">
      <section className="grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
        <div className="rounded-[34px] border border-[var(--shell-border)] bg-[linear-gradient(145deg,rgba(15,23,42,0.97),rgba(25,65,79,0.95))] px-8 py-10 text-white shadow-[0_40px_100px_rgba(15,23,42,0.16)]">
          <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/60">
            PAT Golden Path
          </div>
          <h1 className="mt-4 max-w-3xl text-5xl font-semibold tracking-tight">
            One deliberate workflow from entry to institutional readout.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/74">
            PAT now guides actors through a calm, company-safe workflow: sign in, confirm institutional context, complete the current assessment, and move directly into results, outputs, and profile surfaces that explain what value is actually unlocked.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href={nextAction.href}
              className="rounded-full bg-[var(--shell-accent)] px-6 py-3 text-sm font-semibold text-[var(--shell-ink)] transition hover:brightness-105"
            >
              {nextAction.label}
            </Link>
            <Link
              href="/platform"
              className="rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white/82 transition hover:bg-white/5"
            >
              Open PAT Workspace
            </Link>
          </div>
        </div>

        <div className="rounded-[30px] border border-[var(--shell-border)] bg-[var(--shell-panel)] p-8">
          <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--shell-muted)]">
            Current State
          </div>
          <div className="mt-4 rounded-[22px] border border-[var(--shell-border)] bg-white p-5">
            <div className="text-lg font-semibold text-[var(--shell-ink)]">
              {!signedIn
                ? "Not signed in"
                : !companyReady
                  ? "Signed in, context pending"
                  : !hasSubmission
                    ? "Assessment ready"
                    : "Returning with prior results"}
            </div>
            <div className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">{nextAction.detail}</div>
          </div>

          <div className="mt-4 grid gap-3">
            {[
              {
                title: "1. Access",
                desc: signedIn ? `Signed in as ${sessionUser?.email ?? "actor"}` : "Authenticate with an approved account.",
              },
              {
                title: "2. Context",
                desc: companyReady
                  ? `Company-backed PAT scope is available${assessmentContext?.accessMode ? ` via ${assessmentContext.accessMode}` : ""}.`
                  : "PAT needs a company-backed subject before assessment and output access can activate.",
              },
              {
                title: "3. Value realization",
                desc: hasSubmission
                  ? "Results, outputs, and profile surfaces are available from the latest submission."
                  : "The first submission unlocks the Tier 1 decision-support surfaces.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-[18px] border border-[var(--shell-border)] bg-white/70 p-4">
                <div className="font-semibold text-[var(--shell-ink)]">{item.title}</div>
                <div className="mt-1 text-sm text-[var(--shell-muted)]">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[30px] border border-[var(--shell-border)] bg-[var(--shell-panel)] p-8">
        <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--shell-muted)]">
          Workflow
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-4">
          {[
            {
              title: "Sign in",
              desc: "PAT preserves callback discipline so actors return to the exact protected step they intended to reach.",
              href: "/login?callbackUrl=%2Fsurvey",
              label: "Review sign-in",
            },
            {
              title: "Assessment readiness",
              desc: "The survey entry page now confirms readiness, company context, and whether this is a first or returning submission.",
              href: "/survey",
              label: "Open readiness",
            },
            {
              title: "Results",
              desc: "Current posture, confidence, submission history, and unlocked Tier 1 interpretation in one surface.",
              href: "/results",
              label: "View results",
            },
            {
              title: "Outputs",
              desc: "Unlocked deliverables and pending output states with explicit evidence, not decorative locked tiles.",
              href: "/outputs",
              label: "Open outputs",
            },
          ].map((step) => (
            <div key={step.title} className="rounded-[24px] border border-[var(--shell-border)] bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.05)]">
              <div className="text-lg font-semibold text-[var(--shell-ink)]">{step.title}</div>
              <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">{step.desc}</p>
              <Link className="mt-5 inline-flex text-sm font-semibold text-[var(--shell-ink)] underline decoration-[var(--shell-border)] underline-offset-4" href={step.href}>
                {step.label}
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
