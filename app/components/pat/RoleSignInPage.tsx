import Link from "next/link";
import { getLocalReviewUsersForUi } from "@/lib/auth/localReview";
import { signInWithLocalReviewCredentials } from "@/lib/auth/localReviewActions";
import { getAuthRuntimeStatus } from "@/lib/auth/runtime";
import type { PatRouteRole } from "@/lib/patNavigation";
import { patRoleConfigs } from "@/lib/patNavigation";

type RoleSignInPageProps = {
  role: PatRouteRole;
};

export default function RoleSignInPage({ role }: RoleSignInPageProps) {
  const config = patRoleConfigs[role];
  const authRuntime = getAuthRuntimeStatus();
  const localReviewUsers = getLocalReviewUsersForUi();
  const localReviewKey = role === "user" ? "individual" : role;
  const localReviewUser = localReviewUsers.find((entry) => entry.key === localReviewKey) ?? null;
  const roleRedirect = role === "user" ? "/user" : `/${role}`;

  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <div className="pat-label">{config.label} sign-in</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
          Enter PAT through the {config.label.toLowerCase()} path
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          This route uses the same credentials flow as the main sign-in hub. PAT will land on the account&apos;s actual
          portal if the supplied credentials do not belong to this role.
        </p>
        <div className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
          Requested landing route: <span className="font-semibold text-[var(--shell-ink)]">{roleRedirect}</span>
        </div>
        <form className="mt-6 grid gap-3 md:max-w-md" action={signInWithLocalReviewCredentials}>
          <input type="hidden" name="redirectTo" value={roleRedirect} />
          <input type="hidden" name="source" value="sign-in" />
          <input type="hidden" name="view" value={localReviewUser?.key ?? "vendor"} />
          <input
            name="email"
            type="email"
            autoComplete="username"
            placeholder="Email"
            defaultValue={authRuntime.localReviewEnabled ? localReviewUser?.email ?? "" : ""}
            className="pat-input"
          />
          <input
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Password"
            className="pat-input"
          />
          <div className="flex flex-wrap gap-3">
            <button type="submit" className="pat-button-primary">
              Sign in
            </button>
            <Link className="pat-button-secondary" href="/sign-in">
              Open sign-in hub
            </Link>
          </div>
        </form>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="pat-soft-panel p-5 text-sm leading-6 text-[var(--shell-muted)]">
          Entry route: <span className="font-semibold text-[var(--shell-ink)]">/sign-in/{role}</span>
        </div>
        <div className="pat-soft-panel p-5 text-sm leading-6 text-[var(--shell-muted)]">
          Callback target: <span className="font-semibold text-[var(--shell-ink)]">{roleRedirect}</span>
        </div>
        <div className="pat-soft-panel p-5 text-sm leading-6 text-[var(--shell-muted)]">
          Deterministic QA account: <span className="font-semibold text-[var(--shell-ink)]">{authRuntime.localReviewEnabled ? localReviewUser?.email ?? "none" : "disabled"}</span>
        </div>
      </section>
    </div>
  );
}
