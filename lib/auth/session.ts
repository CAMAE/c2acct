import type { CompanyType, UserRole } from "@prisma/client";
import { cache } from "react";
import { auth } from "@/auth";

export type SessionUser = {
  id: string;
  email: string;
  role: UserRole;
  companyId: string | null;
};

export type ActorContext = {
  email: string;
  role: UserRole;
  companyId: string | null;
  companyType: CompanyType | null;
};

type SessionUserShape = {
  id?: unknown;
  email?: unknown;
  role?: unknown;
  companyId?: unknown;
};

export type SessionReadResult = {
  user: SessionUser | null;
  authError:
    | "no_request_context"
    | "stale_session"
    | "stale_pkce"
    | "auth_misconfigured"
    | "unknown"
    | null;
};

function toSessionUser(value: SessionUserShape | undefined): SessionUser | null {
  if (!value) return null;

  const id = typeof value.id === "string" ? value.id : "";
  const email = typeof value.email === "string" ? value.email : "";
  const role = typeof value.role === "string" ? (value.role as UserRole) : "MEMBER";
  const companyId = typeof value.companyId === "string" ? value.companyId : null;

  if (!id || !email) return null;

  return { id, email, role, companyId };
}

function classifyAuthFailure(error: unknown): SessionReadResult["authError"] {
  const message = error instanceof Error ? error.message : String(error ?? "");

  if (
    /outside a request scope|request scope|requestAsyncStorage|headers was called|cookies was called|dynamic api was called outside/i.test(
      message
    )
  ) {
    return "no_request_context";
  }

  if (/pkceCodeVerifier|code verifier|InvalidCheck/i.test(message)) {
    return "stale_pkce";
  }

  if (/JWTSessionError|decryption secret|JWTDecrypt|JWEDecryptionFailed|no matching decryption secret/i.test(message)) {
    return "stale_session";
  }

  if (/secret|MissingSecret|AUTH_SECRET|NEXTAUTH_SECRET/i.test(message)) {
    return "auth_misconfigured";
  }

  return "unknown";
}

function shouldLogAuthFallback(authError: SessionReadResult["authError"]) {
  if (authError === "no_request_context") {
    return false;
  }

  if (authError === "unknown" && process.env.NEXT_PHASE === "phase-production-build") {
    return false;
  }

  return true;
}

function buildAuthFallbackMessage(authError: Exclude<SessionReadResult["authError"], null>) {
  if (authError === "stale_session") {
    return "[auth] session read fallback (stale_session). Treating request as signed out. Reset local auth state from /login if a local secret changed or a stale session cookie persists.";
  }

  if (authError === "stale_pkce") {
    return "[auth] session read fallback (stale_pkce). Treating request as signed out. Reset local auth state from /login if an interrupted GitHub callback left PKCE cookies behind.";
  }

  if (authError === "auth_misconfigured") {
    return "[auth] session read fallback (auth_misconfigured). Treating request as signed out. Check AUTH_SECRET or NEXTAUTH_SECRET before retrying local sign-in.";
  }

  return "[auth] session read fallback (unknown). Treating request as signed out. If this persists on live requests, inspect auth logs and reset local auth state from /login.";
}

const readSessionResult = cache(async (): Promise<SessionReadResult> => {
  try {
    const session = await auth();
    return {
      user: toSessionUser(session?.user as SessionUserShape | undefined),
      authError: null,
    };
  } catch (error) {
    const authError = classifyAuthFailure(error);
    if (authError && shouldLogAuthFallback(authError)) {
      console.warn(buildAuthFallbackMessage(authError));
    }

    return {
      user: null,
      authError,
    };
  }
});

export async function getSessionReadResult() {
  return readSessionResult();
}

export async function getSessionUser() {
  const result = await readSessionResult();
  return result.user;
}

export async function requireSessionUser() {
  return getSessionUser();
}
