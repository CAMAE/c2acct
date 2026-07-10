import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  TRUST_FOOTER_LINKS,
  TRUST_RELEASE_FIELDS,
  TRUST_SURFACE_ORDER,
  TRUST_SURFACES,
  getAllTrustSurfaceText,
} from "@/lib/trustContent";

const repoRoot = process.cwd();

const expectedRoutePages = {
  "/trust": "app/trust/page.tsx",
  "/privacy": "app/privacy/page.tsx",
  "/terms": "app/terms/page.tsx",
  "/security": "app/security/page.tsx",
  "/support": "app/support/page.tsx",
  "/billing-policy": "app/billing-policy/page.tsx",
  "/methodology": "app/methodology/page.tsx",
  "/release": "app/release/page.tsx",
} as const;

const forbiddenLaunchClaims = [
  /\bSOC\s*2\s+(certified|compliant|attested)\b/i,
  /\bISO\s*27001\s+(certified|compliant|attested)\b/i,
  /\bHIPAA\s+compliant\b/i,
  /\bGDPR\s+compliant\b/i,
  /\b99\.9+\s*%\s+uptime\b/i,
  /\b(uptime|availability)\s+(guarantee|guaranteed)\b/i,
  /\bSLA\s+(guarantee|guaranteed)\b/i,
  /\btrusted by\b/i,
  /\bcustomers include\b/i,
  /\baudited by\b/i,
] as const;

function readRepoFile(relativePath: string) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

describe("PAT trust and launch-readiness surfaces", () => {
  it("defines all required public trust routes and page files", () => {
    expect(Object.keys(expectedRoutePages)).toEqual(TRUST_FOOTER_LINKS.map((link) => link.href));

    for (const [route, pagePath] of Object.entries(expectedRoutePages)) {
      expect(fs.existsSync(path.join(repoRoot, pagePath)), `${route} page exists`).toBe(true);
    }

    expect(TRUST_SURFACE_ORDER).toEqual([
      "privacy",
      "terms",
      "security",
      "support",
      "billingPolicy",
      "methodology",
      "release",
    ]);
  });

  it("keeps copy truthful for launch review and labels drafts", () => {
    const allText = getAllTrustSurfaceText();

    expect(TRUST_SURFACES.privacy.statusLabel).toBe("Policy draft");
    expect(TRUST_SURFACES.terms.statusLabel).toBe("Policy draft");
    expect(TRUST_SURFACES.billingPolicy.statusLabel).toBe("Policy draft");
    expect(allText).toContain("Public-live release state remains UNVERIFIED");
    expect(allText).toContain("The app does not store raw card numbers");
    expect(allText).toContain("Local review credentials are explicitly gated");
  });

  it("does not include historical AAE copy or unsupported launch claims", () => {
    const allText = [
      getAllTrustSurfaceText(),
      ...Object.values(expectedRoutePages).map((pagePath) => readRepoFile(pagePath)),
    ].join("\n");

    expect(allText).not.toContain("AAE");
    expect(allText).not.toContain("Autonomous Alignment Infrastructure for Accounting Firms.");
    expect(allText).not.toContain("EXECUTIVE DASHBOARD SYSTEM");

    for (const pattern of forbiddenLaunchClaims) {
      expect(allText).not.toMatch(pattern);
    }
  });

  it("shows the full public release fingerprint field chain", () => {
    expect(TRUST_RELEASE_FIELDS.map((field) => field.key)).toEqual([
      "releaseId",
      "branch",
      "commitSha",
      "buildId",
      "buildTimestamp",
      "canonicalRootName",
      "startCommand",
      "authMode",
      "buildSourceType",
      "releaseFingerprintSeed",
      "gitDirty",
    ]);

    const releasePage = readRepoFile(expectedRoutePages["/release"]);
    expect(releasePage).toContain("data-release-fingerprint");
    expect(releasePage).toContain("data-release-field");
  });

  it("keeps the release manifest wired to the trust route source files", () => {
    const manifest = JSON.parse(readRepoFile("ops/release/pat-surface-manifest.json")) as {
      routes: Record<string, { sourceFiles?: string[]; positiveMarkers?: string[] }>;
      validationArtifacts?: string[];
    };

    for (const [route, pagePath] of Object.entries(expectedRoutePages)) {
      expect(manifest.routes[route]?.sourceFiles).toContain(pagePath);
      expect(manifest.routes[route]?.sourceFiles).toContain("lib/trustContent.ts");
      expect(manifest.routes[route]?.positiveMarkers?.length ?? 0).toBeGreaterThan(0);
    }

    expect(manifest.validationArtifacts).toContain("tests/trust-surfaces.contract.test.ts");
  });
});
