#!/usr/bin/env node

/**
 * Regression guard: the standalone runtime must survive a SECOND build with no
 * intervening `rm -rf .next`.
 *
 * ## The bug this exists for
 *
 * `prepare-standalone-runtime.mjs` mirrors `.next/static` and `public/` into
 * `.next/standalone`, resetting each target first. The reset used
 * `fs.rmSync(..., { recursive: true, force: true })` with Node's default
 * `maxRetries: 0`, and `force` only suppresses ENOENT — not ENOTEMPTY. A
 * concurrent writer (Spotlight indexing this tree, or a running standalone
 * server holding files under the same path) racing the recursive unlink
 * produced:
 *
 *   Error: ENOTEMPTY: directory not empty, rmdir
 *     '.next/standalone/.next/static/chunks'
 *
 * It only reproduces on a SECOND build — the first finds nothing to remove — so
 * it read as an intermittent mystery and got worked around by deleting `.next`
 * by hand. Twice. This script is what stops that becoming a ritual.
 *
 * `next build` deletes `.next/standalone` and regenerates it, so the files prep
 * then tries to remove are seconds old — which is exactly when a filesystem
 * indexer is most likely to be walking them. That is the race.
 *
 * ## A second, quieter assertion
 *
 * The same "assume the destination is empty" habit appeared once more in
 * `copyReleaseProofIntoStandalone()`, as a bare `cpSync` that overlaid rather
 * than mirrored. That one cannot be tested through a full build (Next wipes the
 * directory first, so any sentinel dies for the wrong reason), so it is asserted
 * against a direct prep run instead.
 *
 * ## Why a script and not a unit test
 *
 * It runs two real Next builds. That has no business in the unit suite, which
 * has to stay fast enough to run on every change. Wiring it into the release
 * chain means it runs exactly when build staleness actually matters, and nowhere
 * else.
 *
 *   node scripts/release/verify-rebuild-without-clean.mjs
 *   node scripts/release/verify-rebuild-without-clean.mjs --reuse-existing
 *
 * `--reuse-existing` skips the first build when `.next/standalone` is already
 * populated, which is the normal case inside a release chain that has just
 * built. Without it the script builds twice from clean, which is what CI wants.
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const reuseExisting = process.argv.includes("--reuse-existing");
const standaloneDir = path.join(root, ".next", "standalone");
const staticChunksDir = path.join(standaloneDir, ".next", "static", "chunks");
const opsReleaseTarget = path.join(standaloneDir, "ops", "release");

function fail(message, extra) {
  console.error(`FAIL verify-rebuild-without-clean: ${message}`);
  if (extra) console.error(extra);
  process.exit(1);
}

function build(label) {
  console.log(`==> ${label}: pnpm build`);
  const result = spawnSync("pnpm", ["build"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  });
  if (result.status !== 0) {
    const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
    // Name the regression explicitly when we see its signature, so a future
    // failure is recognised rather than re-diagnosed from scratch.
    if (/ENOTEMPTY/.test(output)) {
      fail(
        `${label} failed with ENOTEMPTY — the standalone reset is not surviving a concurrent writer. ` +
          "See resetDir() in scripts/release/prepare-standalone-runtime.mjs (maxRetries).",
        output.slice(-2000)
      );
    }
    fail(`${label} failed with exit code ${result.status}`, output.slice(-2000));
  }
}

// --- first build: establish a populated .next/standalone ---------------------

if (reuseExisting && fs.existsSync(staticChunksDir)) {
  console.log("==> reusing the existing standalone output as the first build");
} else {
  build("first build");
}

if (!fs.existsSync(staticChunksDir)) {
  fail(
    `standalone static chunks are missing at ${path.relative(root, staticChunksDir)} — ` +
      "the first build did not produce the state this regression needs."
  );
}

// --- second build: NO clean in between ---------------------------------------
//
// This is the regression proper. The first build populated .next/standalone;
// the second must reset and repopulate it without an intervening clean.

build("second build (no clean)");

if (!fs.existsSync(staticChunksDir)) {
  fail("standalone static chunks are missing after the second build");
}

// --- mirror check, at the prep step rather than the build --------------------
//
// Tested HERE and not through `pnpm build` because `next build` deletes
// .next/standalone before regenerating it, so a sentinel written between builds
// is destroyed by Next rather than by the code under test — the assertion would
// pass whether or not the mirror worked. Measured, not assumed: a sentinel
// survives a direct prep run when copyReleaseProofIntoStandalone() overlays, and
// does not when it mirrors.
const staleSentinel = path.join(opsReleaseTarget, "__stale-sentinel-do-not-ship.json");
fs.mkdirSync(opsReleaseTarget, { recursive: true });
fs.writeFileSync(staleSentinel, `${JSON.stringify({ writtenBy: "verify-rebuild-without-clean" })}\n`);

console.log("==> mirror check: re-running prepare-standalone-runtime.mjs directly");
const prep = spawnSync("node", ["scripts/release/prepare-standalone-runtime.mjs"], {
  cwd: root,
  encoding: "utf8",
  stdio: ["ignore", "pipe", "pipe"],
  env: process.env,
});
if (prep.status !== 0) {
  fail("prepare-standalone-runtime.mjs failed on a direct re-run", `${prep.stdout ?? ""}\n${prep.stderr ?? ""}`.slice(-2000));
}

if (fs.existsSync(staleSentinel)) {
  fs.rmSync(staleSentinel, { force: true });
  fail(
    `a stale file survived the standalone prep at ${path.relative(root, staleSentinel)} — ` +
      "copyReleaseProofIntoStandalone() is overlaying rather than mirroring, so a file " +
      "removed from ops/release/ would persist in the packaged runtime."
  );
}

console.log(
  JSON.stringify(
    {
      ok: true,
      check: "rebuild-without-clean",
      standaloneDir: path.relative(root, standaloneDir),
      assertions: [
        "second pnpm build succeeds with no intervening rm -rf .next",
        "standalone static chunks present after the rebuild",
        "standalone prep mirrors ops/release rather than overlaying it",
      ],
    },
    null,
    2
  )
);
console.log("PASS verify-rebuild-without-clean");
