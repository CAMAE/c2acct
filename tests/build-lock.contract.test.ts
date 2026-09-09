import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Finish box (2026-09-08), item 3: the launchd job (com.c2acct.app, KeepAlive)
 * rebuilds whenever .next/standalone/server.js is missing, and every next build
 * removes that file mid-run, so a manual build and the launchd build could race
 * (2026-09-04 21:40). Smallest guard: `pnpm build` runs through a lock wrapper,
 * and the launchd helper waits on the lock instead of starting a competing build.
 */
const read = (rel: string) => readFileSync(path.join(process.cwd(), rel), "utf8");

describe("build race guard", () => {
  it("pnpm build runs through the lock wrapper", () => {
    const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
    expect(pkg.scripts.build).toBe("node scripts/release/build-lock.mjs");
  });

  it("the wrapper takes an atomic lock, refuses a live holder with one log line, reclaims a dead one, and always releases", () => {
    const src = read("scripts/release/build-lock.mjs");
    expect(src).toContain('"artifacts", "mac-mini", "state", "build.lock"');
    expect(src).toMatch(/mkdirSync\(lockDir\);/);
    expect(src).toContain("refusing: a build is already running (pid");
    expect(src).toContain("process.exit(75)");
    expect(src).toContain("reclaiming stale lock");
    expect(src).toMatch(/\["pnpm", \["exec", "next", "build", "--webpack"\]\]/);
    expect(src).toMatch(/\["node", \["scripts\/release\/prepare-standalone-runtime\.mjs"\]\]/);
    expect(src).toMatch(/finally \{\s*release\(\);/);
  });

  it("the launchd helper waits on the lock and skips the build if the artifact appeared", () => {
    const sh = read("scripts/mac-mini/common.sh");
    expect(sh).toContain('lock_dir="${MAC_MINI_ROOT}/artifacts/mac-mini/state/build.lock"');
    expect(sh).toContain("waiting instead of starting a competing build");
    expect(sh).toContain("Standalone build appeared while waiting");
    expect(sh).toMatch(/while \[ -d "\$\{lock_dir\}" \] && \[ "\$\{waited\}" -lt 1800 \]/);
  });
});
