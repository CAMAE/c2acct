import Link from "next/link";
import { notFound } from "next/navigation";
import InsightStatusBadge from "@/app/components/insights/InsightStatusBadge";
import { getSessionUser } from "@/lib/auth/session";
import {
  getUserAlignmentProgress,
  getUserInsightDefinition,
  getUserPatContext,
} from "@/lib/userPat";

export const dynamic = "force-dynamic";

type Params = {
  key: string;
};

function formatDate(value: Date | null | undefined) {
  return value instanceof Date ? value.toLocaleDateString() : "No live submission yet";
}

export default async function UserInsightDetailPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { key } = await params;
  const insight = getUserInsightDefinition(key);
  if (!insight) {
    notFound();
  }

  const sessionUser = await getSessionUser();
  const [userPatContext, alignmentProgress] = sessionUser
    ? await Promise.all([
        getUserPatContext(sessionUser),
        getUserAlignmentProgress(sessionUser),
      ])
    : [null, null];

  const isTier2 = insight.tier === 2;
  const isVisible = !isTier2 && Boolean(alignmentProgress?.tier1Unlocked);
  const statusLabel = isTier2 ? "Locked" : isVisible ? "Visible" : "Pending";
  const statusTone = isTier2 ? "locked" : isVisible ? "active" : "muted";

  return (
    <div className="space-y-8">
      <section className={`${isTier2 ? "pat-card pat-card-muted" : "pat-card"} p-8`}>
        <div className="pat-label">Individual insight detail</div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <h1 className="text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
            {insight.title}
          </h1>
          <InsightStatusBadge label={statusLabel} tone={statusTone} />
        </div>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          {isTier2
            ? `${insight.description} This remains a staged detail view only. PAT is not claiming a live individual projection, comparison, or richer guidance engine here yet.`
            : `${insight.description} This route is intentionally disciplined: it uses the live person-level alignment state PAT already has, but it does not fabricate a deeper per-insight narrative that the current individual model cannot support.`}
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-4">
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Person subject:{" "}
            <span className="font-semibold text-[var(--shell-ink)]">
              {sessionUser ? (userPatContext?.subjectMembershipReady ? "Ready" : "Fallback") : "Guest"}
            </span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Alignment submissions:{" "}
            <span className="font-semibold text-[var(--shell-ink)]">{userPatContext?.assessmentCount ?? 0}</span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Latest score:{" "}
            <span className="font-semibold text-[var(--shell-ink)]">{userPatContext?.latestScore ?? "--"}</span>
          </div>
          <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Alignment coverage:{" "}
            <span className="font-semibold text-[var(--shell-ink)]">
              {alignmentProgress ? `${alignmentProgress.answeredCount}/${alignmentProgress.questionCount}` : "0/20"}
            </span>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="pat-button-secondary" href="/user/insights">
            Back to individual insights
          </Link>
          <Link className="pat-button-primary" href="/user/alignment-assessment">
            {alignmentProgress?.tier1Unlocked ? "Review alignment assessment" : "Start alignment assessment"}
          </Link>
          <Link className="pat-button-secondary" href={sessionUser ? "/user" : "/sign-in/user"}>
            {sessionUser ? "Open individual workspace" : "Sign in as individual"}
          </Link>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-3">
        <article className="pat-card p-6">
          <div className="pat-label">What this insight is</div>
          <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
            {insight.description}
          </p>
        </article>
        <article className="pat-card p-6">
          <div className="pat-label">What data is currently available</div>
          <div className="mt-4 space-y-2 text-sm leading-6 text-[var(--shell-muted)]">
            <p>
              PAT can currently show whether the person subject is live, how many final submissions exist, the latest score, and whether the individual alignment route has crossed the current Pro visibility gate.
            </p>
            <p>
              Latest submission date:{" "}
              <span className="font-semibold text-[var(--shell-ink)]">
                {formatDate(userPatContext?.latestSubmittedAt)}
              </span>
            </p>
          </div>
        </article>
        <article className="pat-card p-6">
          <div className="pat-label">Why deeper interpretation is limited</div>
          <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
            PAT does not yet have a dedicated individual insight engine, no per-insight evidence breakdown, no person-native question-cluster analysis, and no live benchmark or projection layer for this audience. That means a richer narrative here would be fabricated rather than sourced from real runtime output.
          </p>
        </article>
      </section>

      <section className="pat-card p-6">
        <div className="pat-label">What would unlock fuller detail</div>
        <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--shell-muted)]">
          {!isTier2 ? (
            <>
              <p>
                First, the person needs a completed individual alignment submission so the current Pro visibility gate is grounded in live data rather than an empty scaffold.
              </p>
              <p>
                Second, PAT would need a real individual insight runtime that computes per-insight evidence, not just a general alignment completion state.
              </p>
            </>
          ) : (
            <>
              <p>
                Elite remains locked because PAT does not yet have an individual benchmark, projection, or comparison layer that would justify higher-order interpretation.
              </p>
              <p>
                A fuller Elite detail page would require both the person-native insight engine and a broader evidence layer beyond current individual alignment completion.
              </p>
            </>
          )}
        </div>
      </section>

      <section className="pat-card p-6">
        <div className="pat-label">Current PAT truth</div>
        <div className="mt-4 space-y-3 text-sm leading-6 text-[var(--shell-muted)]">
          <p>
            Pro visibility state:{" "}
            <span className="font-semibold text-[var(--shell-ink)]">
              {alignmentProgress?.tier1Unlocked ? "Unlocked by live alignment submission" : "Still pending a live alignment submission"}
            </span>
          </p>
          <p>
            Current route behavior is intentionally limited. This page exists so PAT has a real destination for individual insight review, but it does not claim an individual productized intelligence layer that is not present in source.
          </p>
        </div>
      </section>
    </div>
  );
}
