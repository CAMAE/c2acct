import { describe, expect, it } from "vitest";
import { buildCanonicalSignInPath } from "@/lib/auth/routes";

describe("/login compatibility contract", () => {
  it("forwards safe PAT redirect context into /sign-in", () => {
    expect(
      buildCanonicalSignInPath({
        callbackUrl: "/admin",
        authReset: "1",
        authResetReason: "stale_callback",
      })
    ).toBe("/sign-in?callbackUrl=%2Fadmin&view=admin&authReset=1&authResetReason=stale_callback");
  });

  it("sanitizes external redirect targets before forwarding to /sign-in", () => {
    expect(
      buildCanonicalSignInPath({
        callbackUrl: "https://evil.example/phish",
        redirectTo: "https://evil.example/phish",
      })
    ).toBe("/sign-in?callbackUrl=%2F&redirectTo=%2F");
  });

  it("keeps /sign-in as the only canonical route even when /login receives an auth error", () => {
    expect(
      buildCanonicalSignInPath({
        callbackUrl: "/vendor",
        error: "InvalidCheck",
      })
    ).toBe("/sign-in?callbackUrl=%2Fvendor&view=vendor&error=InvalidCheck");
  });
});
