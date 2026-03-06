import NextAuth from "next-auth";
import type { UserRole } from "@prisma/client";
import authConfig from "@/auth.config";
import prisma from "@/lib/prisma";

type DbUserClaims = {
  id: string;
  email: string;
  role: UserRole;
  companyId: string | null;
};

function normalizeEmail(email: string | null | undefined) {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

async function findUserByEmail(email: string): Promise<DbUserClaims | null> {
  return prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, email: true, role: true, companyId: true },
  });
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt" },
  callbacks: {
    async signIn({ user }) {
      const normalizedEmail = normalizeEmail(user?.email);
      if (!normalizedEmail) return false;

      const dbUser = await findUserByEmail(normalizedEmail);
      if (!dbUser) return false;

      (user as typeof user & { dbUser?: DbUserClaims }).dbUser = dbUser;
      return true;
    },
    async jwt({ token, user }) {
      const userWithClaims = user as typeof user & { dbUser?: DbUserClaims };

      if (userWithClaims?.dbUser) {
        token.sub = userWithClaims.dbUser.id;
        token.email = userWithClaims.dbUser.email;
        token.role = userWithClaims.dbUser.role;
        token.companyId = userWithClaims.dbUser.companyId;
        return token;
      }

      const normalizedEmail = normalizeEmail(token.email);
      if (!normalizedEmail) return token;

      const dbUser = await findUserByEmail(normalizedEmail);
      if (!dbUser) return token;

      token.sub = dbUser.id;
      token.email = dbUser.email;
      token.role = dbUser.role;
      token.companyId = dbUser.companyId;
      return token;
    },
    async session({ session, token }) {
      if (!session.user) {
        return session;
      }

      const sessionUser = session.user as typeof session.user & {
        id?: string;
        role?: UserRole;
        companyId?: string | null;
      };

      sessionUser.id = typeof token.sub === "string" ? token.sub : "";
      sessionUser.email = typeof token.email === "string" ? token.email : "";
      sessionUser.role = (token.role as UserRole | undefined) ?? "MEMBER";
      sessionUser.companyId =
        typeof token.companyId === "string" ? token.companyId : null;

      return session;
    },
  },
});
