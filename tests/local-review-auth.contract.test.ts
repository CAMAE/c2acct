import { describe, expect, it } from "vitest";
import {
  LOCAL_REVIEW_USERS,
  findLocalReviewUserByEmail,
  getLocalReviewUsersForUi,
} from "@/lib/auth/localReview";

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
});
