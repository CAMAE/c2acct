import { describe, expect, it } from "vitest";

import { findLocalReviewUserByEmail } from "@/lib/auth/localReview";

/**
 * AUDIT-D19-001 (Day-20 Block 2A) contract: the
 * `review.consultant+admincreate-*` pattern match in
 * `lib/auth/localReview.ts` lets the e2e admin-create-and-assignment
 * test sign in with a per-run unique consultant identity. The match
 * is narrowly scoped — canonical demo-bench consultants (+sentinel,
 * +bridgepath) stay on their existing pilot-password-hash path.
 */

describe("findLocalReviewUserByEmail — exact matches still work (regression guard)", () => {
  it("returns the canonical consultant entry for review.consultant@pat.local", () => {
    const result = findLocalReviewUserByEmail("review.consultant@pat.local");
    expect(result).not.toBeNull();
    expect(result?.key).toBe("consultant");
    expect(result?.email).toBe("review.consultant@pat.local");
    expect(result?.redirectTo).toBe("/consultants");
  });

  it("returns the canonical vendor entry for review.vendor@pat.local", () => {
    const result = findLocalReviewUserByEmail("review.vendor@pat.local");
    expect(result?.key).toBe("vendor");
  });

  it("returns null for an unrelated email (pilot user path)", () => {
    expect(findLocalReviewUserByEmail("vendor@patalign.com")).toBeNull();
  });

  it("returns null for empty / whitespace / null inputs", () => {
    expect(findLocalReviewUserByEmail(null)).toBeNull();
    expect(findLocalReviewUserByEmail(undefined)).toBeNull();
    expect(findLocalReviewUserByEmail("")).toBeNull();
    expect(findLocalReviewUserByEmail("   ")).toBeNull();
  });
});

describe("AUDIT-D19-001 admincreate pattern — accepts per-run unique consultant identities", () => {
  it("matches a typical Date.now+toString(36) suffix", () => {
    const result = findLocalReviewUserByEmail(
      "review.consultant+admincreate-1778615432-abc123@pat.local"
    );
    expect(result).not.toBeNull();
    expect(result?.key).toBe("consultant");
    // The match synthesizes a consultant entry with the supplied email
    // substituted in, so the credentials provider can return the right
    // session identity (and seed via ensureLocalReviewUserByEmail).
    expect(result?.email).toBe("review.consultant+admincreate-1778615432-abc123@pat.local");
    expect(result?.redirectTo).toBe("/consultants");
  });

  it("matches with only a timestamp suffix", () => {
    expect(
      findLocalReviewUserByEmail("review.consultant+admincreate-1778615432@pat.local")
    ).not.toBeNull();
  });

  it("normalizes case before matching", () => {
    // The auth.config credentials authorize() lowercases the email
    // before calling findLocalReviewUserByEmail, but the normalizeEmail
    // step inside findLocalReviewUserByEmail also lowercases — verify
    // the upper-case input still matches.
    expect(
      findLocalReviewUserByEmail("Review.Consultant+ADMINCREATE-XYZ@pat.local")
    ).not.toBeNull();
  });

  it("rejects suffix length over 64 chars (bounded escape hatch)", () => {
    const overlong = "a".repeat(65);
    expect(
      findLocalReviewUserByEmail(`review.consultant+admincreate-${overlong}@pat.local`)
    ).toBeNull();
  });

  it("rejects suffix with characters outside [a-z0-9.-]", () => {
    expect(
      findLocalReviewUserByEmail("review.consultant+admincreate-has space@pat.local")
    ).toBeNull();
    expect(
      findLocalReviewUserByEmail("review.consultant+admincreate-has_underscore@pat.local")
    ).toBeNull();
    expect(
      findLocalReviewUserByEmail("review.consultant+admincreate-has@symbol@pat.local")
    ).toBeNull();
  });
});

describe("AUDIT-D19-001 admincreate pattern — does NOT reclassify other consultant suffixes", () => {
  // The canonical demo-bench consultants (+sentinel, +bridgepath) have
  // their own seeded passwordHash and use the pilot-password path in
  // auth.config.ts. If findLocalReviewUserByEmail returned truthy for
  // them, the credentials provider would skip pilot and try the
  // local-review password, which doesn't match — sign-in would fail
  // silently and the consultant-flow e2e suite would regress.

  it("review.consultant+sentinel@pat.local — NOT a local-review match (stays on pilot path)", () => {
    expect(findLocalReviewUserByEmail("review.consultant+sentinel@pat.local")).toBeNull();
  });

  it("review.consultant+bridgepath@pat.local — NOT a local-review match (stays on pilot path)", () => {
    expect(findLocalReviewUserByEmail("review.consultant+bridgepath@pat.local")).toBeNull();
  });

  it("review.consultant+arbitrary@pat.local — NOT a local-review match (only +admincreate- is accepted)", () => {
    expect(findLocalReviewUserByEmail("review.consultant+other@pat.local")).toBeNull();
  });

  it("review.consultant+admincreate@pat.local (no trailing -*) — NOT a match (suffix is required)", () => {
    expect(findLocalReviewUserByEmail("review.consultant+admincreate@pat.local")).toBeNull();
  });

  it("review.vendor+admincreate-x@pat.local — NOT a match (pattern is consultant-only)", () => {
    expect(findLocalReviewUserByEmail("review.vendor+admincreate-x@pat.local")).toBeNull();
  });
});
