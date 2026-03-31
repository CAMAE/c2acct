import { getLocalReviewUsersForUi } from "@/lib/auth/localReview";
import { getResolvedAuthEnv } from "@/lib/auth/env";

export type AuthRuntimeStatus = {
  ready: boolean;
  githubProviderReady: boolean;
  githubAuthEnabled: boolean;
  githubUnavailableReason: string | null;
  localReviewEnabled: boolean;
  localReviewProviderReady: boolean;
  authUrlReady: boolean;
  canonicalLocalOrigin: string;
  resolvedBaseUrl: string | null;
  missing: string[];
  callbackUrl: string | null;
  warnings: string[];
  localReviewUsers: Array<{
    key: string;
    label: string;
    email: string;
    redirectTo: string;
  }>;
  operatorSteps: string[];
  resetPath: string;
};

export function getAuthRuntimeStatus(): AuthRuntimeStatus {
  const resolved = getResolvedAuthEnv();
  const callbackExample =
    resolved.callbackUrl ?? `${resolved.canonicalLocalOrigin}/api/auth/callback/github`;

  return {
    ready: resolved.ready,
    githubProviderReady: resolved.githubProviderReady,
    githubAuthEnabled: resolved.githubAuthEnabled,
    githubUnavailableReason: resolved.githubAvailabilityReason,
    localReviewEnabled: resolved.localReviewEnabled,
    localReviewProviderReady: resolved.localReviewProviderReady,
    authUrlReady: Boolean(resolved.values.baseUrl),
    canonicalLocalOrigin: resolved.canonicalLocalOrigin,
    resolvedBaseUrl: resolved.normalizedBaseUrl,
    missing: resolved.missing,
    callbackUrl: resolved.callbackUrl,
    warnings: resolved.warnings,
    localReviewUsers: getLocalReviewUsersForUi(),
    operatorSteps: [
      `Use one canonical local origin everywhere. The repo default is ${resolved.canonicalLocalOrigin}.`,
      "Set AUTH_URL and NEXTAUTH_URL to that same local app origin and use the same origin in the browser.",
      "Set AUTH_SECRET or NEXTAUTH_SECRET once and keep it stable for local Auth.js session decryption.",
      "Set AUTH_GITHUB_ID and AUTH_GITHUB_SECRET from the GitHub OAuth app.",
      `Register ${callbackExample} as the GitHub callback URL.`,
      "Keep local GitHub sign-in off until that exact callback is registered, then opt in with PAT_ENABLE_LOCAL_GITHUB_AUTH=1.",
      "Set PAT_ENABLE_LOCAL_REVIEW_AUTH=1 and PAT_LOCAL_REVIEW_PASSWORD only for local development when you need deterministic review sign-in without GitHub.",
      "If .env.local contains blank auth values, remove them or set real values. The local auth resolver now ignores those blanks and falls back to configured values in .env.",
      "If local sign-in fails after a secret change or a broken callback, reset local auth cookies and try again.",
    ],
    resetPath: "/api/auth/local-reset",
  };
}
