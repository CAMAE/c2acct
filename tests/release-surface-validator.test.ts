import { describe, expect, it } from "vitest";

describe("release surface validator", async () => {
  const validator = await import("../scripts/release/validate-pat-surfaces.mjs");

  it("fails when the homepage contains historical AAE markers", () => {
    const failures = validator.validateRouteHtml(
      "/",
      "<html><body>AAE Autonomous Alignment Infrastructure for Accounting Firms. Top Seven Outputs</body></html>",
      {
        positiveMarkers: ["PAT", "Choose your path"],
      },
      ["AAE", "Autonomous Alignment Infrastructure for Accounting Firms.", "Top Seven Outputs"]
    );

    expect(failures).toContain("/:missing_positive:PAT");
    expect(failures).toContain("/:forbidden_marker:AAE");
    expect(failures).toContain("/:forbidden_marker:Top Seven Outputs");
  });

  it("fails when /login remains a first-class login surface", () => {
    const failures = validator.validateLoginCompatibility(
      {
        status: 200,
        headers: new Headers(),
        bodyText: "Continue with GitHub for pre-approved GitHub accounts",
      },
      {
        expectedRedirectPrefix: "/sign-in",
        forbiddenMarkers: ["Continue with GitHub", "pre-approved GitHub accounts"],
      }
    );

    expect(failures).toContain("/login:expected_redirect_status:200");
    expect(failures).toContain("/login:bad_redirect_target:missing");
    expect(failures).toContain("/login:forbidden_body_marker:Continue with GitHub");
    expect(failures).toContain("/login:forbidden_body_marker:pre-approved GitHub accounts");
  });
});
