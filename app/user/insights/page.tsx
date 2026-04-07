import Link from "next/link";
import InsightStatusBadge from "@/app/components/insights/InsightStatusBadge";
import InsightsModeShell from "@/app/components/insights/InsightsModeShell";
import { compactInsightSummary } from "@/app/components/insights/insightCardText";
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
    <InsightsModeShell
      hero={
        <>
          <section className="pat-card p-8">
            <div className="pat-label">Individual insights</div>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
              Reviewable insight structure for the individual layer
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
              This page keeps the individual-facing insight pattern reviewable now through live person-subject plumbing, while staying explicit that the deeper individual intelligence layer is still intentionally light.
            </p>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
              Person subject:{" "}
              <span className="font-semibold text-[var(--shell-ink)]">
                {userPatContext?.subjectMembershipReady ? "Ready" : "Fallback"}
              </span>
            </div>
            <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
              Individual submissions:{" "}
              <span className="font-semibold text-[var(--shell-ink)]">{userPatContext?.assessmentCount ?? 0}</span>
            </div>
            <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
              Latest score:{" "}
              <span className="font-semibold text-[var(--shell-ink)]">{userPatContext?.latestScore ?? "--"}</span>
            </div>
            <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
              Pro unlock:{" "}
              <span className="font-semibold text-[var(--shell-ink)]">
                {alignmentProgress?.tier1Unlocked ? "Visible" : "Pending assessment"}
              </span>
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
        </>
      }
      proContent={
        <>
          <div>
            <h2 className="text-2xl font-semibold text-[var(--shell-ink)]">Pro Insights</h2>
            <p className="mt-1 text-sm text-[var(--shell-muted)]">
              These individual cards now open disciplined detail pages. The detail stays intentionally limited to live person-level alignment state instead of pretending a deeper individual engine already exists.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {USER_TIER1_INSIGHT_DEFINITIONS.map((card) => {
              const visible = Boolean(alignmentProgress?.tier1Unlocked);
              return (
                <Link
                  key={card.key}
                  href={`/user/insights/${card.key}`}
                  className={`${visible ? "pat-card pat-card-interactive" : "pat-card pat-card-muted pat-card-muted-interactive"} block p-6`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="text-lg font-semibold text-[var(--shell-ink)]">{card.title}</div>
                    <InsightStatusBadge
                      label={visible ? "Visible" : "Pending"}
                      tone={visible ? "active" : "muted"}
                    />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
                    {visible
                      ? compactInsightSummary(card.description)
                      : "Complete the individual alignment assessment to unlock this Pro PAT view."}
                  </p>
                  <div className="mt-4 text-xs leading-5 text-[var(--shell-muted)]">
                    Limited detail available · live alignment state only.
                  </div>
                </Link>
              );
            })}
          </div>
        </>
      }
      eliteContent={
        <>
          <div>
            <h2 className="text-2xl font-semibold text-[var(--shell-ink)]">Elite Insights</h2>
            <p className="mt-1 text-sm text-[var(--shell-muted)]">
              Elite remains visible as a staged layer. The detail pages stay explicit about what is missing instead of fabricating benchmark, projection, or richer individual guidance.
            </p>
          </div>
          <section className="pat-card p-6">
            <div className="pat-label">Current route truth</div>
            <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
              Individual insight detail routes now exist, but they stay intentionally limited. These locked cards keep the next layer legible without inventing productized behavior that is not present in source.
            </p>
          </section>
          <div className="grid gap-5 md:grid-cols-2">
            {USER_TIER2_INSIGHT_DEFINITIONS.map((card) => (
              <Link
                key={card.key}
                href={`/user/insights/${card.key}`}
                title="Unlock with Elite membership"
                className="pat-card pat-card-muted pat-card-muted-interactive block p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="text-lg font-semibold text-[var(--shell-ink)]">{card.title}</div>
                  <InsightStatusBadge label="Locked" tone="locked" />
                </div>
                <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
                  {compactInsightSummary(card.description)}
                </p>
                <div className="mt-4 text-xs leading-5 text-[var(--shell-muted)]">
                  Staged only · limited locked detail available.
                </div>
              </Link>
            ))}
          </div>
        </>
      }
      helpContent={
        <>
          <div>
            <h2 className="text-2xl font-semibold text-[var(--shell-ink)]">How Pro and Elite differ here</h2>
            <p className="mt-1 text-sm text-[var(--shell-muted)]">
              The individual page is intentionally conservative. It uses live person-level alignment status where that plumbing exists, but it does not claim a full individual insight engine or per-insight evidence system that has not been built yet.
            </p>
          </div>
          <div className="grid gap-5 xl:grid-cols-3">
            <article className="pat-card p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="text-lg font-semibold text-[var(--shell-ink)]">Pro access</div>
                <InsightStatusBadge label="Pro Insights" />
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
                Pro uses the live individual alignment gate only. The detail routes now exist, but they stay disciplined and only show person-level alignment state PAT can really support today.
              </p>
            </article>
            <article className="pat-card pat-card-muted p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="text-lg font-semibold text-[var(--shell-ink)]">Elite access</div>
                <InsightStatusBadge label="Locked" tone="locked" />
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
                Elite remains staged only. Its detail routes explain the gap honestly, but they do not pretend the individual benchmark, projection, or richer guidance system is already present.
              </p>
            </article>
            <article className="pat-card p-6">
              <div className="text-lg font-semibold text-[var(--shell-ink)]">Next step</div>
              <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
                The truthful way forward is still the individual alignment assessment. That is the live person-level input path PAT can use today without inventing a separate intelligence engine.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link className="pat-button-primary" href="/user/alignment-assessment">
                  {alignmentProgress?.tier1Unlocked ? "Review alignment assessment" : "Start alignment assessment"}
                </Link>
                <Link className="pat-button-secondary" href="/user/help">
                  Review individual help
                </Link>
              </div>
            </article>
          </div>
        </>
      }
    />
  );
}
