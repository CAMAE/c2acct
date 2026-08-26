import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * RK20 — no machine-specific absolute paths in code that other machines run.
 *
 * 24 contract tests once opened with `const ROOT = "/Users/camerongarrett/..."`,
 * which meant the suite passed on exactly one laptop and would fail in CI or for
 * any second developer. This guard stops that class of debt returning.
 *
 * Scoped to the directories CI executes. The allowlist below is short, and every
 * entry carries the reason it is genuinely machine-specific rather than an
 * oversight — an allowlist without reasons becomes a dumping ground.
 */

const ROOT = process.cwd();

/** Files permitted to reference an absolute home path, and why. */
const ALLOWED = new Map<string, string>([
  [
    "lib/brand/assets.ts",
    "brandSourcePaths is PROVENANCE metadata — where the original design files live on the founder's machine. The files are not in the repo, so repo-root resolution would point at nothing.",
  ],
  [
    "scripts/release/validate-source-integrity.mjs",
    "Deliberately compares the resolved root against the known-WRONG checkout path to detect running from the wrong clone. The literal is the thing being detected.",
  ],
  [
    "scripts/mac-mini/common.sh",
    "Ops script for one specific host (the Mac mini supervisor); the path is that host's real layout.",
  ],
  [
    "scripts/audit/compare-export-to-hotfix.mjs",
    "One-off audit tool that diffs against Downloads/.Trash export bundles on the founder's machine.",
  ],
  [
    "tests/release-surface-validator.test.ts",
    "The absolute paths are FIXTURE STRINGS in an expected root_mismatch message — test data, not a filesystem root.",
  ],
  [
    "tests/no-hardcoded-paths.contract.test.ts",
    "This guard names the banned prefix in order to search for it.",
  ],
]);

/** Split so this file's own needle is not the literal being searched for. */
const HOME_PREFIX = ["/Users", "camerongarrett"].join("/");

describe("RK20 — no hardcoded machine paths", () => {
  it("no executed source file hardcodes an absolute home path", () => {
    let stdout = "";
    try {
      stdout = execFileSync(
        "grep",
        ["-rl", HOME_PREFIX, "tests", "scripts", "lib", "app", "e2e", "evals"],
        { cwd: ROOT, encoding: "utf8" }
      );
    } catch (error) {
      // grep exits 1 when nothing matches — that is the clean case.
      stdout = (error as { stdout?: string }).stdout ?? "";
    }

    const offenders = stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((file) => path.relative(ROOT, path.resolve(ROOT, file)))
      .filter((file) => !ALLOWED.has(file))
      .sort();

    expect(
      offenders,
      `Hardcoded machine paths found. Resolve from the repo root instead (tests: process.cwd()). ` +
        `If a path is genuinely machine-specific, add it to ALLOWED with a reason.`
    ).toEqual([]);
  });

  it("every allowlist entry still exists and still needs the exemption", () => {
    for (const [file, reason] of ALLOWED) {
      expect(existsSync(path.join(ROOT, file)), `${file} is allowlisted but missing`).toBe(true);
      expect(reason.length, `${file} needs a real reason`).toBeGreaterThan(40);
      // A stale exemption is worse than none: if the path is gone, the entry
      // should go too rather than silently widening the guard.
      const text = readFileSync(path.join(ROOT, file), "utf8");
      expect(text.includes(HOME_PREFIX), `${file} no longer needs its exemption`).toBe(true);
    }
  });
});
