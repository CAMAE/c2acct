import { afterEach, describe, expect, it, vi } from "vitest";
import { getResolvedAuthEnv, getResolvedAuthSecret } from "@/lib/auth/env";

const AUTH_ENV_KEYS = [
  "NODE_ENV",
  "AUTH_SECRET",
  "NEXTAUTH_SECRET",
  "AUTH_URL",
  "NEXTAUTH_URL",
  "AUTH_GITHUB_ID",
  "AUTH_GITHUB_SECRET",
  "PAT_ENABLE_LOCAL_GITHUB_AUTH",
  "PAT_ENABLE_LOCAL_REVIEW_AUTH",
  "PAT_LOCAL_REVIEW_PASSWORD",
  "PAT_LOCAL_ORIGIN",
] as const;

type AuthEnvKey = (typeof AUTH_ENV_KEYS)[number];

function setAuthEnv(values: Partial<Record<AuthEnvKey, string>>) {
  for (const key of AUTH_ENV_KEYS) {
    vi.stubEnv(key, "");
  }

  for (const [key, value] of Object.entries(values)) {
    vi.stubEnv(key, value);
  }
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("auth env secret resolution", () => {
  it("uses the same resolved secret helper that auth and proxy depend on", () => {
    setAuthEnv({
      AUTH_SECRET: "preferred-auth-secret",
      NEXTAUTH_SECRET: "fallback-nextauth-secret",
    });

    expect(getResolvedAuthSecret()).toBe("preferred-auth-secret");
    expect(getResolvedAuthEnv().values.secret).toBe("preferred-auth-secret");
  });

  it("falls back to NEXTAUTH_SECRET when AUTH_SECRET is absent", () => {
    setAuthEnv({
      NEXTAUTH_SECRET: "fallback-nextauth-secret",
    });

    expect(getResolvedAuthSecret()).toBe("fallback-nextauth-secret");
    expect(getResolvedAuthEnv().values.secret).toBe("fallback-nextauth-secret");
  });

  it("blocks local GitHub auth until the canonical 127.0.0.1:3000 callback is aligned and explicitly enabled", () => {
    setAuthEnv({
      AUTH_URL: "http://localhost:3000",
      AUTH_GITHUB_ID: "github-id",
      AUTH_GITHUB_SECRET: "github-secret",
      AUTH_SECRET: "auth-secret",
    });

    const misaligned = getResolvedAuthEnv();
    expect(misaligned.githubProviderReady).toBe(true);
    expect(misaligned.githubAuthEnabled).toBe(false);
    expect(misaligned.callbackUrl).toBe("http://localhost:3000/api/auth/callback/github");
    expect(misaligned.githubAvailabilityReason).toContain("http://127.0.0.1:3000");

    setAuthEnv({
      AUTH_URL: "http://127.0.0.1:3000",
      NEXTAUTH_URL: "http://127.0.0.1:3000",
      AUTH_GITHUB_ID: "github-id",
      AUTH_GITHUB_SECRET: "github-secret",
      AUTH_SECRET: "auth-secret",
      PAT_ENABLE_LOCAL_GITHUB_AUTH: "1",
    });

    const aligned = getResolvedAuthEnv();
    expect(aligned.githubAuthEnabled).toBe(true);
    expect(aligned.callbackUrl).toBe("http://127.0.0.1:3000/api/auth/callback/github");
  });

  it("allows loopback-only local review auth in the local standalone runtime when the flag and password are set", () => {
    setAuthEnv({
      NODE_ENV: "production",
      AUTH_URL: "http://127.0.0.1:3000",
      NEXTAUTH_URL: "http://127.0.0.1:3000",
      PAT_LOCAL_ORIGIN: "http://127.0.0.1:3000",
      AUTH_SECRET: "auth-secret",
      PAT_ENABLE_LOCAL_REVIEW_AUTH: "1",
      PAT_LOCAL_REVIEW_PASSWORD: "pat-local-review",
    });

    const resolved = getResolvedAuthEnv();
    expect(resolved.canonicalLocalOrigin).toBe("http://127.0.0.1:3000");
    expect(resolved.localReviewRequested).toBe(true);
    expect(resolved.localReviewEnabled).toBe(true);
    expect(resolved.localReviewProviderReady).toBe(true);
  });
});
