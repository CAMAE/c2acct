import Link from "next/link";
import { cookies } from "next/headers";
import MeetPatContent from "@/app/components/pat/MeetPatContent";
import { getPresentLocalAuthCookies } from "@/lib/auth/cookies";
import { getAuthRuntimeStatus } from "@/lib/auth/runtime";
import { signInWithLocalReviewCredentials } from "@/lib/auth/localReviewActions";

export const metadata = {
  title: "Sign In | C2Acct",
  description: "Production PAT sign-in hub.",
};

type SearchParams = Record<string, string | string[] | undefined>;
type AccessView = "vendor" | "firm" | "individual" | "admin" | "help";

function getSingleParam(value: string | string[] | undefined) {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
}

function sanitizeRedirect(target: string | null) {
  if (!target) return null;
  return target.startsWith("/") ? target : null;
}

function isAccessView(value: string | null): value is AccessView {
  return value === "vendor" || value === "firm" || value === "individual" || value === "admin" || value === "help";
}

function describeAuthError(error: string | null) {
  if (error === "missing_credentials") {
    return "Enter both email and password to continue.";
  }

  if (error === "invalid_credentials") {
    return "The email or password did not match a provisioned PAT account.";
  }

  if (error === "auth_unavailable") {
    return "Credentials auth is not ready in this runtime. Set AUTH_URL and AUTH_SECRET before retrying.";
  }

  if (error === "invitee_retired") {
    return "Invitee access is no longer part of the live production sign-in path. Use a provisioned PAT email and password instead.";
  }

  if (error === "AccessDenied") {
    return "That account is not provisioned for PAT or does not have a valid password hash.";
  }

  if (error === "CallbackRouteError" || error === "JWTSessionError" || error === "InvalidCheck") {
    return "Auth state is stale. Reset local auth cookies, then retry sign-in.";
  }

  return null;
}

function getViewHref(view: AccessView) {
  return view === "vendor" ? "/sign-in" : `/sign-in?view=${view}`;
}

function RoleCard({
  title,
  subtitle,
  view,
  redirectTo,
  reviewEmail,
  callbackUrl,
}: {
  title: string;
  subtitle: string;
  view: "vendor" | "firm" | "individual" | "admin";
  redirectTo: string;
  reviewEmail: string | null;
  callbackUrl: string | null;
}) {
  const requestedRedirect = callbackUrl ?? redirectTo;

  return (
    <section className="pat-card p-8">
      <div className="pat-label">{title}</div>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--shell-ink)]">{subtitle}</h2>
      <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
        PAT now uses one first-party credentials path for production and local review. If the selected role does not
        match the authenticated account, PAT lands on the account&apos;s actual home route instead of forcing the wrong
        portal.
      </p>
      <div className="mt-4 text-sm leading-6 text-[var(--shell-muted)]">
        Requested landing route: <span className="font-semibold text-[var(--shell-ink)]">{requestedRedirect}</span>
      </div>
      {reviewEmail ? (
        <div className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
          Deterministic QA identity: <span className="font-semibold text-[var(--shell-ink)]">{reviewEmail}</span>
        </div>
      ) : null}
      <form className="mt-6 grid gap-4 md:max-w-md" action={signInWithLocalReviewCredentials}>
        <input type="hidden" name="redirectTo" value={requestedRedirect} />
        <input type="hidden" name="source" value="sign-in" />
        <input type="hidden" name="view" value={view} />
        <input
          name="email"
          type="email"
          autoComplete="username"
          placeholder="Email"
          defaultValue={reviewEmail ?? ""}
          className="pat-input"
        />
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Password"
          className="pat-input"
        />
        <button type="submit" className="pat-button-primary">
          Sign in
        </button>
      </form>
    </section>
  );
}

function HelpCard({
  callbackTarget,
  authReady,
  authCookiesPresent,
  operatorSteps,
}: {
  callbackTarget: string;
  authReady: boolean;
  authCookiesPresent: string[];
  operatorSteps: string[];
}) {
  return (
    <section className="pat-card p-8">
      <div className="pat-label">Help</div>
      <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--shell-ink)]">Auth recovery and operator setup</h2>
      <div className="mt-5 rounded-[18px] border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-5 text-sm leading-6 text-[var(--shell-muted)]">
        <div>
          Active callback target: <span className="font-semibold text-[var(--shell-ink)]">{callbackTarget}</span>
        </div>
        <div className="mt-2">
          Credentials auth: <span className="font-semibold text-[var(--shell-ink)]">{authReady ? "ready" : "needs env configuration"}</span>
        </div>
        <div className="mt-2">
          Auth cookies: <span className="font-semibold text-[var(--shell-ink)]">{authCookiesPresent.length > 0 ? authCookiesPresent.join(", ") : "none"}</span>
        </div>
      </div>
      <div className="mt-6 grid gap-4">
        {operatorSteps.map((step) => (
          <div key={step} className="rounded-[18px] border border-[var(--shell-border)] bg-white/80 px-4 py-4 text-sm leading-6 text-[var(--shell-muted)]">
            {step}
          </div>
        ))}
      </div>
      <div className="mt-6">
        <Link className="pat-button-secondary" href="/api/auth/local-reset">
          Reset local auth cookies
        </Link>
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
  const requestedView = getSingleParam(resolvedSearchParams?.view);
  const activeView: AccessView = isAccessView(requestedView) ? requestedView : "vendor";
  const authRuntime = getAuthRuntimeStatus();
  const callbackUrl = sanitizeRedirect(
    getSingleParam(resolvedSearchParams?.callbackUrl) ?? getSingleParam(resolvedSearchParams?.redirectTo)
  );
  const authError = describeAuthError(getSingleParam(resolvedSearchParams?.error));
  const authReset = getSingleParam(resolvedSearchParams?.authReset) === "1";
  const authResetReason = getSingleParam(resolvedSearchParams?.authResetReason);
  const authCookiesPresent = getPresentLocalAuthCookies(await cookies());
  const localReviewEmailByKey = new Map(authRuntime.localReviewUsers.map((entry) => [entry.key, entry.email]));
  const views: Array<{ id: AccessView; label: string }> = [
    { id: "vendor", label: "Vendor" },
    { id: "firm", label: "Firm" },
    { id: "individual", label: "Individual" },
    { id: "admin", label: "Admin" },
    { id: "help", label: "Help" },
  ];

  return (
    <div className="space-y-8">
      <section className="pat-card p-8">
        <div className="pat-label">PAT sign-in</div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[var(--shell-ink)]">
          One credentials path for vendor, firm, individual, and admin.
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-[var(--shell-muted)]">
          PAT now authenticates through first-party credentials backed by provisioned users in the database. GitHub
          loops, callback mismatch errors, and invitee-only live access are removed from the production path.
        </p>
        <div className="mt-3 text-sm leading-6 text-[var(--shell-muted)]">
          Canonical auth origin: <span className="font-semibold text-[var(--shell-ink)]">{authRuntime.resolvedBaseUrl ?? authRuntime.canonicalLocalOrigin}</span>
        </div>
        {callbackUrl ? (
          <div className="mt-2 text-sm leading-6 text-[var(--shell-muted)]">
            After sign-in PAT will return to <span className="font-semibold text-[var(--shell-ink)]">{callbackUrl}</span>.
          </div>
        ) : null}
        {authReset ? (
          <div className="mt-5 rounded-[18px] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm leading-6 text-emerald-900">
            {authResetReason === "stale_callback"
              ? "Auth cookies were cleared after stale callback state."
              : "Auth cookies were cleared. Retry sign-in with a clean browser state."}
          </div>
        ) : null}
        {authError ? (
          <div className="mt-5 rounded-[18px] border border-rose-200 bg-rose-50 px-4 py-4 text-sm leading-6 text-rose-900">
            {authError}
          </div>
        ) : null}
        <div className="mt-6 inline-flex flex-wrap gap-2 rounded-full border border-[var(--shell-border)] bg-[var(--shell-panel-soft)] p-1.5">
          {views.map((option) => {
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
      </section>

      {activeView === "vendor" ? (
        <RoleCard
          title="Vendor"
          subtitle="Vendor portal access"
          view="vendor"
          redirectTo="/vendor"
          reviewEmail={authRuntime.localReviewEnabled ? localReviewEmailByKey.get("vendor") ?? null : null}
          callbackUrl={callbackUrl}
        />
      ) : null}

      {activeView === "firm" ? (
        <RoleCard
          title="Firm"
          subtitle="Firm portal access"
          view="firm"
          redirectTo="/firm"
          reviewEmail={authRuntime.localReviewEnabled ? localReviewEmailByKey.get("firm") ?? null : null}
          callbackUrl={callbackUrl}
        />
      ) : null}

      {activeView === "individual" ? (
        <RoleCard
          title="Individual"
          subtitle="Individual portal access"
          view="individual"
          redirectTo="/user"
          reviewEmail={authRuntime.localReviewEnabled ? localReviewEmailByKey.get("individual") ?? null : null}
          callbackUrl={callbackUrl}
        />
      ) : null}

      {activeView === "admin" ? (
        <RoleCard
          title="Admin"
          subtitle="Operator control-plane access"
          view="admin"
          redirectTo="/admin"
          reviewEmail={authRuntime.localReviewEnabled ? localReviewEmailByKey.get("admin") ?? null : null}
          callbackUrl={callbackUrl}
        />
      ) : null}

      {activeView === "help" ? (
        <HelpCard
          callbackTarget={callbackUrl ?? "/sign-in"}
          authReady={authRuntime.credentialsAuthEnabled}
          authCookiesPresent={authCookiesPresent}
          operatorSteps={authRuntime.operatorSteps}
        />
      ) : null}

      <MeetPatContent />
    </div>
  );
}
