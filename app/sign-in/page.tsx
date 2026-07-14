import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { getSessionUser } from "@/lib/auth/session";
import { resolveUserAudienceHome } from "@/lib/audienceGuard";
import { AUDIENCE_HOME_PATH } from "@/lib/audiencePolicy";
import { signInWithLocalReviewCredentials } from "@/lib/auth/localReviewActions";
import { signInWithPilotCredentials } from "@/lib/auth/pilotPasswordActions";
import {
  buildCanonicalSignInPath,
  inferCanonicalSignInView,
  resolvePostAuthRedirectForView,
  sanitizeAuthRedirect,
  type CanonicalSignInView,
} from "@/lib/auth/routes";
import MeetPatContent from "@/app/components/pat/MeetPatContent";
import { getPresentLocalAuthCookies, summarizeLocalAuthCookies } from "@/lib/auth/cookies";
import { getLocalReviewUsersForUi } from "@/lib/auth/localReview";
import { getAuthRuntimeStatus } from "@/lib/auth/runtime";
import { isInviteeAccessEnabled } from "@/lib/invitee/access";
import { submitInviteeCode } from "@/app/sign-in/invitee/actions";
import { isConsultantAccessEnabled } from "@/lib/consultantAccess";
import {
  getPilotDisabledMessage,
  isIndividualSurfacesEnabled,
  isInviteeSurfacesEnabled,
} from "@/lib/pilotSurfaces";
import { getRequestLocaleMessages } from "@/lib/requestLocale";

export const metadata = {
  title: "Sign In | Patalign",
  description: "Role-oriented sign-in hub for PAT.",
};

type SearchParams = Record<string, string | string[] | undefined>;
type AccessView = CanonicalSignInView | "invitee" | "pat" | "help";

function getSingleParam(value: string | string[] | undefined) {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
}

function isAccessView(value: string | null): value is AccessView {
  return value === "vendor" || value === "firm" || value === "individual" || value === "admin" || value === "consultant" || value === "invitee" || value === "pat" || value === "help";
}

function getViewHref(view: AccessView) {
  return view === "vendor" ? "/sign-in" : `/sign-in?view=${view}`;
}

function describeAuthError(error: string | null, cookieState: ReturnType<typeof summarizeLocalAuthCookies>) {
  if (error === "local_review_disabled") {
    return "Local review sign-in is disabled in this runtime. It requires PAT_ENABLE_LOCAL_REVIEW_AUTH=1 and loopback-only local origins before seeded PAT review identities can be used.";
  }

  if (error === "local_review_secret_missing") {
    return "Local review sign-in is blocked because AUTH_SECRET or NEXTAUTH_SECRET is missing. Auth.js cannot create a real review session until that secret is set.";
  }

  if (error === "local_review_password_missing") {
    return "Local review sign-in is enabled, but PAT_LOCAL_REVIEW_PASSWORD is missing or blank in the running dev server. Restart the app with PAT_LOCAL_REVIEW_PASSWORD=pat-local-review before retrying.";
  }

  if (error === "local_review_password_mismatch") {
    return "The submitted local review password does not match the running dev server. Restart with PAT_LOCAL_REVIEW_PASSWORD=pat-local-review or use the exact configured value.";
  }

  if (error === "local_review_invalid_user") {
    return "That local review identity is not part of the seeded deterministic PAT review users. Use one of the listed review.*@pat.local accounts.";
  }

  if (error === "local_review_invalid" || error === "CredentialsSignin") {
    return "Local review sign-in failed after the credentials handoff. Confirm local review is enabled, AUTH_SECRET is stable, and PAT_LOCAL_REVIEW_PASSWORD matches the running dev server.";
  }

  if (error === "pilot_password_missing") {
    return "Enter the provisioned pilot account email and password.";
  }

  if (error === "pilot_password_invalid") {
    return "That pilot account could not be signed in. Confirm the admin-provisioned email, temporary password, and account status.";
  }

  if (error === "AccessDenied") {
    return "The authenticated account is not provisioned for PAT. Use a seeded local review identity or add the user locally before retrying.";
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

function InlineAccessSelectorWithOptions({
  activeView,
  toggleOptions,
}: {
  activeView: AccessView;
  toggleOptions: Array<{ id: AccessView; label: string }>;
}) {
  return (
    <div className="inline-flex flex-wrap gap-2 rounded-full border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-1.5">
      {toggleOptions.map((option) => {
        const active = option.id === activeView;
        return (
          <Link
            key={option.id}
            href={getViewHref(option.id)}
            className={`rounded-full border px-4 py-2.5 text-sm font-medium leading-none ${
              active
                ? "border-[rgba(6,54,116,0.16)] bg-[rgba(6,54,116,0.06)] text-[var(--shell-ink)]"
                : "border-transparent text-[var(--shell-muted)] hover:border-[rgba(6,54,116,0.18)] hover:bg-white"
            }`}
          >
            {option.label}
          </Link>
        );
      })}
    </div>
  );
}

function RoleAccessCard({
  title,
  subtitle,
  body,
  roleRedirect,
  view,
  signInLabel,
  accessCodeLabel,
  localAuthLabel,
  githubReady,
  localReviewEnabled,
  localReviewRequested,
  localReviewEmail,
  inviteeAccessEnabled,
  hubHref,
  submittedEmail,
  diagnosticsVisible,
}: {
  title: string;
  subtitle: string;
  body: string;
  roleRedirect: string;
  view: "vendor" | "firm" | "individual" | "admin" | "consultant";
  signInLabel: string;
  accessCodeLabel: string;
  localAuthLabel: string;
  githubReady: boolean;
  localReviewEnabled: boolean;
  localReviewRequested: boolean;
  localReviewEmail: string | null;
  inviteeAccessEnabled: boolean;
  hubHref: string;
  submittedEmail: string | null;
  diagnosticsVisible: boolean;
}) {
  return (
    <section className="pat-card p-8">
      <div className="pat-label">{title}</div>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--shell-ink)]">
        {subtitle}
      </h2>
      <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
        {body}
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        {!localReviewEnabled && githubReady ? (
          <form
            action={async () => {
              "use server";
              await signIn("github", { redirectTo: roleRedirect });
            }}
          >
            <button type="submit" className="pat-button-primary">
              {signInLabel}
            </button>
          </form>
        ) : localReviewEnabled ? null : inviteeAccessEnabled ? (
          <Link className="pat-button-primary" href="/sign-in?view=invitee">
            {accessCodeLabel}
          </Link>
        ) : (
          <Link className="pat-button-primary" href={hubHref}>
            {localAuthLabel}
          </Link>
        )}
      </div>

      {localReviewEnabled && localReviewEmail ? (
        <div className="mt-6 rounded-[18px] border border-sky-200 bg-sky-50/90 p-5 text-sm leading-6 text-sky-950">
            <div className="font-semibold">Local review access</div>
            <div className="mt-2">
            Demo identity: <span className="font-semibold text-[var(--shell-ink)]">{localReviewEmail}</span>
            </div>
          <form className="mt-4 grid gap-3 md:max-w-md" action={signInWithLocalReviewCredentials}>
            <input type="hidden" name="email" value={localReviewEmail} />
            <input type="hidden" name="redirectTo" value={roleRedirect} />
            <input type="hidden" name="source" value="sign-in" />
            <input type="hidden" name="view" value={view} />
            <input
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="Local review password"
              className="pat-input"
            />
            <div className="flex flex-wrap gap-3">
              <button type="submit" className="pat-button-primary">
                Continue with local review
              </button>
            </div>
          </form>
          {githubReady ? (
            <div className="mt-3">
              <form
                action={async () => {
                  "use server";
                  await signIn("github", { redirectTo: roleRedirect });
                }}
              >
                <button type="submit" className="pat-button-secondary">
                  Continue with GitHub
                </button>
              </form>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="mt-6 rounded-[18px] border border-[var(--shell-border)] bg-white/80 p-5 text-sm leading-6 text-[var(--shell-muted)]">
        <div className="font-semibold text-[var(--shell-ink)]">Provisioned pilot account</div>
        <p className="mt-2">
          Vendor, firm, admin, and consultant pilot users sign in here after an operator provisions their account. First-login password updates are enforced when the account is flagged for a temporary or imported credential.
        </p>
        <form className="mt-4 grid gap-3 md:max-w-md" action={signInWithPilotCredentials}>
          <input type="hidden" name="redirectTo" value={roleRedirect} />
          <input type="hidden" name="source" value="sign-in" />
          <input type="hidden" name="view" value={view} />
          {/*
            Phase 2.5 #11: defeat browser credential autofill. Saved-password
            managers were substituting the operator's own email/password into
            pilot-user sign-ins. autoComplete="off" on the email plus
            "new-password" on the password suppresses the credential-pair
            autofill heuristics in Chrome/Safari/Firefox.
            Phase 2.5 #1: defaultValue re-fills the submitted email after a
            failed attempt (carried back via the error redirect).
          */}
          <input
            name="email"
            type="email"
            autoComplete="off"
            defaultValue={submittedEmail ?? undefined}
            placeholder="Provisioned pilot email"
            className="pat-input"
            required
          />
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="Provisioned pilot password"
            className="pat-input"
            required
          />
          <button type="submit" className="pat-button-primary">
            Continue with provisioned account
          </button>
        </form>
      </div>

      {diagnosticsVisible && localReviewRequested && !localReviewEnabled ? (
        <div className="mt-6 rounded-[18px] border border-amber-200 bg-amber-50/90 p-5 text-sm leading-6 text-amber-900">
          <div className="font-semibold">Local review mode is requested but not ready.</div>
          <div className="mt-2">
            This runtime is not showing a local role-entry form because PAT_LOCAL_REVIEW_PASSWORD or AUTH_SECRET is missing or unstable.
          </div>
          <div className="mt-2">
            Until that is fixed, this route only supports the working GitHub or access-code path shown above.
          </div>
        </div>
      ) : null}
    </section>
  );
}

function MeetPatInline() {
  return <MeetPatContent />;
}

function HelpInline({
  messages,
  callbackTarget,
  authReady,
  localReviewReady,
  localReviewRequested,
  inviteeAccessEnabled,
  helpCards,
  authCookiesPresent,
  resetPath,
  resetRedirectTo,
}: {
  messages: Awaited<ReturnType<typeof getRequestLocaleMessages>>["signIn"];
  callbackTarget: string;
  authReady: boolean;
  localReviewReady: boolean;
  localReviewRequested: boolean;
  inviteeAccessEnabled: boolean;
  helpCards: Awaited<ReturnType<typeof getRequestLocaleMessages>>["signIn"]["helpCards"];
  authCookiesPresent: string[];
  resetPath: string;
  resetRedirectTo: string;
}) {
  return (
    <section className="pat-card p-8">
      <div className="pat-label">{messages.helpEyebrow}</div>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--shell-ink)]">
        {messages.helpTitle}
      </h2>
      <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
        {messages.helpBody}
      </p>
      <div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {helpCards.map((card) => (
          <article key={card.title} className="pat-card p-6">
            <div className="text-xl font-semibold text-[var(--shell-ink)]">{card.title}</div>
            <p className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">{card.body}</p>
          </article>
        ))}
      </div>
      <div className="mt-6 rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-5 text-sm leading-6 text-[var(--shell-muted)]">
        <div>
          {messages.callbackTarget}: <span className="font-semibold text-[var(--shell-ink)]">{callbackTarget}</span>
        </div>
        <div className="mt-2">
          {messages.githubAuth}: <span className="font-semibold text-[var(--shell-ink)]">{authReady ? messages.authAvailable : messages.authNeedsConfig}</span>
        </div>
        <div className="mt-2">
          Local review auth: <span className="font-semibold text-[var(--shell-ink)]">{localReviewReady ? "enabled and write-capable" : localReviewRequested ? "requested but not fully configured" : "disabled"}</span>
        </div>
        <div className="mt-2">
          {inviteeAccessEnabled ? messages.inviteeAccess : "Access-code entry"}: <span className="font-semibold text-[var(--shell-ink)]">{inviteeAccessEnabled ? messages.enabled : messages.disabled}</span>
        </div>
        <div className="mt-2">
          {messages.localAuthCookies}: <span className="font-semibold text-[var(--shell-ink)]">{authCookiesPresent.length > 0 ? authCookiesPresent.join(", ") : "none"}</span>
        </div>
        <form action={resetPath} method="post" className="mt-4">
          <input type="hidden" name="redirectTo" value={resetRedirectTo} />
          <input type="hidden" name="reason" value="stale_callback" />
          <button type="submit" className="pat-button-secondary">
            Reset local auth state
          </button>
        </form>
      </div>
    </section>
  );
}

export default async function SignInHubPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  // 13a defense-in-depth: an already-authenticated account never lingers on the
  // sign-in hub picking a wrong-role tab — route it straight to its home portal.
  // The route-level enforceAudience() remains the primary wall.
  const sessionUser = await getSessionUser();
  if (sessionUser) {
    const home = await resolveUserAudienceHome(sessionUser);
    if (home) redirect(AUDIENCE_HOME_PATH[home]);
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const messages = await getRequestLocaleMessages();
  const requestedView = getSingleParam(resolvedSearchParams?.view);
  const callbackUrl = getSingleParam(resolvedSearchParams?.callbackUrl);
  const redirectTo = getSingleParam(resolvedSearchParams?.redirectTo);
  const pilotDisabledSurface = getSingleParam(resolvedSearchParams?.pilotDisabled);
  const individualSurfacesEnabled = isIndividualSurfacesEnabled();
  const inviteeSurfacesEnabled = isInviteeSurfacesEnabled();
  const requestedTarget = sanitizeAuthRedirect(redirectTo ?? callbackUrl);
  const inferredView = inferCanonicalSignInView(requestedTarget);
  const rawRequestedAccessView: AccessView = isAccessView(requestedView)
    ? requestedView
    : inferredView ?? "vendor";
  const consultantAccessEnabled = isConsultantAccessEnabled();
  const consultantViewDisabled =
    rawRequestedAccessView === "consultant" && !consultantAccessEnabled;
  const requestedSurfaceDisabled =
    (rawRequestedAccessView === "individual" && !individualSurfacesEnabled) ||
    (rawRequestedAccessView === "invitee" && !inviteeSurfacesEnabled);
  const activeView: AccessView =
    consultantViewDisabled || requestedSurfaceDisabled ? "vendor" : rawRequestedAccessView;
  const authError = getSingleParam(resolvedSearchParams?.error);
  const rawSubmittedEmail = getSingleParam(resolvedSearchParams?.email);
  const submittedEmail =
    rawSubmittedEmail && rawSubmittedEmail.length <= 254 ? rawSubmittedEmail : null;
  const authReset = getSingleParam(resolvedSearchParams?.authReset) === "1";
  const authResetReason = getSingleParam(resolvedSearchParams?.authResetReason);
  const authRuntime = getAuthRuntimeStatus();
  const inviteeAccessEnabled = isInviteeAccessEnabled();
  const authCookiesPresent = getPresentLocalAuthCookies(await cookies());
  const authCookieState = summarizeLocalAuthCookies(authCookiesPresent);
  const authErrorCopy = describeAuthError(authError, authCookieState);
  const localReviewUsers = getLocalReviewUsersForUi();
  const localReviewEmailByKey = new Map(localReviewUsers.map((entry) => [entry.key, entry.email]));
  const requestedRoleRedirects: Record<CanonicalSignInView, string> = {
    vendor: resolvePostAuthRedirectForView("vendor", requestedTarget),
    firm: resolvePostAuthRedirectForView("firm", requestedTarget),
    individual: resolvePostAuthRedirectForView("individual", requestedTarget),
    admin: resolvePostAuthRedirectForView("admin", requestedTarget),
    consultant: resolvePostAuthRedirectForView("consultant", requestedTarget),
  };
  const resetRedirectTo = buildCanonicalSignInPath({
    callbackUrl,
    redirectTo,
    view: activeView,
  });
  const visibleHelpCards = messages.signIn.helpCards.filter((card) => {
    if (!individualSurfacesEnabled && card.title === messages.signIn.individual) {
      return false;
    }

    if (!inviteeSurfacesEnabled && card.title === messages.signIn.invitee) {
      return false;
    }

    return true;
  });
  const toggleOptions: { id: AccessView; label: string }[] = [
    { id: "vendor", label: messages.signIn.vendor },
    { id: "firm", label: messages.signIn.firm },
    ...(individualSurfacesEnabled ? [{ id: "individual" as const, label: messages.signIn.individual }] : []),
    ...(consultantAccessEnabled ? [{ id: "consultant" as const, label: "Consultant" }] : []),
    // Admin tab is always shown (operators sign in via the provisioned-account
    // form in the admin card; the form renders regardless of local-review state).
    // Previously gated on authRuntime.localReviewEnabled, which is false in
    // production, so the tab was invisible and admins had no way in — Phase 2.5 #2.
    { id: "admin", label: "Admin" },
    ...(inviteeSurfacesEnabled ? [{ id: "invitee" as const, label: messages.signIn.invitee }] : []),
    { id: "pat", label: messages.signIn.meetPat },
    { id: "help", label: messages.signIn.help },
  ];
  const pilotDisabledMessage =
    getPilotDisabledMessage(pilotDisabledSurface) ??
    (requestedSurfaceDisabled
      ? getPilotDisabledMessage(rawRequestedAccessView === "individual" ? "individual" : "invitee")
      : null);

  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <div className="pat-label">{messages.signIn.eyebrow}</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
          Sign in to your PAT workspace.
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          Choose your role below and continue with your provisioned credentials.
        </p>
        {authReset ? (
          <div className="mt-5 rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm leading-6 text-emerald-900">
            {authResetReason === "stale_callback"
              ? "Local auth state was cleared after a stale callback or invalid PKCE/state flow. Session, callback, and verifier cookies were removed so you can retry sign-in cleanly."
              : "Local auth state was cleared. Session, callback, and PKCE cookies were removed so you can retry sign-in with a clean local browser state."}
          </div>
        ) : null}
        {authErrorCopy ? (
          <div className="mt-5 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm leading-6 text-rose-900">
            {authErrorCopy}
          </div>
        ) : null}
        {consultantViewDisabled ? (
          <div className="mt-5 rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900">
            Consultant access is disabled in this runtime until the company-scoped consultant plane is explicitly re-enabled for proof. The vendor entry remains the default sign-in path here.
          </div>
        ) : null}
        {pilotDisabledMessage ? (
          <div className="mt-5 rounded-[18px] border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-6 text-amber-900">
            {pilotDisabledMessage}
          </div>
        ) : null}
        <div className="mt-6">
          <InlineAccessSelectorWithOptions activeView={activeView} toggleOptions={toggleOptions} />
        </div>
      </section>

      {activeView === "vendor" ? (
        <RoleAccessCard
          title={messages.signIn.vendorTitle}
          subtitle={messages.signIn.vendorSubtitle}
          body={messages.signIn.roleBody}
          roleRedirect={requestedRoleRedirects.vendor}
          view="vendor"
          signInLabel={messages.common.continueWithGitHub}
          accessCodeLabel={messages.common.continueWithAccessCode}
          localAuthLabel={messages.common.reviewLocalAuthSetup}
          githubReady={authRuntime.githubAuthEnabled}
          localReviewEnabled={authRuntime.localReviewProviderReady}
          localReviewRequested={authRuntime.localReviewEnabled}
          localReviewEmail={localReviewEmailByKey.get("vendor") ?? null}
          inviteeAccessEnabled={inviteeAccessEnabled}
          hubHref={buildCanonicalSignInPath({ callbackUrl: requestedRoleRedirects.vendor, view: "vendor" })}
          submittedEmail={submittedEmail}
          diagnosticsVisible={authRuntime.diagnosticsVisible}
        />
      ) : null}

      {activeView === "firm" ? (
        <RoleAccessCard
          title={messages.signIn.firmTitle}
          subtitle={messages.signIn.firmSubtitle}
          body={messages.signIn.roleBody}
          roleRedirect={requestedRoleRedirects.firm}
          view="firm"
          signInLabel={messages.common.continueWithGitHub}
          accessCodeLabel={messages.common.continueWithAccessCode}
          localAuthLabel={messages.common.reviewLocalAuthSetup}
          githubReady={authRuntime.githubAuthEnabled}
          localReviewEnabled={authRuntime.localReviewProviderReady}
          localReviewRequested={authRuntime.localReviewEnabled}
          localReviewEmail={localReviewEmailByKey.get("firm") ?? null}
          inviteeAccessEnabled={inviteeAccessEnabled}
          hubHref={buildCanonicalSignInPath({ callbackUrl: requestedRoleRedirects.firm, view: "firm" })}
          submittedEmail={submittedEmail}
          diagnosticsVisible={authRuntime.diagnosticsVisible}
        />
      ) : null}

      {individualSurfacesEnabled && activeView === "individual" ? (
        <RoleAccessCard
          title={messages.signIn.individualTitle}
          subtitle={messages.signIn.individualSubtitle}
          body={messages.signIn.roleBody}
          roleRedirect={requestedRoleRedirects.individual}
          view="individual"
          signInLabel={messages.common.continueWithGitHub}
          accessCodeLabel={messages.common.continueWithAccessCode}
          localAuthLabel={messages.common.reviewLocalAuthSetup}
          githubReady={authRuntime.githubAuthEnabled}
          localReviewEnabled={authRuntime.localReviewProviderReady}
          localReviewRequested={authRuntime.localReviewEnabled}
          localReviewEmail={localReviewEmailByKey.get("individual") ?? null}
          inviteeAccessEnabled={inviteeAccessEnabled}
          hubHref={buildCanonicalSignInPath({ callbackUrl: requestedRoleRedirects.individual, view: "individual" })}
          submittedEmail={submittedEmail}
          diagnosticsVisible={authRuntime.diagnosticsVisible}
        />
      ) : null}

      {activeView === "admin" ? (
        <RoleAccessCard
          title="Admin/operator"
          subtitle="Local operator access"
          body="Use the deterministic admin review account for local-only operator review. This path exists for development review and uses a real Auth.js session when enabled."
          roleRedirect={requestedRoleRedirects.admin}
          view="admin"
          signInLabel={messages.common.continueWithGitHub}
          accessCodeLabel={messages.common.continueWithAccessCode}
          localAuthLabel={messages.common.reviewLocalAuthSetup}
          githubReady={authRuntime.githubAuthEnabled}
          localReviewEnabled={authRuntime.localReviewProviderReady}
          localReviewRequested={authRuntime.localReviewEnabled}
          localReviewEmail={localReviewEmailByKey.get("admin") ?? null}
          inviteeAccessEnabled={inviteeAccessEnabled}
          hubHref={buildCanonicalSignInPath({ callbackUrl: requestedRoleRedirects.admin, view: "admin" })}
          submittedEmail={submittedEmail}
          diagnosticsVisible={authRuntime.diagnosticsVisible}
        />
      ) : null}

      {activeView === "consultant" ? (
        <RoleAccessCard
          title="Consultant"
          subtitle="Assigned briefing access"
          body="Use the consultant path to open only the firm briefings and product briefing slices explicitly assigned to this PAT user account. Consultant access is additive on the current user record, not a separate credentials plane, and it does not add fabricated executive narrative."
          roleRedirect={requestedRoleRedirects.consultant}
          view="consultant"
          signInLabel={messages.common.continueWithGitHub}
          accessCodeLabel={messages.common.continueWithAccessCode}
          localAuthLabel={messages.common.reviewLocalAuthSetup}
          githubReady={authRuntime.githubAuthEnabled}
          localReviewEnabled={authRuntime.localReviewProviderReady}
          localReviewRequested={authRuntime.localReviewEnabled}
          localReviewEmail={localReviewEmailByKey.get("consultant") ?? null}
          inviteeAccessEnabled={inviteeAccessEnabled}
          hubHref={buildCanonicalSignInPath({ callbackUrl: requestedRoleRedirects.consultant, view: "consultant" })}
          submittedEmail={submittedEmail}
          diagnosticsVisible={authRuntime.diagnosticsVisible}
        />
      ) : null}

      {inviteeSurfacesEnabled && activeView === "invitee" ? (
        <section className="pat-card p-8">
          <div className="pat-label">{messages.signIn.inviteeTitle}</div>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--shell-ink)]">
            {messages.signIn.inviteeSubtitle}
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
            {messages.signIn.roleBody}
          </p>
          <form className="mt-6 grid gap-4" action={submitInviteeCode}>
            <input
              name="code"
              type="text"
              autoComplete="off"
              placeholder={messages.common.enterAccessCode}
              className="pat-input max-w-md"
            />
            <div className="flex flex-wrap gap-3">
              <button type="submit" className="pat-button-primary">
                {messages.common.continueWithAccessCode}
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {activeView === "pat" ? <MeetPatInline /> : null}

      {activeView === "help" ? (
        <HelpInline
          messages={messages.signIn}
          helpCards={visibleHelpCards}
          callbackTarget={authRuntime.callbackUrl ?? "/sign-in"}
          authReady={authRuntime.githubAuthEnabled}
          localReviewReady={authRuntime.localReviewProviderReady}
          localReviewRequested={authRuntime.localReviewEnabled}
          inviteeAccessEnabled={inviteeAccessEnabled}
          authCookiesPresent={authCookiesPresent}
          resetPath={authRuntime.resetPath}
          resetRedirectTo={resetRedirectTo}
        />
      ) : null}
    </div>
  );
}
