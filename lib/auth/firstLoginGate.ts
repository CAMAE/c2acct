/**
 * First-login password gate — one decision table shared by the middleware
 * (proxy.ts) and the password-update page, so the two can never disagree.
 *
 * Wait-state box item 1 (2026-09-10): the middleware redirects protected pages
 * to /sign-in/password-update from the JWT claim `mustChangePassword`; the page
 * used to redirect straight back to `returnTo` whenever the DATABASE said no
 * update was needed. A session issued while the flag was on, kept after the
 * flag was cleared (admin untick, provisioning script, support), therefore
 * looped: 307 /firm → 307 /sign-in/password-update → 307 /firm → … until the
 * cookie happened to be rewritten. The page now sends a stale claim through
 * /api/auth/claims, a route handler that re-reads the DB into the token and
 * only then returns the user to `returnTo`.
 *
 * Flag-dark: a user whose DB flag is still set sees the form exactly as before;
 * a user with a fresh token never reaches the page.
 */

export type MiddlewareGate = "password-update" | "pass";
export type PageGate = "sign-in" | "invalid" | "form" | "refresh-claim";

/** proxy.ts: protected page + token claim → send to the password-update page. */
export function middlewareGate(input: { isProtectedPage: boolean; tokenMustChangePassword: boolean }): MiddlewareGate {
  return input.isProtectedPage && input.tokenMustChangePassword ? "password-update" : "pass";
}

/** /sign-in/password-update: what to do for this session against the DB row. */
export function pageGate(input: {
  hasSession: boolean;
  userFound: boolean;
  dbMustChangePassword: boolean;
  hasPasswordHash: boolean;
  /** What the session reports; informational only — see the comment below. */
  tokenMustChangePassword: boolean;
}): PageGate {
  if (!input.hasSession) return "sign-in";
  if (!input.userFound) return "invalid";
  if (input.dbMustChangePassword || !input.hasPasswordHash) return "form";
  // DB says done. The page cannot see the cookie's claim: `auth()` runs the
  // jwt callback, which re-reads the user row, so the session in a server
  // component always reflects the DB even while the cookie still says true
  // (proved live on the 2026-09-10 preview: the "return-to" branch looped).
  // The only way onto this page with the DB done is the middleware acting on
  // a stale cookie — so always refresh the claim, then return.
  return "refresh-claim";
}

export const CLAIM_REFRESH_PATH = "/api/auth/claims";

export function claimRefreshHref(returnTo: string): string {
  return `${CLAIM_REFRESH_PATH}?returnTo=${encodeURIComponent(returnTo)}`;
}
