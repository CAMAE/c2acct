import { execFileSync } from "node:child_process";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * AUDIT-D12-001 closer (Day-18 Block 2).
 *
 * Originally filed Day 12 as: `node scripts/release/read-release-git-dirty.ts`
 * errors ERR_MODULE_NOT_FOUND on the extensionless ESM import
 * `../../lib/release/git-state`. Production paths (scripts/mac-mini/common.sh,
 * scripts/release/prepare-standalone-runtime.mjs) use `node --import tsx`
 * which masked the bug; only bare-node invocation broke. The Day-12 ticket
 * suggested "add `.js` extension" — but lib/release/git-state has no
 * compiled .js, only the .ts source. The actual minimal fix is `.ts`
 * extension on the import + `allowImportingTsExtensions: true` in
 * tsconfig.json (Node 22.6+ native type-stripping resolves `.ts` imports
 * directly).
 *
 * This test runs the script via bare `node` and asserts it emits a
 * recognizable git-dirty token — a regression here means someone forked
 * the import back to extensionless or moved git-state without updating
 * the importer.
 */

const ROOT = path.resolve(__dirname, "..");

describe("AUDIT-D12-001 read-release-git-dirty.ts works under bare node", () => {
  it("bare `node scripts/release/read-release-git-dirty.ts` exits 0 and emits clean/dirty/unknown", () => {
    const stdout = execFileSync(
      "node",
      ["scripts/release/read-release-git-dirty.ts", "--format", "state"],
      { cwd: ROOT, encoding: "utf8" }
    ).trim();
    // The format=state output is a single token: clean, dirty, or unknown.
    // (The script may also emit a MODULE_TYPELESS warning on stderr; we
    // only assert stdout shape here.)
    expect(["clean", "dirty", "unknown"]).toContain(stdout);
  });

  it("the production tsx-based invocation still works (no regression)", () => {
    const stdout = execFileSync(
      "node",
      [
        "--import",
        "tsx",
        "scripts/release/read-release-git-dirty.ts",
        "--format",
        "state",
      ],
      { cwd: ROOT, encoding: "utf8" }
    ).trim();
    expect(["clean", "dirty", "unknown"]).toContain(stdout);
  });
});
