import Link from "next/link";
import { getLocalReviewUsersForUi } from "@/lib/auth/localReview";
import { signInWithLocalReviewCredentials } from "@/lib/auth/localReviewActions";
import { signInWithPilotCredentials } from "@/lib/auth/pilotPasswordActions";
import type { PatRouteRole } from "@/lib/patNavigation";
import { patRoleConfigs } from "@/lib/patNavigation";
import { getAuthRuntimeStatus } from "@/lib/auth/runtime";
import { isInviteeAccessEnabled } from "@/lib/invitee/access";

type RoleSignInPageProps = {
  role: PatRouteRole;
};

export default function RoleSignInPage({ role }: RoleSignInPageProps) {
  const config = patRoleConfigs[role];
  const authRuntime = getAuthRuntimeStatus();
  const inviteeAccessEnabled = isInviteeAccessEnabled();
  const localReviewUsers = getLocalReviewUsersForUi();
  const localReviewKey = role === "user" ? "individual" : role;
  const localReviewUser = localReviewUsers.find((entry) => entry.key === localReviewKey) ?? null;
  const primaryHref =
    authRuntime.githubAuthEnabled || authRuntime.localReviewProviderReady || !inviteeAccessEnabled
      ? "/sign-in"
      : "/sign-in/invitee";
  const primaryLabel =
    authRuntime.githubAuthEnabled || authRuntime.localReviewProviderReady || !inviteeAccessEnabled
      ? "Open sign-in hub"
      : "Continue with access code";
  const roleRedirect = role === "user" ? "/user" : `/${role}`;

  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <div className="pat-label">{config.label} sign-in</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
          Enter PAT through the {config.label.toLowerCase()} path
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          {authRuntime.githubAuthEnabled || authRuntime.localReviewProviderReady
            ? `This role entry route stays thin on purpose. It uses the existing login and callback-safe auth flow, then returns the user to the ${config.label.toLowerCase()} homepage route so the rest of the PAT structure can stay consistent.`
            : !authRuntime.diagnosticsVisible
              ? `Sign in with your provisioned pilot account below to enter the ${config.label.toLowerCase()} workspace.`
              : inviteeAccessEnabled
                ? `Local GitHub auth is not ready right now, so this role route keeps the PAT surface usable by sending invitees through the controlled access-code path instead of a broken sign-in dead-end.`
                : `This role route stays explicit when local auth is unavailable. Review the local PAT auth setup first, then continue into the existing protected login flow once GitHub is configured.`}
        </p>
        {authRuntime.localReviewProviderReady ? (
          <div className="mt-5 rounded-[18px] border border-sky-200 bg-sky-50 px-4 py-4 text-sm leading-6 text-sky-950">
            <div className="font-semibold">Development-only local review auth is enabled.</div>
            <div className="mt-2">
              This route can create a real loopback-only Auth.js session for deterministic {config.label.toLowerCase()} review without GitHub. It is not available on public production origins.
            </div>
            {localReviewUser ? (
              <>
                <div className="mt-2">
                  Review identity: <span className="font-semibold text-[var(--shell-ink)]">{localReviewUser.email}</span>. Successful sign-in returns directly to <span className="font-semibold text-[var(--shell-ink)]">{localReviewUser.redirectTo}</span>.
                </div>
                <div className="mt-2 text-xs leading-5 text-[var(--shell-muted)]">
                  Documented local-review password spelling: `pat-local-review` with hyphens, unless the running server sets a different PAT_LOCAL_REVIEW_PASSWORD.
                </div>
              </>
            ) : null}
            {localReviewUser ? (
              <form className="mt-4 grid gap-3 md:max-w-md" action={signInWithLocalReviewCredentials}>
                <input type="hidden" name="email" value={localReviewUser.email} />
                <input type="hidden" name="redirectTo" value={roleRedirect} />
                <input type="hidden" name="source" value="sign-in" />
                <input type="hidden" name="view" value={localReviewUser.key} />
                <input
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Local review password"
                  className="pat-input"
                />
                <div className="flex flex-wrap gap-3">
                  <button type="submit" className="pat-button-primary">
                    Continue with local review
                  </button>
                  <Link className="pat-button-secondary" href="/sign-in">
                    Open sign-in hub
                  </Link>
                </div>
              </form>
            ) : null}
          </div>
        ) : null}
        <div className="mt-6 rounded-[18px] border border-[var(--shell-border)] bg-white/80 p-5 text-sm leading-6 text-[var(--shell-muted)]">
          <div className="font-semibold text-[var(--shell-ink)]">Provisioned pilot account</div>
          <p className="mt-2">
            Use the operator-created username and temporary password for the {config.label.toLowerCase()} pilot path. If the account requires first-login rotation, PAT will send you to the password update screen before protected routes open.
          </p>
          <form className="mt-4 grid gap-3 md:max-w-md" action={signInWithPilotCredentials}>
            <input type="hidden" name="redirectTo" value={roleRedirect} />
            <input type="hidden" name="source" value="sign-in" />
            <input type="hidden" name="view" value={localReviewKey} />
            <input
              name="email"
              type="email"
              autoComplete="username"
              placeholder="Provisioned pilot email"
              className="pat-input"
              required
            />
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              placeholder="Provisioned pilot password"
              className="pat-input"
              required
            />
            <button type="submit" className="pat-button-primary">
              Continue with provisioned account
            </button>
          </form>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          {!authRuntime.localReviewProviderReady ? (
            <Link className="pat-button-primary" href={primaryHref}>
              {primaryLabel}
            </Link>
          ) : null}
          <Link className="pat-button-secondary" href="/sign-in">
            Back to sign-in hub
          </Link>
          {!authRuntime.ready && authRuntime.diagnosticsVisible ? (
            <Link className="pat-button-secondary" href={config.signInHref}>
              Review local auth setup
            </Link>
          ) : null}
        </div>
      </section>

      {authRuntime.diagnosticsVisible ? (
        <section className="grid gap-4 md:grid-cols-3">
          <div className="pat-soft-panel p-5 text-sm leading-6 text-[var(--shell-muted)]">
            Entry route: <span className="font-semibold text-[var(--shell-ink)]">/sign-in/{role}</span>
          </div>
          <div className="pat-soft-panel p-5 text-sm leading-6 text-[var(--shell-muted)]">
            Callback target: <span className="font-semibold text-[var(--shell-ink)]">/{role}</span>
          </div>
          <div className="pat-soft-panel p-5 text-sm leading-6 text-[var(--shell-muted)]">
            Auth plumbing: <span className="font-semibold text-[var(--shell-ink)]">{authRuntime.localReviewProviderReady ? "role-specific local review or GitHub from /sign-in" : "canonical /sign-in hub"}</span>
          </div>
        </section>
      ) : null}

      {!authRuntime.ready && authRuntime.diagnosticsVisible ? (
        <section className="pat-card p-6">
          <div className="rounded-[18px] border border-amber-200 bg-amber-50/90 p-4 text-sm leading-6 text-amber-900">
            <div className="font-semibold">Local GitHub auth is not ready for this PAT route.</div>
            <div className="mt-2">Missing env: {authRuntime.missing.join(", ")}</div>
            <div className="mt-2">Expected callback: {authRuntime.callbackUrl ?? "Set AUTH_URL or NEXTAUTH_URL first"}</div>
            {authRuntime.githubUnavailableReason ? (
              <div className="mt-2">{authRuntime.githubUnavailableReason}</div>
            ) : null}
            {authRuntime.localReviewEnabled ? (
              <div className="mt-2">
                Local review mode is requested, but the runtime is still missing the password or stable auth secret required to create a real session.
              </div>
            ) : null}
            {inviteeAccessEnabled ? (
              <div className="mt-2">
                Access-code entry is enabled locally, so you can still review the {config.label.toLowerCase()} surface through `/sign-in/invitee`.
              </div>
            ) : null}
          </div>
        </section>
      ) : null}
    </div>
  );
}
