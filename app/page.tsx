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
        <div className="pat-card-strong px-8 py-10">
          <div className="pat-label text-white/60">
            C2Acct / PAT
          </div>
          <h1 className="mt-4 max-w-3xl text-5xl font-semibold tracking-tight">
            Performance Alignment Technology for institutional operators who need signal, not spin.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-white/74">
            C2Acct presents the platform. PAT delivers the workflow. The current product keeps one calm path from access through assessment into results, outputs, and profile interpretation without pretending the beta already does more than it can support.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <Link
              href={nextAction.href}
              className="pat-button-accent"
            >
              {nextAction.label}
            </Link>
            <Link
              href="/platform"
              className="pat-button-secondary border-white/15 bg-white/0 text-white/88 hover:bg-white/8 hover:text-white"
            >
              Open PAT Workspace
            </Link>
          </div>
        </div>

        <div className="pat-card p-8">
          <div className="pat-label">
            Current State
          </div>
          <div className="pat-subpanel mt-4 p-5">
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
                title: "Access",
                desc: signedIn ? `Signed in as ${sessionUser?.email ?? "actor"}` : "Authenticate with an approved account.",
              },
              {
                title: "Context",
                desc: companyReady
                  ? `Company-backed PAT scope is available${assessmentContext?.accessMode ? ` via ${assessmentContext.accessMode}` : ""}.`
                  : "PAT needs a company-backed subject before assessment and output access can activate.",
              },
              {
                title: "Value realization",
                desc: hasSubmission
                  ? "Results, outputs, and profile surfaces are available from the latest submission."
                  : "The first submission unlocks the Tier 1 decision-support surfaces.",
              },
            ].map((item) => (
              <div key={item.title} className="pat-soft-panel p-4">
                <div className="font-semibold text-[var(--shell-ink)]">{item.title}</div>
                <div className="mt-1 text-sm text-[var(--shell-muted)]">{item.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="pat-card p-8">
        <div className="pat-label">
          Operating Flow
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-4">
          {[
            {
              title: "Enter",
              desc: "C2Acct handles the corporate front door. PAT preserves callback discipline so actors return to the protected step they intended to reach.",
              href: "/login?callbackUrl=%2Fsurvey",
              label: "Review sign-in",
            },
            {
              title: "Prepare",
              desc: "Assessment readiness confirms company context, active subject scope, and whether this is a first or returning submission.",
              href: "/survey",
              label: "Open readiness",
            },
            {
              title: "Read",
              desc: "Results consolidate current posture, confidence, submission history, and unlocked Tier 1 interpretation in one decision surface.",
              href: "/results",
              label: "View results",
            },
            {
              title: "Act",
              desc: "Outputs explain what is available now, what remains gated, and why, instead of showing decorative locked tiles.",
              href: "/outputs",
              label: "Open outputs",
            },
          ].map((step) => (
            <div key={step.title} className="pat-subpanel p-6">
              <div className="text-lg font-semibold text-[var(--shell-ink)]">{step.title}</div>
              <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">{step.desc}</p>
              <Link className="pat-link mt-5 inline-flex" href={step.href}>
                {step.label}
              </Link>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
