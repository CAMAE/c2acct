import type { CompanyType, UserRole } from "@prisma/client";
import prisma from "@/lib/prisma";

export type AuthenticatedUserClaims = {
  id: string;
  email: string;
  role: UserRole;
  companyId: string | null;
  companyType: CompanyType | null;
  name: string | null;
};

function normalizeEmail(email: string | null | undefined) {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export async function findAuthUserByEmail(email: string | null | undefined): Promise<AuthenticatedUserClaims | null> {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return null;
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: normalizedEmail, mode: "insensitive" } },
    select: {
      id: true,
      email: true,
      role: true,
      companyId: true,
      name: true,
      Company: {
        select: {
          type: true,
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    companyId: user.companyId,
    companyType: user.Company?.type ?? null,
    name: user.name,
  };
}

export function resolveUserHomePath(user: Pick<AuthenticatedUserClaims, "role" | "companyType">) {
  if (user.role === "ADMIN" || user.role === "OWNER") {
    return user.companyType === "VENDOR" ? "/vendor" : "/admin";
  }

  if (user.companyType === "VENDOR") {
    return "/vendor";
  }

  if (user.companyType === "FIRM") {
    return "/firm";
  }

  return "/user";
}
