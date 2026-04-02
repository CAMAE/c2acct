export type CanonicalSignInView = "vendor" | "firm" | "individual" | "admin";

type CanonicalSignInPathInput = {
  callbackUrl?: string | null;
  redirectTo?: string | null;
  authReset?: boolean | string | null;
  authResetReason?: string | null;
  error?: string | null;
  view?: string | null;
};

function isTruthyFlag(value: boolean | string | null | undefined) {
  return value === true || value === "1";
}

export function sanitizeAuthRedirect(target: string | null | undefined) {
  if (!target || !target.startsWith("/")) {
    return "/";
  }

  return target;
}

export function inferCanonicalSignInView(
  target: string | null | undefined
): CanonicalSignInView | null {
  const safeTarget = sanitizeAuthRedirect(target);

  if (
    safeTarget === "/admin" ||
    safeTarget.startsWith("/admin/") ||
    safeTarget === "/platform" ||
    safeTarget.startsWith("/platform/")
  ) {
    return "admin";
  }

  if (safeTarget === "/vendor" || safeTarget.startsWith("/vendor/")) {
    return "vendor";
  }

  if (
    safeTarget === "/firm" ||
    safeTarget.startsWith("/firm/") ||
    safeTarget === "/survey" ||
    safeTarget.startsWith("/survey/") ||
    safeTarget === "/results" ||
    safeTarget.startsWith("/results/") ||
    safeTarget === "/outputs" ||
    safeTarget.startsWith("/outputs/") ||
    safeTarget === "/profiles" ||
    safeTarget.startsWith("/profiles/")
  ) {
    return "firm";
  }

  if (safeTarget === "/user" || safeTarget.startsWith("/user/")) {
    return "individual";
  }

  return null;
}

export function buildCanonicalSignInPath(input: CanonicalSignInPathInput) {
  const params = new URLSearchParams();
  const safeCallbackUrl = input.callbackUrl ? sanitizeAuthRedirect(input.callbackUrl) : null;
  const safeRedirectTo = input.redirectTo ? sanitizeAuthRedirect(input.redirectTo) : null;
  const view =
    input.view === "vendor" ||
    input.view === "firm" ||
    input.view === "individual" ||
    input.view === "admin"
      ? input.view
      : inferCanonicalSignInView(safeRedirectTo ?? safeCallbackUrl);

  if (safeCallbackUrl) {
    params.set("callbackUrl", safeCallbackUrl);
  }

  if (safeRedirectTo) {
    params.set("redirectTo", safeRedirectTo);
  }

  if (view) {
    params.set("view", view);
  }

  if (isTruthyFlag(input.authReset)) {
    params.set("authReset", "1");
  }

  if (input.authResetReason) {
    params.set("authResetReason", input.authResetReason);
  }

  if (input.error) {
    params.set("error", input.error);
  }

  const query = params.toString();
  return query.length > 0 ? `/sign-in?${query}` : "/sign-in";
}

export function buildProtectedSignInRedirectPath(input: {
  pathname: string;
  search?: string;
}) {
  return buildCanonicalSignInPath({
    callbackUrl: `${input.pathname}${input.search ?? ""}`,
  });
}

export function resolvePostAuthRedirectForView(
  view: CanonicalSignInView,
  requestedTarget: string | null | undefined
) {
  const safeTarget = sanitizeAuthRedirect(requestedTarget);
  const inferredView = inferCanonicalSignInView(safeTarget);

  if (inferredView === view) {
    return safeTarget;
  }

  if (view === "vendor") {
    return "/vendor";
  }

  if (view === "firm") {
    return "/firm";
  }

  if (view === "individual") {
    return "/user";
  }

  return "/admin";
}
