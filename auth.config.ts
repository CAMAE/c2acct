import type { NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { getResolvedAuthEnv } from "@/lib/auth/env";
import { findLocalReviewUserByEmail } from "@/lib/auth/localReview";

const resolvedAuthEnv = getResolvedAuthEnv();

const authConfig: NextAuthConfig = {
  trustHost: true,
  secret: resolvedAuthEnv.values.secret ?? undefined,
  logger: {
    error(code, ...message) {
      const codeText = String(code);

      if (codeText === "JWTSessionError" || codeText === "InvalidCheck") {
        console.warn(
          `[auth] ${codeText}: treating local auth state as stale. Use /login to clear session, callback, and PKCE cookies before retrying.`
        );
        return;
      }

      console.error(`[auth] ${codeText}`, ...message);
    },
  },
  providers: [
    ...(resolvedAuthEnv.githubProviderReady
      ? [
          GitHub({
            clientId: resolvedAuthEnv.values.githubId!,
            clientSecret: resolvedAuthEnv.values.githubSecret!,
          }),
        ]
      : []),
    ...(resolvedAuthEnv.localReviewProviderReady
      ? [
          Credentials({
            credentials: {
              email: { label: "Email", type: "email" },
              password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
              const email = typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : "";
              const password = typeof credentials?.password === "string" ? credentials.password : "";
              const reviewUser = findLocalReviewUserByEmail(email);

              if (!reviewUser || !resolvedAuthEnv.values.localReviewPassword) {
                return null;
              }

              if (password !== resolvedAuthEnv.values.localReviewPassword) {
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
    signIn: "/login",
  },
};

export default authConfig;
