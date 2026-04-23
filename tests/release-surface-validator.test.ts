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

  it("fails when the homepage contains the exact stale AAE screenshot chrome", () => {
    const failures = validator.validateRouteHtml(
      "/",
      "<html><body>Executive dashboard system Premium top-level routing with local drilldowns Quick Actions Insights Bridge</body></html>",
      {
        positiveMarkers: ["PAT", "Choose your path"],
      },
      [
        "EXECUTIVE DASHBOARD SYSTEM",
        "Premium top-level routing with local drilldowns",
        "Quick Actions",
        "Insights Bridge",
      ]
    );

    expect(failures).toContain("/:missing_positive:PAT");
    expect(failures).toContain("/:forbidden_marker:EXECUTIVE DASHBOARD SYSTEM");
    expect(failures).toContain("/:forbidden_marker:Premium top-level routing with local drilldowns");
    expect(failures).toContain("/:forbidden_marker:Quick Actions");
    expect(failures).toContain("/:forbidden_marker:Insights Bridge");
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

  it("uses the consultant-enabled sign-in markers when consultant access is on", () => {
    const manifest = validator.loadManifest(process.cwd());
    const consultantRoute = manifest.routes["/sign-in?view=consultant"];
    const effectiveRoute = validator.resolveRouteValidationConfig(consultantRoute, {
      ...process.env,
      PAT_ENABLE_CONSULTANT_ACCESS: "1",
    });
    const failures = validator.validateRouteHtml(
      "/sign-in?view=consultant",
      "<html><body><section><div>Consultant</div><h2>Assigned briefing access</h2><div>Landing route: /consultants</div></section></body></html>",
      effectiveRoute,
      manifest.globalForbiddenMarkers
    );

    expect(effectiveRoute.validationMode).toBe("enabled");
    expect(failures).toEqual([]);
  });

  it("uses the consultant-disabled sign-in markers when consultant access is off", () => {
    const manifest = validator.loadManifest(process.cwd());
    const consultantRoute = manifest.routes["/sign-in?view=consultant"];
    const effectiveRoute = validator.resolveRouteValidationConfig(consultantRoute, {
      ...process.env,
      PAT_ENABLE_CONSULTANT_ACCESS: "0",
    });
    const failures = validator.validateRouteHtml(
      "/sign-in?view=consultant",
      "<html><body><div>Consultant access is disabled in this runtime until the company-scoped consultant plane is explicitly re-enabled for proof. The vendor entry remains the default sign-in path here.</div><section><div>Landing route: /vendor</div></section></body></html>",
      effectiveRoute,
      manifest.globalForbiddenMarkers
    );

    expect(effectiveRoute.validationMode).toBe("disabled");
    expect(failures).toEqual([]);
  });

  it("fails when release fingerprint metadata does not match canonical runtime ownership", () => {
    const failures = validator.validateRuntimeOwnership(
      {
        canonicalRootName: "wrong-root",
        buildSourceType: "next-start",
        startCommand: "next start",
        authMode: "local-review",
        releaseFingerprintSeed: "wrong-seed",
      },
      {
        failures: ["root_mismatch expected=/Users/camerongarrett/work/c2acct-live actual=/Users/camerongarrett/work/c2acct"],
        canonicalRoot: "/Users/camerongarrett/work/c2acct-live",
        runtimeSourceType: "standalone-build",
        startCommand: "node .next/standalone/server.js",
        authMode: "github",
        releaseFingerprintSeed: "expected-seed",
      }
    );

    expect(failures).toContain(
      "source_integrity:root_mismatch expected=/Users/camerongarrett/work/c2acct-live actual=/Users/camerongarrett/work/c2acct"
    );
    expect(failures).toContain("runtime_ownership:root_name_mismatch:wrong-root:c2acct-live");
    expect(failures).toContain("runtime_ownership:build_source_mismatch:next-start:standalone-build");
    expect(failures).toContain("runtime_ownership:start_command_mismatch:next start:node .next/standalone/server.js");
    expect(failures).toContain("runtime_ownership:auth_mode_mismatch:local-review:github");
    expect(failures).toContain("runtime_ownership:seed_mismatch:wrong-seed:expected-seed");
  });
});
