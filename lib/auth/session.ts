import type { UserRole } from "@prisma/client";
import { auth } from "@/auth";

export type SessionUser = {
  id: string;
  email: string;
  role: UserRole;
  companyId: string | null;
};

type SessionUserShape = {
  id?: unknown;
  email?: unknown;
  role?: unknown;
  companyId?: unknown;
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

export async function getSessionUser() {
  const session = await auth();
  return toSessionUser(session?.user as SessionUserShape | undefined);
}

export async function requireSessionUser() {
  return getSessionUser();
}
