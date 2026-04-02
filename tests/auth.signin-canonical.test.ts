import { describe, expect, it } from "vitest";
import authConfig from "@/auth.config";
import {
  buildProtectedSignInRedirectPath,
  inferCanonicalSignInView,
  resolvePostAuthRedirectForView,
} from "@/lib/auth/routes";

describe("canonical PAT sign-in contract", () => {
  it("points Auth.js at /sign-in", () => {
    expect(authConfig.pages?.signIn).toBe("/sign-in");
  });

  it("redirects protected PAT routes into /sign-in with a safe callback", () => {
    expect(
      buildProtectedSignInRedirectPath({
        pathname: "/firm/insights",
        search: "?submitted=1",
      })
    ).toBe("/sign-in?callbackUrl=%2Ffirm%2Finsights%3Fsubmitted%3D1&view=firm");
  });

  it("infers the correct PAT role view from deep-link targets", () => {
    expect(inferCanonicalSignInView("/vendor/product-insight/demo-product")).toBe("vendor");
    expect(inferCanonicalSignInView("/firm/insights")).toBe("firm");
    expect(inferCanonicalSignInView("/user/profile")).toBe("individual");
    expect(inferCanonicalSignInView("/admin/runtime")).toBe("admin");
  });

  it("preserves deep-link post-auth routing only for the matching role view", () => {
    expect(resolvePostAuthRedirectForView("firm", "/firm/insights?submitted=1")).toBe(
      "/firm/insights?submitted=1"
    );
    expect(resolvePostAuthRedirectForView("vendor", "/firm/insights?submitted=1")).toBe("/vendor");
  });
});
