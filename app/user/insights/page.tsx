import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import {
  USER_TIER1_INSIGHT_DEFINITIONS,
  USER_TIER2_INSIGHT_DEFINITIONS,
  getUserAlignmentProgress,
  getUserPatContext,
} from "@/lib/userPat";

export const dynamic = "force-dynamic";

export default async function UserInsightsPage() {
  const sessionUser = await getSessionUser();
  const [userPatContext, alignmentProgress] = sessionUser
    ? await Promise.all([
        getUserPatContext(sessionUser),
        getUserAlignmentProgress(sessionUser),
      ])
    : [null, null];

  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <div className="pat-label">Individual insights</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
          Reviewable insight structure for the individual layer
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          This page establishes the individual-facing insight pattern now using the PAT person data scaffold. The deeper individual signal path is still intentionally light, but the route now sits on subject-backed person plumbing instead of remaining presentation-only.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
          Person subject: <span className="font-semibold text-[var(--shell-ink)]">{userPatContext?.subjectMembershipReady ? "Ready" : "Fallback"}</span>
        </div>
        <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
          Individual submissions: <span className="font-semibold text-[var(--shell-ink)]">{userPatContext?.assessmentCount ?? 0}</span>
        </div>
        <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
          Latest score: <span className="font-semibold text-[var(--shell-ink)]">{userPatContext?.latestScore ?? "--"}</span>
        </div>
        <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
          Pro membership unlock: <span className="font-semibold text-[var(--shell-ink)]">{alignmentProgress?.tier1Unlocked ? "Visible" : "Pending assessment"}</span>
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--shell-ink)]">Pro membership</h2>
          <p className="mt-1 text-sm text-[var(--shell-muted)]">
            Current-state individual insight cards that will unlock when the person-native assessment layer is added.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {USER_TIER1_INSIGHT_DEFINITIONS.map((card) => (
            <div key={card.key} className="pat-card p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="text-lg font-semibold text-[var(--shell-ink)]">{card.title}</div>
                <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${
                  alignmentProgress?.tier1Unlocked
                    ? "bg-[var(--shell-accent)]/10 text-[var(--shell-accent)]"
                    : "bg-slate-100 text-slate-600"
                }`}>
                  {alignmentProgress?.tier1Unlocked ? "Visible" : "Pending"}
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
                {alignmentProgress?.tier1Unlocked
                  ? card.description
                  : "Complete the individual alignment assessment to unlock this Pro membership PAT view."}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--shell-ink)]">Elite membership</h2>
          <p className="mt-1 text-sm text-[var(--shell-muted)]">
            Blue locked cards remain visible so the future PAT layer is easy to review now.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {USER_TIER2_INSIGHT_DEFINITIONS.map((card) => (
            <div
              key={card.key}
              title="Unlock with Elite membership"
              className="rounded-[24px] border border-[rgba(79,191,226,0.28)] bg-[rgba(79,191,226,0.13)] p-6 shadow-[0_24px_60px_rgba(15,23,42,0.06)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="text-lg font-semibold text-[var(--shell-ink)]">{card.title}</div>
                <span className="rounded-full bg-[rgba(6,54,116,0.1)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--shell-accent)]">
                  Locked
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">{card.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="flex flex-wrap gap-3">
        <Link className="pat-button-primary" href="/user/alignment-assessment">
          {alignmentProgress?.tier1Unlocked ? "Review alignment assessment" : "Start alignment assessment"}
        </Link>
        <Link className="pat-button-secondary" href="/user">
          Back to individual home
        </Link>
        <Link className="pat-button-secondary" href={sessionUser ? "/user" : "/sign-in/user"}>
          {sessionUser ? "Open individual workspace" : "Sign in as individual"}
        </Link>
      </section>
    </div>
  );
}
