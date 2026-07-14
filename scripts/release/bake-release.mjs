#!/usr/bin/env node
/**
 * Bake the SINGLE SOURCE OF TRUTH release fingerprint for CLOUD builds.
 *
 * Runs at the START of the build command (BEFORE `next build`) so the file exists
 * when Next traces functions (outputFileTracingIncludes force-includes it) — a bake
 * that runs AFTER next build is written too late to be traced, which is exactly the
 * "metadata chimera" bug (fresh buildId, stale commit/timestamp). Because it runs
 * pre-build, it also GENERATES the buildId, which next.config.generateBuildId reads
 * so .next/BUILD_ID == baked.buildId. getReleaseFingerprint reads ALL fields from
 * this one file; a missing bake fails loud rather than reporting a stale baseline.
 *
 * Commit/branch: VERCEL_GIT_COMMIT_SHA/REF (git-integration) → PAT_COMMIT_SHA/REF
 * (CLI `vercel deploy --build-env`) → `git` (local). buildSourceType: PAT_BUILD_SOURCE
 * or "cloud-build".
 */
import { execFileSync } from "node:child_process";
import { writeFileSync, existsSync, readFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";

const ROOT = process.cwd();
const OUT = join(ROOT, "lib", "release", "baked-fingerprint.json");
const CONTRACT = join(ROOT, "ops", "release", "canonical-root.json");

function git(...args) {
  try {
    return execFileSync("git", ["-C", ROOT, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

const commitSha = (
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.PAT_COMMIT_SHA ||
  git("rev-parse", "HEAD") ||
  ""
).trim();
const branch = (
  process.env.VERCEL_GIT_COMMIT_REF ||
  process.env.PAT_COMMIT_REF ||
  git("rev-parse", "--abbrev-ref", "HEAD") ||
  ""
).trim();

if (!commitSha) {
  console.error(
    "[bake-release] FATAL: no commit resolvable (VERCEL_GIT_COMMIT_SHA / PAT_COMMIT_SHA / git all empty). " +
      "Pass `vercel deploy --build-env PAT_COMMIT_SHA=$(git rev-parse HEAD)`."
  );
  process.exit(1);
}

const contract = existsSync(CONTRACT) ? JSON.parse(readFileSync(CONTRACT, "utf8")) : {};
const canonicalRoot = contract.canonicalRoot ?? ROOT;
const authMode = contract.authMode ?? "unknown";
const buildSourceType = process.env.PAT_BUILD_SOURCE || (process.env.VERCEL ? "cloud-build" : "local-build");
const buildTimestamp = new Date().toISOString();
// buildId we control (pre-build): commit-short + base36 wall-clock — unique per build,
// readable, and consumed by next.config.generateBuildId so .next/BUILD_ID matches.
const buildId = `${commitSha.slice(0, 7)}-${Date.now().toString(36)}`;
const releaseFingerprintSeed = createHash("sha256")
  .update(`${canonicalRoot}|${commitSha}|${authMode}|${buildSourceType}`)
  .digest("hex");

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(
  OUT,
  JSON.stringify(
    { commitSha, branch, buildId, buildTimestamp, buildSourceType, canonicalRoot, authMode, releaseFingerprintSeed },
    null,
    2
  ) + "\n"
);
console.log(`[bake-release] wrote ${OUT} — commit=${commitSha.slice(0, 7)} buildId=${buildId} source=${buildSourceType} ts=${buildTimestamp}`);
