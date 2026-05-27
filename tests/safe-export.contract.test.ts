import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildExportManifest,
  CRITICAL_EXPORT_PATHS,
  EXPORT_BUNDLES,
  EXCLUDED_EXPORT_RULES,
  runSafeExport,
} from "@/scripts/export-codebase-safe.mjs";

const tempDirs: string[] = [];

function makeTempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pat-safe-export-test-"));
  tempDirs.push(dir);
  return dir;
}

describe("safe export contract", () => {
  afterEach(() => {
    for (const dir of tempDirs.splice(0)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("documents critical source-of-truth paths and forbidden export paths", () => {
    expect(CRITICAL_EXPORT_PATHS.map((entry) => entry.path)).toEqual(expect.arrayContaining([
      "app",
      "app/components",
      "app/globals.css",
      "lib",
      "public",
      "auth.ts",
      "auth.config.ts",
      "proxy.ts",
      "next.config.ts",
      "tsconfig.json",
      "eslint.config.mjs",
      "playwright.config.ts",
      "vitest.config.ts",
      "README.md",
      "docs/active-repo-map.md",
      "docs/CORE_BUILD_AAE.md",
      "artifacts/launch-proof/4.26.26-launch-proof.json",
      "artifacts/launch-proof/4.26.26-launch-proof.md",
      "package.json",
      "prisma/schema.prisma",
      "prisma/migrations",
      "scripts/release",
      "tests",
    ]));
    expect(EXPORT_BUNDLES.map((bundle) => bundle.name)).toEqual([
      "01-app-root",
      "02-db-scripts-ops-tests",
      "03-docs-audit-artifacts",
    ]);
    expect(EXPORT_BUNDLES.find((bundle) => bundle.name === "01-app-root")?.entries).toEqual(
      expect.arrayContaining([
        "app",
        "components",
        "lib",
        "public",
        "middleware.ts",
        "auth.ts",
        "auth.config.ts",
        "proxy.ts",
        "next.config.ts",
        "tsconfig.json",
        "eslint.config.mjs",
        "playwright.config.ts",
        "vitest.config.ts",
      ])
    );
    expect(EXCLUDED_EXPORT_RULES.map((entry) => entry.pattern)).toEqual(expect.arrayContaining([
      ".git/",
      ".env*",
      ".next/",
      "node_modules/",
      "artifacts/mac-mini/",
      "*.pem",
      "*.log",
    ]));
  });

  it("dry-runs a manifest proving critical paths are planned and forbidden paths are excluded", () => {
    const destination = makeTempDir();
    const manifest = buildExportManifest({
      sourceRoot: process.cwd(),
      destination,
      mode: "dry-run",
    });

    expect(manifest.summary.ok).toBe(true);
    expect(manifest.criticalPaths.every((entry) => entry.existsInSource)).toBe(true);
    expect(manifest.criticalPaths.every((entry) => entry.plannedForExport)).toBe(true);
    expect(manifest.bundles.map((bundle) => bundle.name)).toEqual([
      "01-app-root",
      "02-db-scripts-ops-tests",
      "03-docs-audit-artifacts",
    ]);
    expect(manifest.bundles.find((bundle) => bundle.name === "01-app-root")?.includedEntries).toEqual(
      expect.arrayContaining(["app", "lib", "public"])
    );
    expect(manifest.forbiddenPresentInExport).toEqual([]);
  });

  it("exports app source, source truth, proof artifacts, scripts, Prisma schema, migrations, and tests without forbidden junk", () => {
    const destination = makeTempDir();
    const result = runSafeExport({
      sourceRoot: process.cwd(),
      destination,
      dryRun: false,
    });

    expect(result.manifest.summary.ok).toBe(true);
    for (const criticalPath of [
      "app",
      "app/components",
      "app/globals.css",
      "lib",
      "public",
      "auth.ts",
      "auth.config.ts",
      "proxy.ts",
      "next.config.ts",
      "tsconfig.json",
      "eslint.config.mjs",
      "playwright.config.ts",
      "vitest.config.ts",
      "README.md",
      "docs/active-repo-map.md",
      "docs/CORE_BUILD_AAE.md",
      "artifacts/launch-proof/4.26.26-launch-proof.md",
      "package.json",
      "prisma/schema.prisma",
      "prisma/migrations",
      "scripts/release",
      "tests",
    ]) {
      expect(fs.existsSync(path.join(destination, criticalPath))).toBe(true);
    }
    for (const forbiddenPath of [
      ".git",
      ".env.local",
      ".next",
      "node_modules",
      "artifacts/mac-mini",
      "logs",
    ]) {
      expect(fs.existsSync(path.join(destination, forbiddenPath))).toBe(false);
    }
    expect(fs.existsSync(path.join(destination, "EXPORT_MANIFEST.json"))).toBe(true);
    expect(fs.existsSync(path.join(destination, "SHA256SUMS.txt"))).toBe(true);
    for (const zipName of [
      "01-app-root.zip",
      "02-db-scripts-ops-tests.zip",
      "03-docs-audit-artifacts.zip",
    ]) {
      expect(fs.existsSync(path.join(destination, zipName))).toBe(true);
      expect(fs.statSync(path.join(destination, zipName)).size).toBeGreaterThan(0);
    }
    expect(result.manifest.bundles).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: "01-app-root",
          zipName: "01-app-root.zip",
          presentInExport: true,
          includedEntries: expect.arrayContaining(["app", "lib", "public"]),
        }),
      ])
    );
    expect(result.manifest.bundles.every((bundle) => typeof bundle.sha256 === "string")).toBe(true);
    const sha256Sums = fs.readFileSync(path.join(destination, "SHA256SUMS.txt"), "utf8");
    expect(sha256Sums).toContain("01-app-root.zip");
    expect(sha256Sums).toContain("02-db-scripts-ops-tests.zip");
    expect(sha256Sums).toContain("03-docs-audit-artifacts.zip");
  });
});
