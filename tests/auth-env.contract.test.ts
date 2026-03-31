import { afterEach, describe, expect, it } from "vitest";
import { getResolvedAuthEnv, getResolvedAuthSecret } from "@/lib/auth/env";

const ORIGINAL_AUTH_SECRET = process.env.AUTH_SECRET;
const ORIGINAL_NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET;

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
});
