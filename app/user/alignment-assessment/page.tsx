import Link from "next/link";
import ScoreLockup from "@/app/components/charts/ScoreLockup";
import ScoreBar from "@/app/components/charts/ScoreBar";
import CardChip, { CardChipRow } from "@/app/components/cards/CardChip";
import { redirect } from "next/navigation";
import { PatLogoLockup } from "@/app/components/brand/BrandMarks";
import MembershipSurfaceGate from "@/app/components/membership/MembershipSurfaceGate";
import { getSessionUser } from "@/lib/auth/session";
import { MEMBERSHIP_PLAN, resolveMembershipEntitlement } from "@/lib/membership";
import { getUserAlignmentProgress, getUserPatContext } from "@/lib/userPat";

export const dynamic = "force-dynamic";

export default async function UserAlignmentAssessmentPage() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    redirect("/sign-in/user");
  }
  const entitlement = await resolveMembershipEntitlement(sessionUser, "individual", MEMBERSHIP_PLAN.PRO);
  if (!entitlement.allowed) {
    return (
      <MembershipSurfaceGate
        audience="individual"
        surfaceLabel="Individual alignment assessment"
        title="Individual alignment assessment requires Pro membership"
        body="The person-level alignment assessment is part of the current Pro individual tier. PAT keeps the route visible so the upgrade path stays explicit, but the assessment runtime opens only after Pro is active."
        displayName={entitlement.membership.displayName}
        currentPlan={entitlement.membership.plan}
        currentStatus={entitlement.membership.status}
        requiredPlan={entitlement.requiredPlan}
        membershipHref={entitlement.membershipHref}
        upgradeHref={entitlement.upgradeHref}
        workspaceHref="/user"
        workspaceLabel="Open individual workspace"
        availableNow="The baseline individual state still keeps workspace entry, help, profile continuity, and membership routing available."
        upgradeNote="This assessment route is the current person-level intake path PAT uses for the individual Pro layer, so it does not open from the baseline state."
      />
    );
  }
  const [userPatContext, progress] = sessionUser
    ? await Promise.all([
        getUserPatContext(sessionUser),
        getUserAlignmentProgress(sessionUser),
      ])
    : [null, null];

  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <PatLogoLockup mode="hero" tone="light" />
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
          Person-level PAT alignment assessment
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          This route now uses the existing survey module pipeline with a seeded person-level PAT alignment module. It stays inside the current PAT architecture instead of creating a second user-only assessment system.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
          Assessment route: <span className="font-semibold text-[var(--shell-ink)]">{progress ? "Available" : "Sign in required"}</span>
        </div>
        <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
          Auth state: <span className="font-semibold text-[var(--shell-ink)]">{sessionUser ? "Signed in" : "Signed out"}</span>
        </div>
        <div className="pat-soft-panel p-4 text-sm leading-6 text-[var(--shell-muted)]">
          PAT subject link: <span className="font-semibold text-[var(--shell-ink)]">{userPatContext ? (userPatContext.subjectMembershipReady ? "Connected" : "Fallback path") : "Unavailable"}</span>
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
              <CardChipRow>
                <CardChip>{progress.answeredCount}/{progress.questionCount} answered</CardChip>
                <CardChip tone={progress.tier1Unlocked ? "positive" : "muted"}>
                  {progress.tier1Unlocked ? "Insights unlocked" : "Insights locked"}
                </CardChip>
              </CardChipRow>
              <div className="mt-4">
                <ScoreLockup
                  label="Latest score"
                  score={progress.latestScore ?? null}
                  context={progress.tier1Unlocked ? undefined : "Complete the assessment to open insights"}
                />
                <div className="mt-3">
                  <ScoreBar score={progress.latestScore ?? null} title={`${progress.title} latest score`} />
                </div>
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
        <div className="pat-label">Platform note</div>
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
