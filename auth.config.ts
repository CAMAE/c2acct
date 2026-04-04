import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { getResolvedAuthEnv } from "@/lib/auth/env";
import { findLocalReviewUserByEmail, isLocalReviewAuthRequested } from "@/lib/auth/localReview";

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
    ...(isLocalReviewAuthRequested()
      ? [
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

              if (!reviewUser || !runtimeAuthEnv.values.localReviewPassword) {
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
            },
          }),
        ]
      : []),
  ],
  pages: {
    signIn: "/sign-in",
  },
};

export default authConfig;
