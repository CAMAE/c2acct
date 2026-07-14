#!/usr/bin/env node
/**
 * Bake the true release fingerprint for CLOUD builds (Vercel).
 *
 * getReleaseFingerprint() resolves commit via `git rev-parse HEAD` and falls back
 * to the committed contract baselineCommit when git is unavailable. In a Vercel
 * cloud build there is no .git and the mac-mini state files are gitignored, so the
 * public footer "Release <commit>:<buildId>" reported the STALE contract baseline
 * (078a41f) — a lying build proof. This runs at the END of the build command
 * (after `next build`, so .next/BUILD_ID exists) and writes the TRUE commit +
 * BUILD_ID + timestamp to lib/release/baked-fingerprint.json, which
 * getReleaseFingerprint prefers and next.config force-includes into every function.
 *
 * Commit/branch come from Vercel's System Env Vars (VERCEL_GIT_COMMIT_SHA/REF) with
 * a `git` fallback for local runs. No-ops loudly-safe if BUILD_ID is missing.
 */
import { execFileSync } from "node:child_process";
import { writeFileSync, existsSync, readFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";

const ROOT = process.cwd();
const OUT = join(ROOT, "lib", "release", "baked-fingerprint.json");

function git(...args) {
  try {
    return execFileSync("git", ["-C", ROOT, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}

const commitSha = (process.env.VERCEL_GIT_COMMIT_SHA || git("rev-parse", "HEAD") || "").trim();
const branch = (process.env.VERCEL_GIT_COMMIT_REF || git("rev-parse", "--abbrev-ref", "HEAD") || "").trim();
const buildIdPath = join(ROOT, ".next", "BUILD_ID");
const buildId = existsSync(buildIdPath) ? readFileSync(buildIdPath, "utf8").trim() : "";
const buildTimestamp = new Date().toISOString();

if (!commitSha) {
  console.warn("[bake-release] WARN: no commit resolvable (no VERCEL_GIT_COMMIT_SHA and no git) — footer will fall back.");
}
if (!buildId) {
  console.warn("[bake-release] WARN: .next/BUILD_ID missing — run AFTER `next build`.");
}

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(
  OUT,
  JSON.stringify({ commitSha, branch, buildId, buildTimestamp, source: process.env.VERCEL ? "vercel" : "local" }, null, 2) + "\n"
);
console.log(`[bake-release] wrote ${OUT} — commit=${commitSha.slice(0, 7)} buildId=${buildId || "?"} ts=${buildTimestamp}`);
