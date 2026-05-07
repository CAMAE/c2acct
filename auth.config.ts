import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { getResolvedAuthEnv } from "@/lib/auth/env";
import { findLocalReviewUserByEmail } from "@/lib/auth/localReview";
import { verifyPilotPassword } from "@/lib/auth/passwords";
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
          `[auth] ${codeText}: treating local auth state as stale. Use /sign-in to clear session, callback, and PKCE cookies before retrying.`
        );
        return;
      }

      console.error(`[auth] ${codeText}`, ...message);
    },
  },
  providers: [
    ...(resolvedAuthEnv.githubAuthEnabled
      ? [
          GitHub({
            clientId: resolvedAuthEnv.values.githubId!,
            clientSecret: resolvedAuthEnv.values.githubSecret!,
          }),
        ]
      : []),
    Credentials({
            credentials: {
              email: { label: "Email", type: "email" },
              password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
              const runtimeAuthEnv = getResolvedAuthEnv();
              const email = typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : "";
              const password = typeof credentials?.password === "string" ? credentials.password : "";
              const reviewUser = findLocalReviewUserByEmail(email);

              if (reviewUser) {
                if (!runtimeAuthEnv.localReviewProviderReady || !runtimeAuthEnv.values.localReviewPassword) {
                  return null;
                }

                if (password !== runtimeAuthEnv.values.localReviewPassword) {
                  return null;
                }

                return {
                  id: reviewUser.email,
                  email: reviewUser.email,
                  name: reviewUser.label,
                };
              }

              const pilotUser = await prisma.user.findFirst({
                where: { email: { equals: email, mode: "insensitive" } },
                select: { id: true, email: true, name: true, passwordHash: true },
              });
              if (!pilotUser?.passwordHash) {
                return null;
              }

              const passwordValid = await verifyPilotPassword({
                password,
                passwordHash: pilotUser.passwordHash,
              });
              if (!passwordValid) {
                return null;
              }

              return {
                id: pilotUser.id,
                email: pilotUser.email,
                name: pilotUser.name ?? pilotUser.email,
              };
            },
          }),
  ],
  pages: {
    signIn: "/sign-in",
  },
};

export default authConfig;
