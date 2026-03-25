import Link from "next/link";
import { redirect } from "next/navigation";
import EnsureCompanySelected from "@/app/components/EnsureCompanySelected";
import prisma from "@/lib/prisma";
import { getSessionUser } from "@/lib/auth/session";
import { hasCompany } from "@/lib/authz";
import { resolveAssessmentSubjectContext } from "@/lib/subjectContext";

const MODULE_KEY = "firm_alignment_v1";

export default async function SurveyPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect("/login?callbackUrl=%2Fsurvey");
  }

  const assessmentContext = await resolveAssessmentSubjectContext(sessionUser);
  const companyReady = hasCompany(sessionUser) && Boolean(assessmentContext?.companyId);

  const latestSubmission = companyReady
    ? await prisma.surveySubmission.findFirst({
        where: assessmentContext?.subjectId
          ? { subjectId: assessmentContext.subjectId }
          : { companyId: assessmentContext?.companyId ?? "" },
        orderBy: { createdAt: "desc" },
        include: {
          SurveyModule: {
            select: {
              key: true,
              title: true,
            },
          },
        },
      })
    : null;

  const hasSubmission = Boolean(latestSubmission);

  return (
    <>
      <EnsureCompanySelected />
      <section className="space-y-8">
      <div className="rounded-[30px] border border-[var(--shell-border)] bg-[linear-gradient(145deg,rgba(15,23,42,0.97),rgba(25,65,79,0.95))] p-8 text-white shadow-[0_30px_80px_rgba(15,23,42,0.16)]">
        <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-white/58">
          Assessment Readiness
        </div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight">
          Enter the PAT assessment when context, intent, and next step are clear.
        </h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-white/74">
          This page confirms the current institutional scope before the module opens. PAT keeps the assessment radically simple, but the workflow still needs to feel deliberate and safe.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
        <div className="rounded-[26px] border border-[var(--shell-border)] bg-[var(--shell-panel)] p-6">
          {!companyReady ? (
            <>
              <h2 className="text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">
                Company-backed assessment is not available yet
              </h2>
              <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
                Your account is authenticated, but PAT does not yet have a company-backed subject available for the current assessment path. Auth and tenancy protections remain in place, so the assessment cannot start without that context.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link className="rounded-full bg-[var(--shell-ink)] px-5 py-3 text-sm font-semibold text-white" href="/platform">
                  Open workspace
                </Link>
                <Link className="rounded-full border border-[var(--shell-border)] px-5 py-3 text-sm font-semibold text-[var(--shell-ink)]" href="/">
                  Return home
                </Link>
              </div>
            </>
          ) : !hasSubmission ? (
            <>
              <h2 className="text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">
                Ready for the first submission
              </h2>
              <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
                This is the first PAT assessment run for the current company-backed subject. After submission, PAT will move directly into results, outputs, and the profile shell.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link className="rounded-full bg-[var(--shell-ink)] px-5 py-3 text-sm font-semibold text-white" href={`/survey/${MODULE_KEY}`}>
                  Start assessment
                </Link>
                <Link className="rounded-full border border-[var(--shell-border)] px-5 py-3 text-sm font-semibold text-[var(--shell-ink)]" href="/results">
                  View empty results state
                </Link>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">
                Returning with prior assessment state
              </h2>
              <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
                PAT already has a recorded submission for this subject. You can rerun the assessment, review the current results, or continue into outputs without losing the existing unlock state.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link className="rounded-full bg-[var(--shell-ink)] px-5 py-3 text-sm font-semibold text-white" href={`/survey/${MODULE_KEY}`}>
                  Run another submission
                </Link>
                <Link className="rounded-full border border-[var(--shell-border)] px-5 py-3 text-sm font-semibold text-[var(--shell-ink)]" href="/results">
                  Review results
                </Link>
                <Link className="rounded-full border border-[var(--shell-border)] px-5 py-3 text-sm font-semibold text-[var(--shell-ink)]" href="/outputs">
                  Open outputs
                </Link>
              </div>
            </>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-[24px] border border-[var(--shell-border)] bg-[var(--shell-panel)] p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--shell-muted)]">
              Current context
            </div>
            <div className="mt-3 grid gap-2 text-sm leading-6 text-[var(--shell-muted)]">
              <div>
                Actor: <span className="font-semibold text-[var(--shell-ink)]">{sessionUser.email}</span>
              </div>
              <div>
                Company ready: <span className="font-semibold text-[var(--shell-ink)]">{companyReady ? "Yes" : "No"}</span>
              </div>
              <div>
                Access mode: <span className="font-semibold text-[var(--shell-ink)]">{assessmentContext?.accessMode ?? "--"}</span>
              </div>
              <div>
                Subject: <span className="font-semibold text-[var(--shell-ink)]">{assessmentContext?.subjectId ?? "--"}</span>
              </div>
            </div>
          </div>

          <div className="rounded-[24px] border border-[var(--shell-border)] bg-[var(--shell-panel)] p-5">
            <div className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--shell-muted)]">
              Assessment path
            </div>
            <div className="mt-3 grid gap-3 text-sm leading-6 text-[var(--shell-muted)]">
              <div>
                Module: <span className="font-semibold text-[var(--shell-ink)]">{latestSubmission?.SurveyModule?.title ?? "Firm Alignment Survey"}</span>
              </div>
              <div>
                Latest submission: <span className="font-semibold text-[var(--shell-ink)]">{latestSubmission ? new Date(latestSubmission.createdAt).toLocaleString() : "None yet"}</span>
              </div>
              <div>
                Post-submit route: <span className="font-semibold text-[var(--shell-ink)]">Results → Outputs → Profiles</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      </section>
    </>
  );
}
