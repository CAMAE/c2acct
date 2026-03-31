import { afterEach, describe, expect, it } from "vitest";
import { getResolvedAuthEnv, getResolvedAuthSecret } from "@/lib/auth/env";

const ORIGINAL_AUTH_SECRET = process.env.AUTH_SECRET;
const ORIGINAL_NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;
const ORIGINAL_AUTH_URL = process.env.AUTH_URL;
const ORIGINAL_NEXTAUTH_URL = process.env.NEXTAUTH_URL;
const ORIGINAL_GITHUB_ID = process.env.AUTH_GITHUB_ID;
const ORIGINAL_GITHUB_SECRET = process.env.AUTH_GITHUB_SECRET;
const ORIGINAL_LOCAL_GITHUB = process.env.PAT_ENABLE_LOCAL_GITHUB_AUTH;

afterEach(() => {
  if (ORIGINAL_AUTH_SECRET === undefined) {
    delete process.env.AUTH_SECRET;
  } else {
    process.env.AUTH_SECRET = ORIGINAL_AUTH_SECRET;
  }

  if (ORIGINAL_NEXTAUTH_SECRET === undefined) {
    delete process.env.NEXTAUTH_SECRET;
  } else {
    process.env.NEXTAUTH_SECRET = ORIGINAL_NEXTAUTH_SECRET;
  }

  if (ORIGINAL_AUTH_URL === undefined) {
    delete process.env.AUTH_URL;
  } else {
    process.env.AUTH_URL = ORIGINAL_AUTH_URL;
  }

  if (ORIGINAL_NEXTAUTH_URL === undefined) {
    delete process.env.NEXTAUTH_URL;
  } else {
    process.env.NEXTAUTH_URL = ORIGINAL_NEXTAUTH_URL;
  }

  if (ORIGINAL_GITHUB_ID === undefined) {
    delete process.env.AUTH_GITHUB_ID;
  } else {
    process.env.AUTH_GITHUB_ID = ORIGINAL_GITHUB_ID;
  }

  if (ORIGINAL_GITHUB_SECRET === undefined) {
    delete process.env.AUTH_GITHUB_SECRET;
  } else {
    process.env.AUTH_GITHUB_SECRET = ORIGINAL_GITHUB_SECRET;
  }

  if (ORIGINAL_LOCAL_GITHUB === undefined) {
    delete process.env.PAT_ENABLE_LOCAL_GITHUB_AUTH;
  } else {
    process.env.PAT_ENABLE_LOCAL_GITHUB_AUTH = ORIGINAL_LOCAL_GITHUB;
  }
});

describe("auth env secret resolution", () => {
  it("uses the same resolved secret helper that auth and proxy depend on", () => {
    process.env.AUTH_SECRET = "preferred-auth-secret";
    process.env.NEXTAUTH_SECRET = "fallback-nextauth-secret";

    expect(getResolvedAuthSecret()).toBe("preferred-auth-secret");
    expect(getResolvedAuthEnv().values.secret).toBe("preferred-auth-secret");
  });

  it("falls back to NEXTAUTH_SECRET when AUTH_SECRET is absent", () => {
    delete process.env.AUTH_SECRET;
    process.env.NEXTAUTH_SECRET = "fallback-nextauth-secret";

    expect(getResolvedAuthSecret()).toBe("fallback-nextauth-secret");
    expect(getResolvedAuthEnv().values.secret).toBe("fallback-nextauth-secret");
  });

  it("blocks local GitHub auth until the canonical 127.0.0.1:3001 callback is aligned and explicitly enabled", () => {
    process.env.AUTH_URL = "http://localhost:3000";
    process.env.AUTH_GITHUB_ID = "github-id";
    process.env.AUTH_GITHUB_SECRET = "github-secret";
    process.env.AUTH_SECRET = "auth-secret";
    delete process.env.PAT_ENABLE_LOCAL_GITHUB_AUTH;

    const misaligned = getResolvedAuthEnv();
    expect(misaligned.githubProviderReady).toBe(true);
    expect(misaligned.githubAuthEnabled).toBe(false);
    expect(misaligned.callbackUrl).toBe("http://localhost:3000/api/auth/callback/github");
    expect(misaligned.githubAvailabilityReason).toContain("http://127.0.0.1:3001");

    process.env.AUTH_URL = "http://127.0.0.1:3001";
    process.env.NEXTAUTH_URL = "http://127.0.0.1:3001";
    process.env.PAT_ENABLE_LOCAL_GITHUB_AUTH = "1";

    const aligned = getResolvedAuthEnv();
    expect(aligned.githubAuthEnabled).toBe(true);
    expect(aligned.callbackUrl).toBe("http://127.0.0.1:3001/api/auth/callback/github");
  });
});
