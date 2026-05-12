import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { findAuthUserByEmail, resolveUserHomePath } from "@/lib/auth/credentials";
import { getResolvedAuthEnv } from "@/lib/auth/env";

function getSingleFormValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeRedirect(target: string) {
  return target.startsWith("/") ? target : "/";
}

function sanitizeView(target: string) {
  return target === "vendor" || target === "firm" || target === "individual" || target === "admin"
    ? target
    : "vendor";
}

function buildErrorRedirect(source: string, view: string, error: string) {
  return `/${source}?view=${view}&error=${error}`;
}

function resolveRequestedRedirect(redirectTo: string, actorHome: string) {
  const roleHomePaths = new Set(["/vendor", "/firm", "/user", "/admin"]);
  if (!roleHomePaths.has(redirectTo)) {
    return redirectTo;
  }

  return redirectTo === actorHome ? redirectTo : actorHome;
}

export async function signInWithLocalReviewCredentials(formData: FormData) {
  "use server";

  const email = getSingleFormValue(formData.get("email")).toLowerCase();
  const password = getSingleFormValue(formData.get("password"));
  const redirectTo = sanitizeRedirect(getSingleFormValue(formData.get("redirectTo")) || "/");
  const source = getSingleFormValue(formData.get("source")) || "login";
  const view = sanitizeView(getSingleFormValue(formData.get("view")) || "vendor");
  const resolvedAuthEnv = getResolvedAuthEnv();

  if (!resolvedAuthEnv.credentialsAuthEnabled) {
    redirect(buildErrorRedirect(source, view, "auth_unavailable"));
  }

  if (!email || !password) {
    redirect(buildErrorRedirect(source, view, "missing_credentials"));
  }

  const actor = await findAuthUserByEmail(email);
  if (!actor) {
    redirect(buildErrorRedirect(source, view, "invalid_credentials"));
  }

  const fallbackRedirect = resolveUserHomePath(actor);
  const finalRedirect = redirectTo === "/" ? fallbackRedirect : resolveRequestedRedirect(redirectTo, fallbackRedirect);

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: finalRedirect,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect(buildErrorRedirect(source, view, "invalid_credentials"));
    }

    throw error;
  }
}
