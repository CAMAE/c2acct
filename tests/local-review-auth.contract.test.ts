import { describe, expect, it } from "vitest";
import {
  LOCAL_REVIEW_USERS,
  canUseLocalReviewEmail,
  findLocalReviewUserByEmail,
  getLocalReviewAuthPolicy,
  getLocalReviewUsersForUi,
  isLocalReviewAuthRequested,
  shouldSeedLocalReviewUsers,
} from "@/lib/auth/localReview";

function authEnv(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "test",
    ...overrides,
  };
}

describe("local review auth contracts", () => {
  it("defines deterministic vendor, firm, individual, admin, and consultant review users", () => {
    expect(LOCAL_REVIEW_USERS.map((entry) => entry.key)).toEqual([
      "vendor",
      "firm",
      "individual",
      "admin",
      "consultant",
    ]);
    expect(LOCAL_REVIEW_USERS.map((entry) => entry.redirectTo)).toEqual([
      "/vendor",
      "/firm",
      "/user",
      "/admin",
      "/consultants",
    ]);
  });

  it("resolves local review users by normalized email", () => {
    expect(findLocalReviewUserByEmail(" REVIEW.VENDOR@PAT.LOCAL ")?.key).toBe("vendor");
    expect(findLocalReviewUserByEmail("review.firm@pat.local")?.key).toBe("firm");
    expect(findLocalReviewUserByEmail("review.individual@pat.local")?.key).toBe("individual");
    expect(findLocalReviewUserByEmail("review.admin@pat.local")?.key).toBe("admin");
    expect(findLocalReviewUserByEmail("review.consultant@pat.local")?.key).toBe("consultant");
  });

  it("exposes all local review entries in the UI contract", () => {
    const entries = getLocalReviewUsersForUi();

    expect(entries).toHaveLength(5);
    expect(entries.every((entry) => entry.email.endsWith("@pat.local"))).toBe(true);
    expect(entries.some((entry) => entry.redirectTo === "/vendor")).toBe(true);
    expect(entries.some((entry) => entry.redirectTo === "/firm")).toBe(true);
    expect(entries.some((entry) => entry.redirectTo === "/user")).toBe(true);
    expect(entries.some((entry) => entry.redirectTo === "/admin")).toBe(true);
    expect(entries.some((entry) => entry.redirectTo === "/consultants")).toBe(true);
  });

  it("keeps the credentials provider unavailable unless the flag and local-origin policy pass", () => {
    const disabled = getLocalReviewAuthPolicy(authEnv({
      AUTH_URL: "http://127.0.0.1:3000",
    }));
    expect(disabled.credentialsProviderAvailable).toBe(false);
    expect(isLocalReviewAuthRequested(authEnv({
      AUTH_URL: "http://127.0.0.1:3000",
    }))).toBe(false);

    const publicProduction = getLocalReviewAuthPolicy(authEnv({
      NODE_ENV: "production",
      AUTH_URL: "https://pat.example.com",
      PAT_ENABLE_LOCAL_REVIEW_AUTH: "1",
    }));
    expect(publicProduction.runtimeAllowed).toBe(false);
    expect(publicProduction.credentialsProviderAvailable).toBe(false);
    expect(publicProduction.seedAllowed).toBe(false);
    expect(publicProduction.reason).toContain("non-loopback-origin");

    const loopbackProduction = getLocalReviewAuthPolicy(authEnv({
      NODE_ENV: "production",
      AUTH_URL: "http://127.0.0.1:3000",
      NEXTAUTH_URL: "http://127.0.0.1:3000",
      PAT_ENABLE_LOCAL_REVIEW_AUTH: "1",
    }));
    expect(loopbackProduction.runtimeAllowed).toBe(true);
    expect(loopbackProduction.credentialsProviderAvailable).toBe(true);
    expect(loopbackProduction.seedAllowed).toBe(true);
  });

  it("blocks review identities outside the explicit local-review boundary even when rows exist", () => {
    const publicEnv = authEnv({
      NODE_ENV: "production",
      AUTH_URL: "https://pat.example.com",
      PAT_ENABLE_LOCAL_REVIEW_AUTH: "1",
    });
    expect(canUseLocalReviewEmail("review.vendor@pat.local", publicEnv)).toBe(false);

    const loopbackEnv = authEnv({
      NODE_ENV: "production",
      AUTH_URL: "http://127.0.0.1:3000",
      PAT_ENABLE_LOCAL_REVIEW_AUTH: "1",
    });
    expect(canUseLocalReviewEmail("review.vendor@pat.local", loopbackEnv)).toBe(true);
    expect(canUseLocalReviewEmail("real.user@example.com", publicEnv)).toBe(true);
  });

  it("preserves non-production seeding while preventing public-origin review auth", () => {
    expect(shouldSeedLocalReviewUsers(authEnv())).toBe(true);
    expect(shouldSeedLocalReviewUsers(authEnv({
      AUTH_URL: "https://pat.example.com",
    }))).toBe(false);
  });
});
