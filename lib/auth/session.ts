import type { PlatformRole, UserRole } from "@prisma/client";
import { auth } from "@/auth";

export type SessionUser = {
  id: string;
  email: string;
  role: UserRole;
  platformRole: PlatformRole;
  // Legacy compatibility claim only. Viewer context + memberships decide authority.
  companyId: string | null;
};

type SessionUserShape = {
  id?: unknown;
  email?: unknown;
  role?: unknown;
  platformRole?: unknown;
  companyId?: unknown;
};

function toSessionUser(value: SessionUserShape | undefined): SessionUser | null {
  if (!value) return null;

  const id = typeof value.id === "string" ? value.id : "";
  const email = typeof value.email === "string" ? value.email : "";
  const role = typeof value.role === "string" ? (value.role as UserRole) : "MEMBER";
  const platformRole =
    typeof value.platformRole === "string" ? (value.platformRole as PlatformRole) : "NONE";
  const companyId = typeof value.companyId === "string" ? value.companyId : null;

  if (!id || !email) return null;

  return { id, email, role, platformRole, companyId };
}

export async function getSessionUser() {
  const session = await auth();
  return toSessionUser(session?.user as SessionUserShape | undefined);
}

export async function requireSessionUser() {
  return getSessionUser();
}
