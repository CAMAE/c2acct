import { afterEach, describe, expect, it } from "vitest";
import { getResolvedAuthEnv, getResolvedAuthSecret } from "@/lib/auth/env";

const mutableEnv = process.env as Record<string, string | undefined>;
const ORIGINAL_AUTH_SECRET = mutableEnv.AUTH_SECRET;
const ORIGINAL_NEXTAUTH_SECRET = mutableEnv.NEXTAUTH_SECRET;
const ORIGINAL_AUTH_URL = mutableEnv.AUTH_URL;
const ORIGINAL_NEXTAUTH_URL = mutableEnv.NEXTAUTH_URL;
const ORIGINAL_NODE_ENV = mutableEnv.NODE_ENV;
const ORIGINAL_PRODUCTION_DOMAIN = mutableEnv.PAT_PRODUCTION_DOMAIN;
const ORIGINAL_LOCAL_REVIEW = mutableEnv.PAT_ENABLE_LOCAL_REVIEW_AUTH;
const ORIGINAL_LOCAL_REVIEW_PASSWORD = mutableEnv.PAT_LOCAL_REVIEW_PASSWORD;
const ORIGINAL_BOOTSTRAP_DEFAULT_PASSWORD = mutableEnv.PAT_BOOTSTRAP_DEFAULT_PASSWORD;

afterEach(() => {
  if (ORIGINAL_AUTH_SECRET === undefined) {
    delete process.env.AUTH_SECRET;
  } else {
    mutableEnv.AUTH_SECRET = ORIGINAL_AUTH_SECRET;
  }

  if (ORIGINAL_NEXTAUTH_SECRET === undefined) {
    delete process.env.NEXTAUTH_SECRET;
  } else {
    mutableEnv.NEXTAUTH_SECRET = ORIGINAL_NEXTAUTH_SECRET;
  }

  if (ORIGINAL_AUTH_URL === undefined) {
    delete process.env.AUTH_URL;
  } else {
    mutableEnv.AUTH_URL = ORIGINAL_AUTH_URL;
  }

  if (ORIGINAL_NEXTAUTH_URL === undefined) {
    delete process.env.NEXTAUTH_URL;
  } else {
    mutableEnv.NEXTAUTH_URL = ORIGINAL_NEXTAUTH_URL;
  }

  if (ORIGINAL_NODE_ENV === undefined) {
    delete mutableEnv.NODE_ENV;
  } else {
    mutableEnv.NODE_ENV = ORIGINAL_NODE_ENV;
  }

  if (ORIGINAL_PRODUCTION_DOMAIN === undefined) {
    delete process.env.PAT_PRODUCTION_DOMAIN;
  } else {
    mutableEnv.PAT_PRODUCTION_DOMAIN = ORIGINAL_PRODUCTION_DOMAIN;
  }

  if (ORIGINAL_LOCAL_REVIEW === undefined) {
    delete process.env.PAT_ENABLE_LOCAL_REVIEW_AUTH;
  } else {
    mutableEnv.PAT_ENABLE_LOCAL_REVIEW_AUTH = ORIGINAL_LOCAL_REVIEW;
  }

  if (ORIGINAL_LOCAL_REVIEW_PASSWORD === undefined) {
    delete process.env.PAT_LOCAL_REVIEW_PASSWORD;
  } else {
    mutableEnv.PAT_LOCAL_REVIEW_PASSWORD = ORIGINAL_LOCAL_REVIEW_PASSWORD;
  }

  if (ORIGINAL_BOOTSTRAP_DEFAULT_PASSWORD === undefined) {
    delete process.env.PAT_BOOTSTRAP_DEFAULT_PASSWORD;
  } else {
    mutableEnv.PAT_BOOTSTRAP_DEFAULT_PASSWORD = ORIGINAL_BOOTSTRAP_DEFAULT_PASSWORD;
  }
});

describe("auth env secret resolution", () => {
  it("uses the same resolved secret helper that auth and proxy depend on", () => {
    mutableEnv.AUTH_SECRET = "preferred-auth-secret";
    mutableEnv.NEXTAUTH_SECRET = "fallback-nextauth-secret";

    expect(getResolvedAuthSecret()).toBe("preferred-auth-secret");
    expect(getResolvedAuthEnv().values.secret).toBe("preferred-auth-secret");
  });

  it("falls back to NEXTAUTH_SECRET when AUTH_SECRET is absent", () => {
    delete process.env.AUTH_SECRET;
    mutableEnv.NEXTAUTH_SECRET = "fallback-nextauth-secret";

    expect(getResolvedAuthSecret()).toBe("fallback-nextauth-secret");
    expect(getResolvedAuthEnv().values.secret).toBe("fallback-nextauth-secret");
  });

  it("marks credentials auth ready when AUTH_URL and AUTH_SECRET are configured", () => {
    mutableEnv.AUTH_URL = "http://127.0.0.1:3001";
    mutableEnv.AUTH_SECRET = "auth-secret";

    const resolved = getResolvedAuthEnv();
    expect(resolved.credentialsAuthEnabled).toBe(true);
    expect(resolved.ready).toBe(true);
    expect(resolved.normalizedBaseUrl).toBe("http://127.0.0.1:3001");
  });

  it("requires the exact https://patalign.com origin in production", () => {
    mutableEnv.NODE_ENV = "production";
    mutableEnv.AUTH_URL = "https://wrong.example.com";
    mutableEnv.AUTH_SECRET = "auth-secret";
    mutableEnv.PAT_PRODUCTION_DOMAIN = "patalign.com";

    const resolved = getResolvedAuthEnv();
    expect(resolved.expectedProductionOrigin).toBe("https://patalign.com");
    expect(resolved.productionAuthReady).toBe(false);
    expect(resolved.warnings.some((warning) => warning.includes("https://patalign.com"))).toBe(true);
  });

  it("requires a password source when local deterministic review mode is requested", () => {
    mutableEnv.AUTH_URL = "http://127.0.0.1:3001";
    mutableEnv.AUTH_SECRET = "auth-secret";
    mutableEnv.PAT_ENABLE_LOCAL_REVIEW_AUTH = "1";
    delete process.env.PAT_LOCAL_REVIEW_PASSWORD;
    delete process.env.PAT_BOOTSTRAP_DEFAULT_PASSWORD;

    const missingPassword = getResolvedAuthEnv();
    expect(missingPassword.localReviewEnabled).toBe(true);
    expect(missingPassword.missing).toContain("PAT_LOCAL_REVIEW_PASSWORD");
    expect(missingPassword.localReviewProviderReady).toBe(false);

    mutableEnv.PAT_BOOTSTRAP_DEFAULT_PASSWORD = "bootstrap-password";
    const stillMissing = getResolvedAuthEnv();
    expect(stillMissing.localReviewProviderReady).toBe(false);

    mutableEnv.PAT_LOCAL_REVIEW_PASSWORD = "pat-local-review";
    const configured = getResolvedAuthEnv();
    expect(configured.localReviewProviderReady).toBe(true);
  });
});
