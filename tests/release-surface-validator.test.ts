import { describe, expect, it } from "vitest";

type ReleaseArtifactAgreementResult = {
  expected: Record<string, string | number>;
  failures: string[];
  warnings: string[];
};

type SourceIntegrityModule = {
  validateReleaseArtifactAgreement(input: Record<string, unknown>): ReleaseArtifactAgreementResult;
};

describe("release surface validator", async () => {
  const validator = await import("../scripts/release/validate-pat-surfaces.mjs");
  const sourceIntegrity = (await import(
    "../scripts/release/validate-source-integrity.mjs"
  )) as unknown as SourceIntegrityModule;

  const buildReleaseArtifactFixture = (gitDirty: "clean" | "dirty") => {
    const root = process.cwd();
    const timestamp = "2026-04-26T00:00:00Z";
    const commitSha = "1234567890abcdef1234567890abcdef12345678";
    const branch = "release/source-of-truth-test";
    const contract = {
      canonicalRoot: root,
      authMode: "github",
      runtimeSourceType: "standalone-build",
      startCommand: "node .next/standalone/server.js",
    };
    const baseCanonicalState = {
      schemaVersion: 1,
      canonicalRoot: contract.canonicalRoot,
      authMode: contract.authMode,
      runtimeSourceType: contract.runtimeSourceType,
      startCommand: contract.startCommand,
      branch,
      commitSha,
      gitDirty,
      releaseFingerprintSeed: "",
      writtenAt: timestamp,
      buildReason: "unit-test",
    };
    const initial = sourceIntegrity.validateReleaseArtifactAgreement({
      root,
      contract,
      canonicalState: baseCanonicalState,
      releaseState: null,
      expectedLiveRelease: null,
      lastKnownGoodRelease: null,
      branch,
      commitSha,
      gitDirty,
    });
    const releaseState = {
      BUILD_TIME_UTC: timestamp,
      BUILD_REASON: "unit-test",
      BRANCH: branch,
      COMMIT: commitSha.slice(0, 7),
      GIT_DIRTY: gitDirty,
      BUILD_ID: String(initial.expected.buildId),
    };
    const expected = sourceIntegrity.validateReleaseArtifactAgreement({
      root,
      contract,
      canonicalState: {
        ...baseCanonicalState,
        releaseFingerprintSeed: String(initial.expected.releaseFingerprintSeed),
      },
      releaseState,
      expectedLiveRelease: null,
      lastKnownGoodRelease: null,
      branch,
      commitSha,
      gitDirty,
    }).expected;

    return {
      root,
      contract,
      branch,
      commitSha,
      gitDirty,
      canonicalState: {
        ...baseCanonicalState,
        releaseFingerprintSeed: String(expected.releaseFingerprintSeed),
      },
      releaseState,
      expected,
    };
  };

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

  it("does not treat short forbidden markers as substrings inside release hashes", () => {
    const failures = validator.validateRouteHtml(
      "/release",
      "<html><body><dd>e49c13a1d115daaefa1292652429e9c2a2b6a363</dd><p>PAT release proof</p></body></html>",
      {
        positiveMarkers: ["PAT"],
      },
      ["AAE"]
    );

    expect(failures).toEqual([]);
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

  it("fails when a clean release state emits a dirty expected live release", () => {
    const fixture = buildReleaseArtifactFixture("clean");
    const failures = sourceIntegrity.validateReleaseArtifactAgreement({
      ...fixture,
      expectedLiveRelease: {
        ...fixture.expected,
        gitDirty: "dirty",
      },
      lastKnownGoodRelease: null,
    }).failures;

    expect(failures).toContain(
      "expected_live_release_gitDirty_mismatch expected=clean actual=dirty"
    );
  });

  it("fails when a dirty release state is marked clean in artifacts", () => {
    const fixture = buildReleaseArtifactFixture("dirty");
    const failures = sourceIntegrity.validateReleaseArtifactAgreement({
      ...fixture,
      canonicalState: {
        ...fixture.canonicalState,
        gitDirty: "clean",
      },
      releaseState: {
        ...fixture.releaseState,
        GIT_DIRTY: "clean",
      },
      expectedLiveRelease: {
        ...fixture.expected,
        gitDirty: "clean",
      },
      lastKnownGoodRelease: null,
    }).failures;

    expect(failures).toContain("canonical_state_gitDirty_mismatch expected=dirty actual=clean");
    expect(failures).toContain("release_state_GIT_DIRTY_mismatch expected=dirty actual=clean");
    expect(failures).toContain(
      "expected_live_release_gitDirty_mismatch expected=dirty actual=clean"
    );
  });

  it("fails closed when last-known-good release is stale", () => {
    const fixture = buildReleaseArtifactFixture("clean");
    const staleLastKnownGood = {
      ...fixture.expected,
      releaseId: "abcdef0:stale-build",
      commitSha: "abcdef0123456789abcdef0123456789abcdef01",
      commitShort: "abcdef0",
      buildId: "stale-build",
    };
    const failures = sourceIntegrity.validateReleaseArtifactAgreement({
      ...fixture,
      expectedLiveRelease: fixture.expected,
      lastKnownGoodRelease: staleLastKnownGood,
    }).failures;

    expect(failures).toContain(
      `last_known_good_release_not_current expected=${fixture.expected.releaseId} actual=abcdef0:stale-build`
    );
  });

  it("allows stale last-known-good only during explicit promotion prechecks", () => {
    const fixture = buildReleaseArtifactFixture("clean");
    const staleLastKnownGood = {
      ...fixture.expected,
      releaseId: "abcdef0:stale-build",
      commitSha: "abcdef0123456789abcdef0123456789abcdef01",
      commitShort: "abcdef0",
      buildId: "stale-build",
    };
    const result = sourceIntegrity.validateReleaseArtifactAgreement({
      ...fixture,
      expectedLiveRelease: fixture.expected,
      lastKnownGoodRelease: staleLastKnownGood,
      allowStaleLastKnownGood: true,
    });

    expect(result.failures).toEqual([]);
    expect(result.warnings).toContain(
      `last_known_good_release_not_current expected=${fixture.expected.releaseId} actual=abcdef0:stale-build`
    );
  });

  it("fails when last-known-good claims the current release with mismatched fields", () => {
    const fixture = buildReleaseArtifactFixture("clean");
    const failures = sourceIntegrity.validateReleaseArtifactAgreement({
      ...fixture,
      expectedLiveRelease: fixture.expected,
      lastKnownGoodRelease: {
        ...fixture.expected,
        gitDirty: "dirty",
      },
    }).failures;

    expect(failures).toContain(
      "last_known_good_release_gitDirty_mismatch expected=clean actual=dirty"
    );
  });
});
