import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { getSessionUser } from "@/lib/auth/session";
import prisma from "@/lib/prisma";
import { hashPilotPassword, validatePilotPassword } from "@/lib/auth/passwords";
import { recordOperatorAuditEvent } from "@/lib/operatorAudit";
import { checkAuthRateLimit } from "@/lib/security/authRateLimit";

function getSingleFormValue(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeRedirect(target: string) {
  return target.startsWith("/") ? target : "/";
}

function sanitizeSource(target: string) {
  return target === "login" ? "login" : "sign-in";
}

function sanitizeView(target: string) {
  return target === "vendor" || target === "firm" || target === "individual" || target === "admin" || target === "consultant"
    ? target
    : "vendor";
}

function passwordUpdatePath(returnTo: string) {
  return `/sign-in/password-update?returnTo=${encodeURIComponent(returnTo)}`;
}

/**
 * Carry the submitted email back through an error redirect so the sign-in
 * form can re-fill it (Phase 2.5 backlog #1: users should not have to retype
 * their email after a failed attempt). Length-capped; encoded at usage.
 */
function emailRedirectParam(email: string) {
  if (!email || email.length > 254) return "";
  return `&email=${encodeURIComponent(email)}`;
}

export async function signInWithPilotCredentials(formData: FormData) {
  "use server";

  const email = getSingleFormValue(formData.get("email")).toLowerCase();
  const password = getSingleFormValue(formData.get("password"));
  const redirectTo = sanitizeRedirect(getSingleFormValue(formData.get("redirectTo")) || "/");
  const source = sanitizeSource(getSingleFormValue(formData.get("source")) || "sign-in");
  const view = sanitizeView(getSingleFormValue(formData.get("view")) || "vendor");

  if (!email || !password) {
    redirect(`/${source}?view=${view}&error=pilot_password_missing${emailRedirectParam(email)}`);
  }

  // Rate limit (B6): throttle credential brute-force before any DB/auth work.
  if (!(await checkAuthRateLimit("auth.signin", email))) {
    redirect(`/${source}?view=${view}&error=rate_limited${emailRedirectParam(email)}`);
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { mustChangePassword: true, passwordHash: true },
  });
  const finalRedirect = user?.mustChangePassword ? passwordUpdatePath(redirectTo) : redirectTo;

  try {
    // redirect:false — establish the session WITHOUT letting Auth.js redirect to
    // the pinned AUTH_URL origin. When the standalone's AUTH_URL host differs from
    // the browser's (e.g. 127.0.0.1 vs localhost), Auth.js's own post-sign-in
    // redirect crosses origins, the freshly-set session cookie is host-locked to
    // the submit origin and never travels, and the portal bounces back to
    // /sign-in with NO error param. We do the redirect ourselves, relative, so it
    // stays on the exact origin the form was posted to and the cookie sticks.
    await signIn("credentials", {
      email,
      password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect(`/${source}?view=${view}&error=pilot_password_invalid${emailRedirectParam(email)}`);
    }

    throw error;
  }

  // Same-origin relative redirect (must live OUTSIDE the try — redirect() throws
  // NEXT_REDIRECT, which is not an AuthError and must propagate to Next).
  redirect(finalRedirect);
}

export async function updateFirstLoginPasswordAction(formData: FormData) {
  "use server";

  const userId = getSingleFormValue(formData.get("userId"));
  const returnTo = sanitizeRedirect(getSingleFormValue(formData.get("returnTo")) || "/");
  const password = getSingleFormValue(formData.get("password"));
  const confirmPassword = getSingleFormValue(formData.get("confirmPassword"));

  if (!userId) {
    redirect("/sign-in?error=pilot_password_invalid");
  }

  const sessionUser = await getSessionUser();
  if (!sessionUser || sessionUser.id !== userId) {
    redirect("/sign-in?error=pilot_password_invalid");
  }

  // Rate limit (B6): throttle password-change submissions per user.
  if (!(await checkAuthRateLimit("auth.password-update", userId))) {
    redirect(`${passwordUpdatePath(returnTo)}&error=rate_limited`);
  }

  if (password !== confirmPassword) {
    redirect(`${passwordUpdatePath(returnTo)}&error=password_mismatch`);
  }

  const validation = validatePilotPassword(password);
  if (!validation.ok) {
    redirect(`${passwordUpdatePath(returnTo)}&error=password_policy`);
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, mustChangePassword: true },
  });
  if (!user) {
    redirect("/sign-in?error=pilot_password_invalid");
  }

  const passwordHash = await hashPilotPassword(password);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      mustChangePassword: false,
      passwordUpdatedAt: new Date(),
      updatedAt: new Date(),
    },
  });

  await recordOperatorAuditEvent({
    actorUserId: user.id,
    action: "pilot-password-change",
    entityType: "user",
    entityId: user.id,
    summary: `Pilot user changed first-login password for ${user.email}`,
    details: { selfService: true, previousMustChangePassword: user.mustChangePassword },
  });

  try {
    // Same cross-origin cookie fix as signInWithPilotCredentials: establish the
    // session without Auth.js's pinned-origin redirect, then redirect relative.
    await signIn("credentials", {
      email: user.email,
      password,
      redirect: false,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/sign-in?error=pilot_password_invalid");
    }

    throw error;
  }

  redirect(returnTo);
}
