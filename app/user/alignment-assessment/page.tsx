import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { getUserAlignmentProgress, getUserPatContext } from "@/lib/userPat";

export const dynamic = "force-dynamic";

export default async function UserAlignmentAssessmentPage() {
  const sessionUser = await getSessionUser();
  const [userPatContext, progress] = sessionUser
    ? await Promise.all([
        getUserPatContext(sessionUser),
        getUserAlignmentProgress(sessionUser),
      ])
    : [null, null];

  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <div className="pat-label">Individual alignment assessment</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
          Live person-level PAT alignment intake
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          This route now uses the existing survey module pipeline with a seeded person-level PAT alignment module. It stays inside the current PAT architecture instead of creating a second user-only assessment system.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
          Status: <span className="font-semibold text-[var(--shell-ink)]">{progress ? "Live" : "Sign in required"}</span>
        </div>
        <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
          Auth state: <span className="font-semibold text-[var(--shell-ink)]">{sessionUser ? "Signed in" : "Signed out"}</span>
        </div>
        <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
          Person subject: <span className="font-semibold text-[var(--shell-ink)]">{userPatContext ? (userPatContext.subjectMembershipReady ? "Ready" : "Fallback") : "Unavailable"}</span>
        </div>
      </section>

      {progress ? (
        <section className="pat-card p-6">
          <div className="pat-label">Assessment module</div>
          <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
            <div>
              <div className="text-2xl font-semibold text-[var(--shell-ink)]">{progress.title}</div>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--shell-muted)]">
                {progress.description}
              </p>
              <div className="mt-5 grid gap-2 text-sm leading-6 text-[var(--shell-muted)]">
                <div>Questions: <span className="font-semibold text-[var(--shell-ink)]">{progress.questionCount}</span></div>
                <div>Progress: <span className="font-semibold text-[var(--shell-ink)]">{progress.answeredCount}/{progress.questionCount}</span></div>
                <div>Latest score: <span className="font-semibold text-[var(--shell-ink)]">{progress.latestScore ?? "--"}</span></div>
                <div>Pro membership state: <span className="font-semibold text-[var(--shell-ink)]">{progress.tier1Unlocked ? "Unlocked" : "Pending completion"}</span></div>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <Link className="pat-button-primary" href={progress.href}>
                {progress.latestSubmittedAt ? "Retake assessment" : "Start assessment"}
              </Link>
              <Link className="pat-button-secondary" href="/user/insights">
                Open individual insights
              </Link>
            </div>
          </div>
        </section>
      ) : null}

      <section className="pat-card p-6">
        <div className="pat-label">Plumbing note</div>
        <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
          This individual module runs through the existing PAT survey runtime and saves subject-backed submissions when person records are available. It falls back safely if local subject tables are missing.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="pat-button-secondary" href="/user">
            Back to individual home
          </Link>
          <Link className="pat-button-secondary" href={sessionUser ? "/user" : "/sign-in/user"}>
            {sessionUser ? "Open individual workspace" : "Sign in as individual"}
          </Link>
        </div>
      </section>
    </div>
  );
}
