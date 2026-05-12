import { afterEach, describe, expect, it } from "vitest";
import {
  LOCAL_REVIEW_USERS,
  findLocalReviewUserByEmail,
  getConfiguredProductionBootstrapEmails,
  getLocalReviewSeedGate,
  getLocalReviewUsersForUi,
  shouldSeedLocalReviewUsers,
  shouldSeedProductionBootstrapUsers,
} from "@/lib/auth/localReview";

const mutableEnv = process.env as Record<string, string | undefined>;
const ORIGINAL_NODE_ENV = mutableEnv.NODE_ENV;
const ORIGINAL_LOCAL_REVIEW_FLAG = mutableEnv.PAT_ENABLE_LOCAL_REVIEW_AUTH;
const ORIGINAL_LOCAL_REVIEW_PASSWORD = mutableEnv.PAT_LOCAL_REVIEW_PASSWORD;
const ORIGINAL_BOOTSTRAP_FLAG = mutableEnv.PAT_ENABLE_BOOTSTRAP_USERS;
const ORIGINAL_BOOTSTRAP_VENDOR_EMAIL = mutableEnv.PAT_BOOTSTRAP_VENDOR_EMAIL;

afterEach(() => {
  if (ORIGINAL_NODE_ENV === undefined) {
    delete mutableEnv.NODE_ENV;
  } else {
    mutableEnv.NODE_ENV = ORIGINAL_NODE_ENV;
  }

  if (ORIGINAL_LOCAL_REVIEW_FLAG === undefined) {
    delete mutableEnv.PAT_ENABLE_LOCAL_REVIEW_AUTH;
  } else {
    mutableEnv.PAT_ENABLE_LOCAL_REVIEW_AUTH = ORIGINAL_LOCAL_REVIEW_FLAG;
  }

  if (ORIGINAL_LOCAL_REVIEW_PASSWORD === undefined) {
    delete mutableEnv.PAT_LOCAL_REVIEW_PASSWORD;
  } else {
    mutableEnv.PAT_LOCAL_REVIEW_PASSWORD = ORIGINAL_LOCAL_REVIEW_PASSWORD;
  }

  if (ORIGINAL_BOOTSTRAP_FLAG === undefined) {
    delete mutableEnv.PAT_ENABLE_BOOTSTRAP_USERS;
  } else {
    mutableEnv.PAT_ENABLE_BOOTSTRAP_USERS = ORIGINAL_BOOTSTRAP_FLAG;
  }

  if (ORIGINAL_BOOTSTRAP_VENDOR_EMAIL === undefined) {
    delete mutableEnv.PAT_BOOTSTRAP_VENDOR_EMAIL;
  } else {
    mutableEnv.PAT_BOOTSTRAP_VENDOR_EMAIL = ORIGINAL_BOOTSTRAP_VENDOR_EMAIL;
  }
});

describe("local review auth contracts", () => {
  it("defines deterministic vendor, firm, individual, and admin review users", () => {
    expect(LOCAL_REVIEW_USERS.map((entry) => entry.key)).toEqual([
      "vendor",
      "firm",
      "individual",
      "admin",
    ]);
    expect(LOCAL_REVIEW_USERS.map((entry) => entry.redirectTo)).toEqual([
      "/vendor",
      "/firm",
      "/user",
      "/admin",
    ]);
  });

  it("resolves local review users by normalized email", () => {
    expect(findLocalReviewUserByEmail(" REVIEW.VENDOR@PAT.LOCAL ")?.key).toBe("vendor");
    expect(findLocalReviewUserByEmail("review.firm@pat.local")?.key).toBe("firm");
    expect(findLocalReviewUserByEmail("review.individual@pat.local")?.key).toBe("individual");
    expect(findLocalReviewUserByEmail("review.admin@pat.local")?.key).toBe("admin");
  });

  it("exposes all local review entries in the UI contract", () => {
    const entries = getLocalReviewUsersForUi();

    expect(entries).toHaveLength(4);
    expect(entries.every((entry) => entry.email.endsWith("@pat.local"))).toBe(true);
    expect(entries.some((entry) => entry.redirectTo === "/vendor")).toBe(true);
    expect(entries.some((entry) => entry.redirectTo === "/firm")).toBe(true);
    expect(entries.some((entry) => entry.redirectTo === "/user")).toBe(true);
    expect(entries.some((entry) => entry.redirectTo === "/admin")).toBe(true);
  });

  it("does not seed local review users by default in non-test mode", () => {
    mutableEnv.NODE_ENV = "development";
    delete mutableEnv.PAT_ENABLE_LOCAL_REVIEW_AUTH;
    delete mutableEnv.PAT_LOCAL_REVIEW_PASSWORD;

    expect(shouldSeedLocalReviewUsers()).toBe(false);
    expect(getLocalReviewSeedGate().reason).toContain("PAT_ENABLE_LOCAL_REVIEW_AUTH");
  });

  it("requires an explicit local review password outside test mode", () => {
    mutableEnv.NODE_ENV = "development";
    mutableEnv.PAT_ENABLE_LOCAL_REVIEW_AUTH = "1";
    delete mutableEnv.PAT_LOCAL_REVIEW_PASSWORD;

    expect(shouldSeedLocalReviewUsers()).toBe(false);
    expect(getLocalReviewSeedGate().reason).toContain("PAT_LOCAL_REVIEW_PASSWORD");

    mutableEnv.PAT_LOCAL_REVIEW_PASSWORD = "pat-local-review";
    expect(shouldSeedLocalReviewUsers()).toBe(true);
  });

  it("allows deterministic local review seeding automatically in test mode", () => {
    mutableEnv.NODE_ENV = "test";
    delete mutableEnv.PAT_ENABLE_LOCAL_REVIEW_AUTH;
    delete mutableEnv.PAT_LOCAL_REVIEW_PASSWORD;

    expect(shouldSeedLocalReviewUsers()).toBe(true);
    expect(getLocalReviewSeedGate().mode).toBe("test");
  });

  it("requires an explicit production bootstrap flag and email config", () => {
    delete mutableEnv.PAT_ENABLE_BOOTSTRAP_USERS;
    delete mutableEnv.PAT_BOOTSTRAP_VENDOR_EMAIL;

    expect(shouldSeedProductionBootstrapUsers()).toBe(false);
    expect(getConfiguredProductionBootstrapEmails()).toEqual([]);

    mutableEnv.PAT_ENABLE_BOOTSTRAP_USERS = "1";
    mutableEnv.PAT_BOOTSTRAP_VENDOR_EMAIL = "vendor.bootstrap@example.com";
    expect(shouldSeedProductionBootstrapUsers()).toBe(true);
    expect(getConfiguredProductionBootstrapEmails()).toEqual([
      { key: "vendor", email: "vendor.bootstrap@example.com" },
    ]);
  });
});
