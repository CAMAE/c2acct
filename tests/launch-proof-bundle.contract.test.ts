import { describe, expect, it } from "vitest";

describe("launch proof bundle contract", async () => {
  const proof = await import("../scripts/release/generate-launch-proof-bundle.mjs");

  function buildMinimalBundle() {
    const validationResults = Object.fromEntries(
      Object.entries(proof.REQUIRED_VALIDATION_COMMANDS).map(([key, command]) => [
        key,
        {
          key,
          command,
          status: "COMPLETE",
          summary: "fixture passed",
          completedAt: "2026-04-26T00:00:00.000Z",
        },
      ])
    );
    const knownItems = [
      {
        key: "release-source-of-truth",
        status: "COMPLETE",
        label: "Release proof agrees.",
        proof: "fixture-release",
      },
      {
        key: "provider-billing",
        status: "PARTIAL",
        label: "Provider path exists but no live roundtrip proof.",
        proof: "fixture-provider",
      },
      {
        key: "pat-png",
        status: "MISSING",
        label: "Exact PAT.png proof.",
        proof: "fixture-missing",
      },
      {
        key: "conflict-scan",
        status: "CONFLICTING",
        label: "Synthetic conflicting fixture proves bucket presence.",
        proof: "fixture-conflict",
      },
      {
        key: "commercial-policy",
        status: "DEFERRED",
        label: "Commercial policy finalized later.",
        proof: "fixture-deferred",
      },
      {
        key: "public-live",
        status: "UNVERIFIED",
        label: "Public live proof absent.",
        proof: "fixture-unverified",
      },
    ];

    return {
      schemaVersion: 1,
      proofName: "PAT final 4.26.26 launch proof bundle",
      generatedAt: "2026-04-26T00:00:00.000Z",
      objectiveDate: "2026-04-26",
      root: "/repo",
      package: {
        packageManager: "pnpm@10.32.1",
        buildCommand: "next build --webpack",
        startCommand: "node .next/standalone/server.js",
      },
      runtimeVersions: {
        node: "v20.0.0",
        pnpm: "10.32.1",
        platform: "darwin",
        arch: "arm64",
      },
      releaseIdentity: {
        status: "COMPLETE",
        branch: "release/test",
        commitSha: "1234567890abcdef1234567890abcdef12345678",
        commitShort: "1234567",
        buildId: "build_fixture",
        buildTimestamp: "2026-04-26T00:00:00.000Z",
        canonicalRoot: "/repo",
        canonicalRootName: "repo",
        startCommand: "node .next/standalone/server.js",
        authMode: "github",
        gitDirty: "clean",
        releaseId: "1234567:build_fixture",
      },
      sourceIntegrity: {
        status: "COMPLETE",
        failures: [],
        warnings: [],
        dirtyEntries: [],
        ignoredDirtyEntries: [],
        artifactAgreement: {},
      },
      releaseFingerprint: {
        releaseId: "1234567:build_fixture",
        commitSha: "1234567890abcdef1234567890abcdef12345678",
        branch: "release/test",
        buildId: "build_fixture",
        buildTimestamp: "2026-04-26T00:00:00.000Z",
        authMode: "github",
        buildSourceType: "standalone-build",
        canonicalRootName: "repo",
        releaseFingerprintSeed: "seed",
        startCommand: "node .next/standalone/server.js",
        gitDirty: "clean",
      },
      buildState: {
        status: "COMPLETE",
        packageManager: "pnpm@10.32.1",
        buildCommand: "next build --webpack",
        startCommand: "node .next/standalone/server.js",
        buildId: "build_fixture",
        buildTimestamp: "2026-04-26T00:00:00.000Z",
      },
      auth: {
        status: "COMPLETE",
        mode: "github",
        localReviewMode: "disabled-by-default",
        proof: "fixture auth proof",
      },
      billing: {
        status: "COMPLETE",
        provider: "stripe",
        mode: "scaffold-only",
        paymentModeProof: "fixture billing proof",
      },
      paymentMode: {
        status: "COMPLETE",
        mode: "scaffold-only",
        provider: "stripe",
        proof: "fixture payment proof",
        liveProviderRoundtrip: {
          status: "UNVERIFIED",
          reason: "fixture no live roundtrip",
        },
      },
      migrations: {
        status: "COMPLETE",
        latest: [{ name: "20260426000000_fixture", finishedAt: "2026-04-26T00:00:00.000Z" }],
      },
      seedStatus: {
        status: "COMPLETE",
        commands: ["pnpm seed:baseline", "pnpm seed:pat-runtime"],
        demoSeedVersion: "fixture-demo",
        proof: "fixture seed proof",
      },
      demoData: {
        status: "COMPLETE",
        demoSeedVersion: "fixture-demo",
        routeReady: true,
        counts: {
          vendors: 10,
          products: 30,
          firms: 10,
          users: 5,
          completedSurveySubmissions: 130,
        },
      },
      routeSmoke: {
        status: "COMPLETE",
        ok: true,
        routeEvidence: {},
        apiFingerprint: { releaseId: "1234567:build_fixture" },
        healthFingerprint: { releaseId: "1234567:build_fixture" },
        failures: [],
      },
      validationResults,
      brandIntegration: {
        patPng: {
          status: "MISSING",
          expectedPath: "public/PAT.png",
          sha256: null,
          discoveredPatBrandAssets: [],
          note: "fixture missing",
        },
      },
      publicLiveQA: {
        status: "UNVERIFIED",
        url: null,
        reason: "fixture no live URL",
        evidence: [],
      },
      knownItems,
      statusBuckets: Object.fromEntries(
        proof.LAUNCH_PROOF_STATUSES.map((status: string) => [
          status,
          knownItems.filter((item) => item.status === status),
        ])
      ),
    };
  }

  it("requires every launch-proof field and status bucket", () => {
    const bundle = buildMinimalBundle();
    const result = proof.validateLaunchProofBundle(bundle);

    expect(result.failures).toEqual([]);
    expect(result.ok).toBe(true);
    for (const status of proof.LAUNCH_PROOF_STATUSES) {
      expect(Array.isArray(bundle.statusBuckets[status])).toBe(true);
    }
  });

  it("fails when future bundles omit payment, public-live, route smoke, or validation proof", () => {
    const bundle = buildMinimalBundle();
    delete (bundle as Record<string, unknown>).paymentMode;
    delete (bundle.validationResults as Record<string, unknown>).typecheck;
    delete (bundle.brandIntegration.patPng as Record<string, unknown>).status;
    delete (bundle.publicLiveQA as Record<string, unknown>).status;
    delete (bundle.routeSmoke as Record<string, unknown>).status;

    const result = proof.validateLaunchProofBundle(bundle);

    expect(result.ok).toBe(false);
    expect(result.failures).toContain("paymentMode:missing");
    expect(result.failures).toContain("validationResults.typecheck:missing");
    expect(result.failures).toContain("brandIntegration.patPng.status:missing");
    expect(result.failures).toContain("publicLiveQA.status:missing");
    expect(result.failures).toContain("routeSmoke.status:missing");
  });

  it("keeps route-smoke known-item proof explicit when route smoke is unrequested", () => {
    const summary = proof.summarizeRouteSmokeKnownItemProof({
      status: "UNVERIFIED",
      ok: null,
      reason: "Route smoke was not requested for this proof generation run.",
      failures: [],
    });

    expect(summary).toBe("Route smoke was not requested for this proof generation run.");
  });
});
