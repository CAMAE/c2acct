import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  buildExportManifest,
  CRITICAL_EXPORT_PATHS,
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
    expect(manifest.forbiddenPresentInExport).toEqual([]);
  });

  it("exports source truth, proof artifacts, scripts, Prisma schema, migrations, and tests without forbidden junk", () => {
    const destination = makeTempDir();
    const result = runSafeExport({
      sourceRoot: process.cwd(),
      destination,
      dryRun: false,
    });

    expect(result.manifest.summary.ok).toBe(true);
    for (const criticalPath of [
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
  });
});
