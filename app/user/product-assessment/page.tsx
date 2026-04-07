import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";
import { getUserAlignmentProgress, getUserPatContext } from "@/lib/userPat";

export const dynamic = "force-dynamic";

export default async function UserProductAssessmentPage() {
  const sessionUser = await getSessionUser();
  const [userPatContext, alignmentProgress] = sessionUser
    ? await Promise.all([
        getUserPatContext(sessionUser),
        getUserAlignmentProgress(sessionUser),
      ])
    : [null, null];

  const readinessChecks = [
    {
      title: "Shared product model",
      status: "Source-live",
      ready: true,
      detail:
        "PAT already has shared product records, product subjects, and an INDIVIDUAL assessment perspective in the data model.",
    },
    {
      title: "Person subject membership",
      status: sessionUser
        ? userPatContext?.subjectMembershipReady
          ? "Ready"
          : "Fallback"
        : "Sign in required",
      ready: Boolean(userPatContext?.subjectMembershipReady),
      detail: sessionUser
        ? userPatContext?.subjectMembershipReady
          ? "The signed-in individual account is attached to a person subject, so person-native PAT storage is available."
          : "PAT can still render the route, but local subject-backed person storage is not fully ready in this environment."
        : "Sign in with an individual account to verify person-subject readiness for this route.",
    },
    {
      title: "Individual product runtime",
      status: "Not enabled",
      ready: false,
      detail:
        "There is no live individual product module, submit route, or persisted INDIVIDUAL product-assessment plan in the current runtime.",
    },
    {
      title: "Individual product insight consumer",
      status: "Not enabled",
      ready: false,
      detail:
        "PAT does not yet have a person-level product insight path that reads and explains individual product submissions truthfully.",
    },
  ] as const;

  const enabledCheckCount = readinessChecks.filter((check) => check.ready).length;
  const helpHref = "/user/help?topic=product-assessment";

  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <div className="pat-label">Individual product assessment</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
          Structured staging for person-level product signal
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          PAT already has person subjects and the shared product model, but it does not yet have a truthful individual
          product-assessment runtime. This route now shows exactly what is live versus what still blocks a real
          person-level product review flow.
        </p>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="pat-soft-panel p-5">
          <div className="pat-label">Progress card</div>
          <div className="mt-3 text-3xl font-semibold tracking-tight text-[var(--shell-ink)]">
            {enabledCheckCount}/{readinessChecks.length}
          </div>
          <div className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
            Enablement checks are live for this route. PAT is intentionally not collecting person-level product scores
            until the missing runtime pieces exist.
          </div>
          <div className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
            Auth state: <span className="font-semibold text-[var(--shell-ink)]">{sessionUser ? "Signed in" : "Signed out"}</span>
          </div>
          <div className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
            Person subject:{" "}
            <span className="font-semibold text-[var(--shell-ink)]">
              {sessionUser
                ? userPatContext?.subjectMembershipReady
                  ? "Ready"
                  : "Fallback"
                : "Unavailable"}
            </span>
          </div>
          <div className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
            Live person-level PAT signal today:{" "}
            <span className="font-semibold text-[var(--shell-ink)]">
              {alignmentProgress ? "Individual alignment assessment" : "Sign in required"}
            </span>
          </div>
        </div>

        <Link href={helpHref} className="pat-soft-panel pat-soft-panel-interactive block p-5">
          <div className="pat-label">Help card</div>
          <div className="mt-3 text-2xl font-semibold tracking-tight text-[var(--shell-ink)]">
            Individual product-assessment help
          </div>
          <div className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
            Open the scoped help view for what PAT already has, what is still missing, and why this route is staged
            instead of pretending a live product-review flow exists.
          </div>
        </Link>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--shell-ink)]">Current truth</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--shell-muted)]">
            These checks separate source-live plumbing from the runtime pieces PAT still needs before individual
            product review can open truthfully.
          </p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          {readinessChecks.map((check) => (
            <div key={check.title} className="pat-card p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="text-xl font-semibold text-[var(--shell-ink)]">{check.title}</div>
                <span
                  className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] ${
                    check.ready
                      ? "bg-[var(--shell-accent)]/10 text-[var(--shell-accent)]"
                      : "border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] text-[var(--shell-muted)]"
                  }`}
                >
                  {check.status}
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">{check.detail}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="pat-card p-6">
        <div className="pat-label">Why PAT is holding this back</div>
        <div className="mt-4 grid gap-3 text-sm leading-6 text-[var(--shell-muted)]">
          <div>There is no live individual product submit route yet, so PAT cannot persist person-level product review honestly.</div>
          <div>There is no truthful product-selection contract tying an individual to reviewable products inside the current workspace.</div>
          <div>No individual product insight or unlock path consumes person-level product submissions yet.</div>
          <div>The route should stay on the shared PAT product model when enabled, not branch into a parallel individual-only product system.</div>
        </div>
      </section>

      <section className="pat-card p-6">
        <div className="pat-label">What you can do now</div>
        <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
          The live person-native path today is the individual alignment assessment. That route uses the existing PAT
          survey runtime and feeds the current individual insight surface without inventing product behavior that is not
          built yet.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="pat-button-primary" href={sessionUser ? "/user/alignment-assessment" : "/sign-in/user"}>
            {alignmentProgress ? "Open alignment assessment" : "Sign in as individual"}
          </Link>
          <Link className="pat-button-secondary" href={sessionUser ? "/user/insights" : "/user/help"}>
            {sessionUser ? "Open individual insights" : "Review individual help"}
          </Link>
          <Link className="pat-button-secondary" href="/user">
            Back to individual home
          </Link>
        </div>
      </section>
    </div>
  );
}
