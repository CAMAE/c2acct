import { describe, expect, it } from "vitest";
import { PROTECTED_PAT_API_PREFIXES, PROTECTED_PAT_PAGE_PREFIXES, buildLoginRedirectPath } from "@/lib/authz";
import { PROTECTED_PAT_PROXY_MATCHER, config } from "@/proxy";
import authConfig from "@/auth.config";

describe("authz and proxy contracts", () => {
  it("keeps proxy matcher coverage aligned with declared protected page and api prefixes", () => {
    const expectedMatcher = [...PROTECTED_PAT_PAGE_PREFIXES, ...PROTECTED_PAT_API_PREFIXES].map(
      (prefix) => `${prefix}/:path*`
    );

    expect(PROTECTED_PAT_PROXY_MATCHER).toEqual(expectedMatcher);
    expect(config.matcher).toEqual(expectedMatcher);
    expect(PROTECTED_PAT_PROXY_MATCHER).toContain("/api/firm/product-assessment/draft/:path*");
    expect(PROTECTED_PAT_PROXY_MATCHER).toContain("/api/vendor/product-assessment/draft/:path*");
  });

  it("builds protected-page redirects against the canonical sign-in route", () => {
    expect(
      buildLoginRedirectPath({
        pathname: "/vendor/product-insight",
        search: "?panel=signals",
      })
    ).toBe("/sign-in?callbackUrl=%2Fvendor%2Fproduct-insight%3Fpanel%3Dsignals");
  });

  it("configures Auth.js to use /sign-in as the canonical sign-in page", () => {
    expect(authConfig.pages?.signIn).toBe("/sign-in");
  });
});
