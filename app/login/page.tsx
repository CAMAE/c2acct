import Link from "next/link";
import { cookies } from "next/headers";
import BrandLockup from "@/app/components/brand/BrandLockup";
import { signIn } from "@/auth";
import { getLocalReviewUsersForUi } from "@/lib/auth/localReview";
import { getPresentLocalAuthCookies, summarizeLocalAuthCookies } from "@/lib/auth/cookies";
import { getAuthRuntimeStatus } from "@/lib/auth/runtime";
import { isInviteeAccessEnabled } from "@/lib/invitee/access";

type SearchParams = Record<string, string | string[] | undefined>;

function getSingleParam(value: string | string[] | undefined) {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
}

function sanitizeRedirect(target: string | null) {
  if (!target) return "/";
  return target.startsWith("/") ? target : "/";
}

function describeDestination(path: string) {
  if (path.startsWith("/survey")) return "assessment readiness";
  if (path.startsWith("/results")) return "results";
  if (path.startsWith("/outputs")) return "insights";
  if (path.startsWith("/profiles")) return "profile";
  if (path.startsWith("/platform")) return "PAT platform";
  return "home";
}

function describeAuthError(error: string | null, cookieState: ReturnType<typeof summarizeLocalAuthCookies>) {
  if (error === "local_review_disabled") {
    return "Local review sign-in is disabled in this runtime. Set PAT_ENABLE_LOCAL_REVIEW_AUTH=1 in non-production development before using the seeded review identities.";
  }

  if (error === "local_review_secret_missing") {
    return "Local review sign-in is blocked because AUTH_SECRET or NEXTAUTH_SECRET is missing. Auth.js cannot mint a real local review session until the secret is set.";
  }

  if (error === "local_review_password_missing") {
    return "Local review sign-in is enabled, but PAT_LOCAL_REVIEW_PASSWORD is missing or blank in the running dev server. Restart the app with PAT_LOCAL_REVIEW_PASSWORD=pat-local-review before retrying.";
  }

  if (error === "local_review_password_mismatch") {
    return "The submitted local review password does not match the running dev server. Restart with PAT_LOCAL_REVIEW_PASSWORD=pat-local-review or use the exact password configured in the current runtime.";
  }

  if (error === "local_review_invalid_user") {
    return "That local review identity is not part of the seeded deterministic PAT review users. Use one of the listed review.*@pat.local accounts.";
  }

  if (error === "local_review_invalid" || error === "CredentialsSignin") {
    return "Local review sign-in failed after the credentials handoff. Confirm PAT local review auth is enabled, AUTH_SECRET is stable, and PAT_LOCAL_REVIEW_PASSWORD matches the running dev server.";
  }

  if (error === "AccessDenied") {
    return "The account that just authenticated is not provisioned in the PAT User table. Use a seeded local review identity or add the user locally before retrying.";
  }

  if (error === "CallbackRouteError" || error === "OAuthCallbackError" || error === "InvalidCheck") {
    return cookieState.hasPkce || cookieState.hasState
      ? "Auth callback state is stale or invalid. Reset local auth state to clear callback, state, and PKCE cookies before retrying."
      : "Auth callback state is invalid. Confirm AUTH_URL matches the browser origin before retrying sign-in.";
  }

  if (error === "Configuration") {
    return "Auth configuration is incomplete for this runtime. Review the local PAT auth env contract before retrying.";
  }

  return null;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const callbackUrl = getSingleParam(resolvedSearchParams?.callbackUrl);
  const redirectTo = getSingleParam(resolvedSearchParams?.redirectTo);
  const safeRedirect = sanitizeRedirect(redirectTo ?? callbackUrl);
  const destinationLabel = describeDestination(safeRedirect);
  const authRuntime = getAuthRuntimeStatus();
  const authReset = getSingleParam(resolvedSearchParams?.authReset) === "1";
  const authCookiesPresent = getPresentLocalAuthCookies(await cookies());
  const authCookieState = summarizeLocalAuthCookies(authCookiesPresent);
  const authError = getSingleParam(resolvedSearchParams?.error);
  const authResetReason = getSingleParam(resolvedSearchParams?.authResetReason);
  const authErrorCopy = describeAuthError(authError, authCookieState);
  const inviteeAccessEnabled = isInviteeAccessEnabled();
  const localReviewUsers = getLocalReviewUsersForUi();

  return (
    <section className="mx-auto max-w-4xl">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
        <div className="pat-card-strong p-8">
          <BrandLockup mode="hero" />
          <div className="pat-label mt-5">
            Performance Alignment Technology
          </div>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight">
            Sign in once and return to the exact step you meant to reach.
          </h1>
          <p className="pat-dark-copy mt-5 max-w-2xl text-base leading-7">
            Performance Alignment Technology uses callback-safe redirects so sign-in stays quiet and predictable. After authentication, you will return directly to {destinationLabel}.
          </p>
          <div className="pat-dark-panel mt-8 p-5">
            <div className="pat-label">
              Redirect target
            </div>
            <div className="pat-sans mt-2 text-lg font-semibold text-[var(--dark-surface-ink)]">{destinationLabel}</div>
            <div className="pat-dark-copy-soft mt-2 text-sm leading-6">
              Only relative in-product paths are honored. External redirect targets are discarded.
            </div>
          </div>
        </div>

        <div className="pat-card p-8">
          <div className="pat-label">
            Sign in
          </div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--shell-ink)]">
            {authRuntime.localReviewProviderReady ? "Use a seeded PAT review identity or an approved GitHub account" : "Use your approved GitHub account"}
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
            {authRuntime.localReviewProviderReady
              ? "Local review mode is the intended QA path in development. It uses seeded PAT identities and creates a real Auth.js session for protected PAT routes and write flows."
              : "GitHub sign-in remains strict. Only provisioned PAT users are allowed through, so Access Denied for an unseeded account is expected behavior rather than a broken sign-in flow."}
          </p>
          <div className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
            Canonical local origin: <span className="font-semibold text-[var(--shell-ink)]">{authRuntime.canonicalLocalOrigin}</span>
            {authRuntime.resolvedBaseUrl ? (
              <>
                {" "}
                · Resolved auth origin: <span className="font-semibold text-[var(--shell-ink)]">{authRuntime.resolvedBaseUrl}</span>
              </>
            ) : null}
          </div>

          {authReset ? (
            <div className="mt-6 rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm leading-6 text-emerald-900">
              {authResetReason === "stale_callback"
                ? "Local auth state was cleared after a stale callback or invalid PKCE/state flow. Session, callback, and verifier cookies were removed so you can retry sign-in cleanly."
                : "Local auth state was cleared. Session, callback, and PKCE cookies were removed so you can retry sign-in with a clean local browser state."}
            </div>
          ) : null}

          {authErrorCopy ? (
            <div className="mt-6 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm leading-6 text-rose-900">
              {authErrorCopy}
            </div>
          ) : null}

          {authRuntime.githubAuthEnabled ? (
            <div className="mt-8">
              <form
                action={async () => {
                  "use server";
                  await signIn("github", { redirectTo: safeRedirect });
                }}
              >
                <button
                  type="submit"
                  className="pat-button-primary w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--shell-accent)]"
                >
                  Continue with GitHub
                </button>
              </form>
              <div className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
                GitHub stays available for production-style review, but PAT still admits only provisioned users. If a non-seeded GitHub account hits Access Denied, use the development-only local review identities below for manual QA.
              </div>
            </div>
          ) : (
            <div className="mt-8 rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900">
              <div className="font-semibold">
                {authRuntime.githubProviderReady
                  ? "GitHub sign-in is intentionally unavailable in this local runtime."
                  : "GitHub sign-in is not configured for this local runtime."}
              </div>
              {authRuntime.githubUnavailableReason ? (
                <div className="mt-2">{authRuntime.githubUnavailableReason}</div>
              ) : null}
              <div className="mt-2">
                Missing env: {authRuntime.missing.join(", ")}
              </div>
              <div className="mt-2">
                Expected callback: {authRuntime.callbackUrl ?? "Set AUTH_URL to enable callback generation"}
              </div>
              {authRuntime.warnings.length > 0 ? (
                <div className="mt-2">
                  Local config warning:
                  <ul className="mt-1 list-disc pl-5">
                    {authRuntime.warnings.map((warning) => (
                      <li key={warning}>{warning}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <div className="mt-2">
                Operator steps:
                <ul className="mt-1 list-disc pl-5">
                  {authRuntime.operatorSteps.map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
              </div>
              <div className="mt-2">
                Performance Alignment Technology is blocking sign-in here so local users do not get sent into a broken GitHub 404.
              </div>
              {inviteeAccessEnabled ? (
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link className="pat-button-secondary" href="/sign-in/invitee">
                    Continue with access code
                  </Link>
                </div>
              ) : null}
            </div>
          )}

          {authRuntime.localReviewEnabled ? (
            <div className="mt-6 rounded-[20px] border border-sky-200 bg-sky-50 px-5 py-5 text-sm leading-6 text-sky-950">
              <div className="font-semibold">Development-only local review auth</div>
              <div className="mt-2">
                This path is available only when `NODE_ENV !== &quot;production&quot;` and `PAT_ENABLE_LOCAL_REVIEW_AUTH=1`. It creates a real Auth.js session for local review and is not a production sign-in mechanism.
              </div>
              <div className="mt-2">
                For local QA, start here instead of GitHub. Each seeded identity lands in its role portal with the same protected-session behavior used by PAT write flows.
              </div>
              {!authRuntime.localReviewProviderReady ? (
                <div className="mt-3 rounded-[16px] border border-amber-200 bg-amber-50 px-4 py-3 text-amber-900">
                  Local review mode is requested, but the session path is not ready yet. Set PAT_LOCAL_REVIEW_PASSWORD and keep AUTH_SECRET stable before trying the role-specific review entries.
                </div>
              ) : null}
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {localReviewUsers.map((reviewUser) => (
                  <Link
                    key={reviewUser.key}
                    href={`/sign-in?view=${reviewUser.key}`}
                    className="rounded-[16px] border border-sky-200 bg-white px-4 py-3 text-left transition-colors duration-150 hover:border-sky-300"
                  >
                    <div className="font-semibold text-[var(--shell-ink)]">{reviewUser.label}</div>
                    <div className="mt-1 text-xs text-[var(--shell-muted)]">{reviewUser.email}</div>
                  </Link>
                ))}
              </div>
              <div className="mt-4">
                Vendor returns to `/vendor`, firm to `/firm`, individual to `/user`, and admin/operator to `/admin` after sign-in.
              </div>
              <div className="mt-2 text-xs leading-5 text-[var(--shell-muted)]">
                Use the reset button below if stale OAuth, PKCE, or session cookies keep a review browser stuck in an old auth state.
              </div>
            </div>
          ) : null}

          <div className="pat-soft-panel mt-6 p-4 text-sm leading-6 text-[var(--shell-muted)]">
            <div className="font-semibold text-[var(--shell-ink)]">Local auth recovery</div>
            <div className="mt-2">
              If sign-in loops, JWTSessionError reports a secret mismatch, or the callback flow returns invalid state/PKCE errors, clear local auth cookies and retry.
            </div>
            <div className="mt-2">
              Expected callback: <span className="font-semibold text-[var(--shell-ink)]">{authRuntime.callbackUrl ?? "Set AUTH_URL or NEXTAUTH_URL first"}</span>
            </div>
            <div className="mt-2">
              Cookies detected: <span className="font-semibold text-[var(--shell-ink)]">{authCookiesPresent.length > 0 ? authCookiesPresent.join(", ") : "none"}</span>
            </div>
            <form action={authRuntime.resetPath} method="post" className="mt-4">
              <input type="hidden" name="redirectTo" value={`/login?callbackUrl=${encodeURIComponent(safeRedirect)}`} />
              <input type="hidden" name="reason" value="stale_callback" />
              <button type="submit" className="pat-button-secondary">
                Reset local auth state
              </button>
            </form>
          </div>

          {authRuntime.warnings.length > 0 ? (
            <div className="mt-6 rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900">
              <div className="font-semibold">Local env warnings</div>
              <ul className="mt-2 list-disc pl-5">
                {authRuntime.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
              <div className="mt-2">
                Blank values in `.env.local` are ignored for auth resolution. Remove them or replace them with real values if local auth still looks wrong.
              </div>
            </div>
          ) : null}

          <div className="pat-soft-panel mt-6 p-4 text-sm leading-6 text-[var(--shell-muted)]">
            Returning path: <span className="font-semibold text-[var(--shell-ink)]">{destinationLabel}</span>
          </div>

          <Link href="/" className="pat-link mt-5 inline-flex">
            Back to home
          </Link>
        </div>
      </div>
    </section>
  );
}
