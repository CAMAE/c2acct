import Link from "next/link";
import { cookies } from "next/headers";
import { signIn } from "@/auth";
import { signInWithLocalReviewCredentials } from "@/lib/auth/localReviewActions";
import MeetPatContent from "@/app/components/pat/MeetPatContent";
import { getPresentLocalAuthCookies, summarizeLocalAuthCookies } from "@/lib/auth/cookies";
import { getLocalReviewUsersForUi } from "@/lib/auth/localReview";
import { getAuthRuntimeStatus } from "@/lib/auth/runtime";
import { isInviteeAccessEnabled } from "@/lib/invitee/access";
import { submitInviteeCode } from "@/app/sign-in/invitee/actions";
import { getRequestLocaleMessages } from "@/lib/requestLocale";

export const metadata = {
  title: "Sign In | C2Acct",
  description: "Role-oriented sign-in hub for PAT.",
};

type SearchParams = Record<string, string | string[] | undefined>;
type AccessView = "vendor" | "firm" | "individual" | "admin" | "invitee" | "pat" | "help";

function getSingleParam(value: string | string[] | undefined) {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
}

function isAccessView(value: string | null): value is AccessView {
  return value === "vendor" || value === "firm" || value === "individual" || value === "admin" || value === "invitee" || value === "pat" || value === "help";
}

function getViewHref(view: AccessView) {
  return view === "vendor" ? "/sign-in" : `/sign-in?view=${view}`;
}

function describeAuthError(error: string | null, cookieState: ReturnType<typeof summarizeLocalAuthCookies>) {
  if (error === "local_review_disabled") {
    return "Local review sign-in is disabled in this runtime. Set PAT_ENABLE_LOCAL_REVIEW_AUTH=1 in non-production development before using the seeded PAT review identities.";
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
  modeLabel,
  githubReady,
  githubUnavailableReason,
  callbackUrl,
  canonicalLocalOrigin,
  localReviewEnabled,
  localReviewRequested,
  localReviewEmail,
  inviteeAccessEnabled,
}: {
  title: string;
  subtitle: string;
  body: string;
  roleRedirect: string;
  view: "vendor" | "firm" | "individual" | "admin";
  signInLabel: string;
  accessCodeLabel: string;
  localAuthLabel: string;
  modeLabel: string;
  githubReady: boolean;
  githubUnavailableReason: string | null;
  callbackUrl: string | null;
  canonicalLocalOrigin: string;
  localReviewEnabled: boolean;
  localReviewRequested: boolean;
  localReviewEmail: string | null;
  inviteeAccessEnabled: boolean;
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
      <div className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
        Landing route: <span className="font-semibold text-[var(--shell-ink)]">{roleRedirect}</span>
      </div>
      <div className="mt-1 text-sm leading-6 text-[var(--shell-muted)]">
        Active sign-in mode: <span className="font-semibold text-[var(--shell-ink)]">{modeLabel}</span>
      </div>
      <div className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
        GitHub remains strict and seeded-user only. If a non-provisioned GitHub account is denied, use the deterministic local review identity for this role when local review mode is enabled.
      </div>
      <div className="mt-1 text-sm leading-6 text-[var(--shell-muted)]">
        Canonical local origin: <span className="font-semibold text-[var(--shell-ink)]">{canonicalLocalOrigin}</span>
      </div>

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
          <Link className="pat-button-primary" href={`/login?callbackUrl=${encodeURIComponent(roleRedirect)}`}>
            {localAuthLabel}
          </Link>
        )}
      </div>

      {localReviewEnabled && localReviewEmail ? (
        <div className="mt-6 rounded-[18px] border border-sky-200 bg-sky-50/90 p-5 text-sm leading-6 text-sky-950">
          <div className="font-semibold">Development-only local review auth</div>
          <div className="mt-2">
            This route can create a real local Auth.js session without GitHub only in non-production review mode. It is never a production sign-in path.
          </div>
          <div className="mt-3">
            Review identity: <span className="font-semibold text-[var(--shell-ink)]">{localReviewEmail}</span>
          </div>
          <div className="mt-2">
            Successful sign-in returns directly to <span className="font-semibold text-[var(--shell-ink)]">{roleRedirect}</span>.
          </div>
          <form className="mt-4 grid gap-3 md:max-w-md" action={signInWithLocalReviewCredentials}>
            <input type="hidden" name="email" value={localReviewEmail} />
            <input type="hidden" name="redirectTo" value={roleRedirect} />
            <input type="hidden" name="source" value="sign-in" />
            <input type="hidden" name="view" value={view} />
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
              <div className="mt-2 text-xs leading-5 text-[var(--shell-muted)]">
                GitHub is kept here for production-style checks, but only PAT users already provisioned in the local database are allowed through.
              </div>
            </div>
          ) : null}
          <div className="mt-3 text-xs leading-5 text-[var(--shell-muted)]">
            Requires `PAT_ENABLE_LOCAL_REVIEW_AUTH=1`, a stable `AUTH_SECRET`, and `PAT_LOCAL_REVIEW_PASSWORD` in local env.
          </div>
          {!githubReady && githubUnavailableReason ? (
            <div className="mt-3 rounded-[16px] border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">
              <div className="font-semibold">GitHub is intentionally unavailable here.</div>
              <div className="mt-1">{githubUnavailableReason}</div>
              <div className="mt-1">
                Required callback: <span className="font-semibold text-[var(--shell-ink)]">{callbackUrl ?? `${canonicalLocalOrigin}/api/auth/callback/github`}</span>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {localReviewRequested && !localReviewEnabled ? (
        <div className="mt-6 rounded-[18px] border border-amber-200 bg-amber-50/90 p-5 text-sm leading-6 text-amber-900">
          <div className="font-semibold">Local review mode is requested but not ready.</div>
          <div className="mt-2">
            This runtime is not showing a local role-entry form because PAT_LOCAL_REVIEW_PASSWORD or AUTH_SECRET is missing or unstable.
          </div>
          <div className="mt-2">
            Until that is fixed, this route only supports the working GitHub or invitee path shown above.
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
  authCookiesPresent,
}: {
  messages: Awaited<ReturnType<typeof getRequestLocaleMessages>>["signIn"];
  callbackTarget: string;
  authReady: boolean;
  localReviewReady: boolean;
  localReviewRequested: boolean;
  inviteeAccessEnabled: boolean;
  authCookiesPresent: string[];
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
        {messages.helpCards.map((card) => (
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
          {messages.githubAuth}: <span className="font-semibold text-[var(--shell-ink)]">{authReady ? messages.authReady : messages.authNeedsConfig}</span>
        </div>
        <div className="mt-2">
          Local review auth: <span className="font-semibold text-[var(--shell-ink)]">{localReviewReady ? "enabled and write-capable" : localReviewRequested ? "requested but not fully configured" : "disabled"}</span>
        </div>
        <div className="mt-2">
          {messages.inviteeAccess}: <span className="font-semibold text-[var(--shell-ink)]">{inviteeAccessEnabled ? messages.enabled : messages.disabled}</span>
        </div>
        <div className="mt-2">
          {messages.localAuthCookies}: <span className="font-semibold text-[var(--shell-ink)]">{authCookiesPresent.length > 0 ? authCookiesPresent.join(", ") : "none"}</span>
        </div>
      </div>
    </section>
  );
}

export default async function SignInHubPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const messages = await getRequestLocaleMessages();
  const requestedView = getSingleParam(resolvedSearchParams?.view);
  const activeView: AccessView = isAccessView(requestedView) ? requestedView : "vendor";
  const authError = getSingleParam(resolvedSearchParams?.error);
  const authReset = getSingleParam(resolvedSearchParams?.authReset) === "1";
  const authResetReason = getSingleParam(resolvedSearchParams?.authResetReason);
  const authRuntime = getAuthRuntimeStatus();
  const inviteeAccessEnabled = isInviteeAccessEnabled();
  const authCookiesPresent = getPresentLocalAuthCookies(await cookies());
  const authCookieState = summarizeLocalAuthCookies(authCookiesPresent);
  const authErrorCopy = describeAuthError(authError, authCookieState);
  const localReviewUsers = getLocalReviewUsersForUi();
  const localReviewEmailByKey = new Map(localReviewUsers.map((entry) => [entry.key, entry.email]));
  const toggleOptions: { id: AccessView; label: string }[] = [
    { id: "vendor", label: messages.signIn.vendor },
    { id: "firm", label: messages.signIn.firm },
    { id: "individual", label: messages.signIn.individual },
    ...(authRuntime.localReviewEnabled ? [{ id: "admin" as const, label: "Admin" }] : []),
    { id: "invitee", label: messages.signIn.invitee },
    { id: "pat", label: messages.signIn.meetPat },
    { id: "help", label: messages.signIn.help },
  ];

  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <div className="pat-label">{messages.signIn.eyebrow}</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
          {authRuntime.localReviewProviderReady ? "Choose a PAT role and sign in with the path this runtime actually supports." : messages.signIn.heroTitle}
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          {authRuntime.localReviewProviderReady
            ? "Local review mode is active, so vendor, firm, individual, and admin routes expose deterministic seeded identities that create real Auth.js sessions. GitHub remains available where configured, but only already-provisioned PAT users are admitted."
            : authRuntime.localReviewEnabled
              ? "Local review mode was requested but is not fully configured. PAT is hiding broken role-entry controls until the missing local auth pieces are fixed."
              : messages.signIn.heroBody}
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
        <div className="mt-6">
          <InlineAccessSelectorWithOptions activeView={activeView} toggleOptions={toggleOptions} />
        </div>
      </section>

      {activeView === "vendor" ? (
        <RoleAccessCard
          title={messages.signIn.vendorTitle}
          subtitle={messages.signIn.vendorSubtitle}
          body={messages.signIn.roleBody}
          roleRedirect="/vendor"
          view="vendor"
          signInLabel={messages.common.continueWithGitHub}
          accessCodeLabel={messages.common.continueWithAccessCode}
          localAuthLabel={messages.common.reviewLocalAuthSetup}
          modeLabel={authRuntime.localReviewProviderReady ? "Deterministic local vendor review" : authRuntime.githubAuthEnabled ? "GitHub" : inviteeAccessEnabled ? "Access code compatibility path" : "GitHub setup required"}
          githubReady={authRuntime.githubAuthEnabled}
          githubUnavailableReason={authRuntime.githubUnavailableReason}
          callbackUrl={authRuntime.callbackUrl}
          canonicalLocalOrigin={authRuntime.canonicalLocalOrigin}
          localReviewEnabled={authRuntime.localReviewProviderReady}
          localReviewRequested={authRuntime.localReviewEnabled}
          localReviewEmail={localReviewEmailByKey.get("vendor") ?? null}
          inviteeAccessEnabled={inviteeAccessEnabled}
        />
      ) : null}

      {activeView === "firm" ? (
        <RoleAccessCard
          title={messages.signIn.firmTitle}
          subtitle={messages.signIn.firmSubtitle}
          body={messages.signIn.roleBody}
          roleRedirect="/firm"
          view="firm"
          signInLabel={messages.common.continueWithGitHub}
          accessCodeLabel={messages.common.continueWithAccessCode}
          localAuthLabel={messages.common.reviewLocalAuthSetup}
          modeLabel={authRuntime.localReviewProviderReady ? "Deterministic local firm review" : authRuntime.githubAuthEnabled ? "GitHub" : inviteeAccessEnabled ? "Access code compatibility path" : "GitHub setup required"}
          githubReady={authRuntime.githubAuthEnabled}
          githubUnavailableReason={authRuntime.githubUnavailableReason}
          callbackUrl={authRuntime.callbackUrl}
          canonicalLocalOrigin={authRuntime.canonicalLocalOrigin}
          localReviewEnabled={authRuntime.localReviewProviderReady}
          localReviewRequested={authRuntime.localReviewEnabled}
          localReviewEmail={localReviewEmailByKey.get("firm") ?? null}
          inviteeAccessEnabled={inviteeAccessEnabled}
        />
      ) : null}

      {activeView === "individual" ? (
        <RoleAccessCard
          title={messages.signIn.individualTitle}
          subtitle={messages.signIn.individualSubtitle}
          body={messages.signIn.roleBody}
          roleRedirect="/user"
          view="individual"
          signInLabel={messages.common.continueWithGitHub}
          accessCodeLabel={messages.common.continueWithAccessCode}
          localAuthLabel={messages.common.reviewLocalAuthSetup}
          modeLabel={authRuntime.localReviewProviderReady ? "Deterministic local individual review" : authRuntime.githubAuthEnabled ? "GitHub" : inviteeAccessEnabled ? "Access code compatibility path" : "GitHub setup required"}
          githubReady={authRuntime.githubAuthEnabled}
          githubUnavailableReason={authRuntime.githubUnavailableReason}
          callbackUrl={authRuntime.callbackUrl}
          canonicalLocalOrigin={authRuntime.canonicalLocalOrigin}
          localReviewEnabled={authRuntime.localReviewProviderReady}
          localReviewRequested={authRuntime.localReviewEnabled}
          localReviewEmail={localReviewEmailByKey.get("individual") ?? null}
          inviteeAccessEnabled={inviteeAccessEnabled}
        />
      ) : null}

      {activeView === "admin" ? (
        <RoleAccessCard
          title="Admin/operator"
          subtitle="Local operator access"
          body="Use the deterministic admin review account for local-only operator review. This path exists for development review and uses a real Auth.js session when enabled."
          roleRedirect="/admin"
          view="admin"
          signInLabel={messages.common.continueWithGitHub}
          accessCodeLabel={messages.common.continueWithAccessCode}
          localAuthLabel={messages.common.reviewLocalAuthSetup}
          modeLabel={authRuntime.localReviewProviderReady ? "Deterministic local admin review" : authRuntime.githubAuthEnabled ? "GitHub" : "Local admin review not ready"}
          githubReady={authRuntime.githubAuthEnabled}
          githubUnavailableReason={authRuntime.githubUnavailableReason}
          callbackUrl={authRuntime.callbackUrl}
          canonicalLocalOrigin={authRuntime.canonicalLocalOrigin}
          localReviewEnabled={authRuntime.localReviewProviderReady}
          localReviewRequested={authRuntime.localReviewEnabled}
          localReviewEmail={localReviewEmailByKey.get("admin") ?? null}
          inviteeAccessEnabled={inviteeAccessEnabled}
        />
      ) : null}

      {activeView === "invitee" ? (
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
          callbackTarget={authRuntime.callbackUrl ?? "/sign-in"}
          authReady={authRuntime.githubAuthEnabled}
          localReviewReady={authRuntime.localReviewProviderReady}
          localReviewRequested={authRuntime.localReviewEnabled}
          inviteeAccessEnabled={inviteeAccessEnabled}
          authCookiesPresent={authCookiesPresent}
        />
      ) : null}
    </div>
  );
}
