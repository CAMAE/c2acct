import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * AUDIT-D16-001 contract — Day-18 Block 1 (option a).
 *
 * Static guard for `scripts/release/promote-known-good.mjs`. The promote
 * script and the runtime fingerprint reader must use the SAME source of
 * truth (`lib/release/fingerprint.ts` via
 * `scripts/release/read-release-fingerprint.ts`). If a future refactor
 * forks the writer onto its own implementation, this test fails and the
 * promotion can silently drift away from what the runtime reports.
 *
 * Style note: synchronous readFileSync source-string inspection, matching
 * tests/demo-benchmark-seed.contract.test.ts and tests/*.contract.test.ts.
 */

const ROOT = path.resolve(__dirname, "..");

describe("AUDIT-D16-001 promote-known-good wiring contract", () => {
  const promoteSource = readFileSync(
    path.join(ROOT, "scripts/release/promote-known-good.mjs"),
    "utf8"
  );

  it("reads the current fingerprint via scripts/release/read-release-fingerprint.ts (single source of truth)", () => {
    expect(promoteSource).toMatch(/read-release-fingerprint\.ts/);
    expect(promoteSource).toMatch(/execFileSync\([\s\n]*"node"/);
  });

  it("does NOT reimplement fingerprint computation (no direct lib/release/fingerprint import; no inline createHash)", () => {
    // The promote script must invoke read-release-fingerprint.ts, not
    // import lib/release/fingerprint directly (which would risk encoding
    // a different `.canonicalRoot ?? contract` precedence than the
    // runtime). And no inline crypto.createHash — that would mean a
    // local re-implementation of the fingerprint seed.
    expect(promoteSource).not.toMatch(/from\s+["']\.\.\/\.\.\/lib\/release\/fingerprint["']/);
    expect(promoteSource).not.toMatch(/createHash\s*\(/);
  });

  it("writes last-known-good-release.json atomically (.tmp + rename, never direct write)", () => {
    // Day-16's fc69af0 atomic-write discipline. A non-atomic write race
    // between concurrent readers (e.g. nightly verify reading mid-write)
    // would surface as a truncated-JSON parse error.
    expect(promoteSource).toMatch(/\.tmp\./);
    expect(promoteSource).toMatch(/renameSync\s*\(/);
  });

  it("preserves prior known-good as previous-known-good-release.json before overwriting", () => {
    // Rollback safety: a future regression detected after promotion needs
    // a recoverable prior state. Same pattern as prelaunch-gate.mjs.
    expect(promoteSource).toMatch(/previous-known-good-release\.json/);
  });

  it("is idempotent: a re-run with last-known-good already current is a no-op (logs 'already current')", () => {
    expect(promoteSource).toMatch(/already current/);
  });

  it("logs the promotion transition in 'promoted from X to Y' form", () => {
    // Day-N validation outputs must show whether promotion fired so the
    // launch-proof bucket-map evidence trail is clear.
    expect(promoteSource).toMatch(/promoted from \$\{[^}]*\} to \$\{[^}]*\}/);
  });

  it("is wired into scripts/validate-launch.ts AFTER release:prelaunch", () => {
    const validateLaunchSource = readFileSync(
      path.join(ROOT, "scripts/validate-launch.ts"),
      "utf8"
    );
    const prelaunchIdx = validateLaunchSource.indexOf('"release:prelaunch"');
    const promoteIdx = validateLaunchSource.indexOf('"release:promote-known-good"');
    expect(prelaunchIdx).toBeGreaterThan(-1);
    expect(promoteIdx).toBeGreaterThan(-1);
    expect(promoteIdx).toBeGreaterThan(prelaunchIdx);
  });

  it("is exposed as a pnpm script in package.json so it can be invoked standalone", () => {
    const packageSource = readFileSync(path.join(ROOT, "package.json"), "utf8");
    expect(packageSource).toMatch(/"release:promote-known-good":/);
  });
});
