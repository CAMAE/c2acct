import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { findAuthUserByEmail } from "@/lib/auth/credentials";
import { verifyPassword } from "@/lib/auth/passwords";
import { getResolvedAuthEnv } from "@/lib/auth/env";
import prisma from "@/lib/prisma";

const resolvedAuthEnv = getResolvedAuthEnv();

const authConfig: NextAuthConfig = {
  trustHost: true,
  secret: resolvedAuthEnv.values.secret ?? undefined,
  logger: {
    error(code, ...message) {
      const codeText = String(code);

      if (codeText === "JWTSessionError" || codeText === "InvalidCheck") {
        console.warn(
          `[auth] ${codeText}: treating auth state as stale. Use /sign-in to clear session cookies before retrying.`
        );
        return;
      }

      console.error(`[auth] ${codeText}`, ...message);
    },
  },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";

        if (!email || !password || !resolvedAuthEnv.credentialsAuthEnabled) {
          return null;
        }

        const userWithPassword = await findAuthUserByEmail(email);
        if (!userWithPassword) {
          return null;
        }

        const userRecord = await prisma.user.findUnique({
          where: { id: userWithPassword.id },
          select: { passwordHash: true },
        });

        if (!(await verifyPassword(password, userRecord?.passwordHash))) {
          return null;
        }

        return {
          id: userWithPassword.id,
          email: userWithPassword.email,
          name: userWithPassword.name ?? userWithPassword.email,
          role: userWithPassword.role,
          companyId: userWithPassword.companyId,
          companyType: userWithPassword.companyType,
        };
      },
    }),
  ],
  pages: {
    signIn: "/sign-in",
  },
};

export default authConfig;
