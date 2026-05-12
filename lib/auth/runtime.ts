import { getLocalReviewUsersForUi } from "@/lib/auth/localReview";
import { getResolvedAuthEnv } from "@/lib/auth/env";

export type AuthRuntimeStatus = {
  ready: boolean;
  credentialsAuthEnabled: boolean;
  localReviewEnabled: boolean;
  localReviewProviderReady: boolean;
  authUrlReady: boolean;
  canonicalLocalOrigin: string;
  resolvedBaseUrl: string | null;
  expectedProductionOrigin: string;
  productionAuthReady: boolean;
  missing: string[];
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

  return {
    ready: resolved.ready,
    credentialsAuthEnabled: resolved.credentialsAuthEnabled,
    localReviewEnabled: resolved.localReviewEnabled,
    localReviewProviderReady: resolved.localReviewProviderReady,
    authUrlReady: Boolean(resolved.values.baseUrl),
    canonicalLocalOrigin: resolved.canonicalLocalOrigin,
    resolvedBaseUrl: resolved.normalizedBaseUrl,
    expectedProductionOrigin: resolved.expectedProductionOrigin,
    productionAuthReady: resolved.productionAuthReady,
    missing: resolved.missing,
    warnings: resolved.warnings,
    localReviewUsers: getLocalReviewUsersForUi(),
    operatorSteps: [
      `Use one canonical app origin everywhere. The repo default is ${resolved.canonicalLocalOrigin}.`,
      "Set AUTH_URL and NEXTAUTH_URL to that same app origin.",
      "Set AUTH_SECRET once and keep it stable for Auth.js session decryption.",
      `Production launch requires AUTH_URL=${resolved.expectedProductionOrigin} behind HTTPS.`,
      "Run the app on loopback and let the reverse proxy own public TLS and host termination.",
      "Set PAT_BOOTSTRAP_DEFAULT_PASSWORD or the role-specific PAT_BOOTSTRAP_*_PASSWORD vars before running the explicit seed:bootstrap-users path.",
      "For local QA, PAT_ENABLE_LOCAL_REVIEW_AUTH=1 and PAT_LOCAL_REVIEW_PASSWORD are both required before deterministic review identities seed.",
      "If .env.local contains blank auth values, remove them or set real values. The auth resolver ignores blank local values and falls back to configured values in .env.",
      "If sign-in fails after a secret change or stale session cookie, reset auth cookies and try again.",
    ],
    resetPath: "/api/auth/local-reset",
  };
}
