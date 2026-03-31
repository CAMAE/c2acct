import Link from "next/link";
import { getSessionUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function UserProductAssessmentPage() {
  const sessionUser = await getSessionUser();

  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <div className="pat-label">Individual product assessment</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
          Product-review scaffold for individual signal
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          This route is reserved for the next person-native product assessment layer. It is intentionally light in this pass so the individual architecture is reviewable without overbuilding the full journey.
        </p>
      </section>

      <section className="pat-card p-6">
        <div className="pat-label">What comes next</div>
        <div className="mt-4 grid gap-3 text-sm leading-6 text-[var(--shell-muted)]">
          <div>Route is live and linked from the individual homepage.</div>
          <div>Future product questions will connect to the same PAT product and insight model, not a parallel individual-only system.</div>
          <div>Current pass stops before full individual product signal collection.</div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link className="pat-button-secondary" href="/user">
            Back to individual home
          </Link>
          <Link className="pat-button-secondary" href={sessionUser ? "/vendor/product-insight" : "/sign-in/user"}>
            {sessionUser ? "Review live product intelligence" : "Sign in as individual"}
          </Link>
        </div>
      </section>
    </div>
  );
}
