#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

if (process.env.VERCEL === "1") {
  console.log("[prepare-standalone-runtime] skipping on Vercel — Mac-mini-only standalone packaging not applicable");
  process.exit(0);
}

const root = process.cwd();
const standaloneDir = path.join(root, ".next", "standalone");
const standaloneNextDir = path.join(standaloneDir, ".next");
const sourceStaticDir = path.join(root, ".next", "static");
const targetStaticDir = path.join(standaloneNextDir, "static");
const sourcePublicDir = path.join(root, "public");
const targetPublicDir = path.join(standaloneDir, "public");
const sourceReleaseOpsDir = path.join(root, "ops", "release");
const targetReleaseOpsDir = path.join(standaloneDir, "ops", "release");
const requiredBrandAsset = path.join(sourcePublicDir, "brand", "c2", "c2-logo-accounting.png");
const releaseStateDir = path.join(root, "artifacts", "mac-mini", "state");
const standaloneReleaseStateDir = path.join(standaloneDir, "artifacts", "mac-mini", "state");
const releaseStatePath = path.join(releaseStateDir, "release-state.env");
const canonicalStatePath = path.join(releaseStateDir, "canonical-root.json");
const expectedLiveReleasePath = path.join(releaseStateDir, "expected-live-release.json");
const lastKnownGoodReleasePath = path.join(releaseStateDir, "last-known-good-release.json");
const contractPath = path.join(root, "ops", "release", "canonical-root.json");

/**
 * Recursive delete that survives a concurrent writer.
 *
 * `fs.rmSync` defaults to `maxRetries: 0`, and `force: true` only suppresses
 * ENOENT — it does nothing for ENOTEMPTY. So when anything creates a file inside
 * a directory while the recursive walk is unlinking it, the delete fails
 * immediately and takes the build with it:
 *
 *   Error: ENOTEMPTY: directory not empty, rmdir
 *     '.next/standalone/.next/static/chunks'
 *
 * That is not hypothetical here. This build tree is indexed by Spotlight (the
 * same `com.apple` indexer has been observed holding read handles on files in
 * .git), and a running standalone server also holds files under this path. Both
 * race a rebuild, and the failure only appears on a SECOND build — the first one
 * finds no target to remove — which is exactly why it kept looking like a
 * mysterious one-off rather than a bug.
 *
 * Node retries precisely this error class (EBUSY, EMFILE, ENFILE, ENOTEMPTY,
 * EPERM) when `recursive` is set and `maxRetries` is greater than zero, with a
 * linear backoff. Ten retries at 100ms is up to ~5.5s of backoff — far longer
 * than an indexer touching a directory needs, and still short enough that a
 * genuinely stuck delete fails the build rather than hanging it.
 */
const RM_RETRIES = 10;
const RM_RETRY_DELAY_MS = 100;

function resetDir(target) {
  fs.rmSync(target, {
    recursive: true,
    force: true,
    maxRetries: RM_RETRIES,
    retryDelay: RM_RETRY_DELAY_MS,
  });
}

/**
 * Mirror `source` onto `target`.
 *
 * Resets first, so the copy is a MIRROR rather than an overlay. `fs.cpSync`
 * overwrites files that exist in the source and leaves everything else alone, so
 * without the reset a file deleted from the source lingers in the target
 * forever — a stale asset served by a runtime that believes it is current.
 */
function copyDir(source, target) {
  resetDir(target);
  fs.cpSync(source, target, { recursive: true });
}

function run(command, args, options = {}) {
  return execFileSync(command, args, {
    cwd: root,
    encoding: "utf8",
    ...options,
  }).trim();
}

function nowUtc() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
}

function readBuildId() {
  const buildIdPath = path.join(root, ".next", "BUILD_ID");
  if (!fs.existsSync(buildIdPath)) {
    return "missing";
  }

  return fs.readFileSync(buildIdPath, "utf8").trim() || "missing";
}

function readReleaseState() {
  if (!fs.existsSync(releaseStatePath)) {
    return {};
  }

  return Object.fromEntries(
    fs
      .readFileSync(releaseStatePath, "utf8")
      .split(/\r?\n/)
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => {
        const separatorIndex = line.indexOf("=");
        if (separatorIndex <= 0) {
          return [line, ""];
        }
        return [line.slice(0, separatorIndex), line.slice(separatorIndex + 1)];
      })
  );
}

function resolveBuildTimestamp({ branch, commitShort, gitDirty, buildId }) {
  const existingState = readReleaseState();
  if (
    existingState.BUILD_TIME_UTC
    && existingState.BRANCH === branch
    && existingState.COMMIT === commitShort
    && existingState.GIT_DIRTY === gitDirty
    && existingState.BUILD_ID === buildId
  ) {
    return existingState.BUILD_TIME_UTC;
  }

  return nowUtc();
}

function writeReleaseArtifacts(buildReason) {
  fs.mkdirSync(releaseStateDir, { recursive: true });

  const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
  const branch = run("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
  const commitSha = run("git", ["rev-parse", "HEAD"]);
  const commitShort = commitSha.slice(0, 7);
  const gitDirty = run("node", [
    "--import",
    "tsx",
    "scripts/release/read-release-git-dirty.ts",
    "--root",
    root,
    "--format",
    "state",
  ]);
  const releaseFingerprintSeed = run("shasum", ["-a", "256"], {
    input: `${contract.canonicalRoot}|${commitSha}|${contract.authMode}|${contract.runtimeSourceType}`,
  }).split(/\s+/)[0];
  const buildId = readBuildId();
  const writtenAt = resolveBuildTimestamp({ branch, commitShort, gitDirty, buildId });

  fs.writeFileSync(
    releaseStatePath,
    [
      `BUILD_TIME_UTC=${writtenAt}`,
      `BUILD_REASON=${buildReason}`,
      `BRANCH=${branch}`,
      `COMMIT=${commitShort}`,
      `GIT_DIRTY=${gitDirty}`,
      `BUILD_ID=${buildId}`,
      "",
    ].join("\n")
  );

  fs.writeFileSync(
    canonicalStatePath,
    `${JSON.stringify(
      {
        schemaVersion: 1,
        canonicalRoot: contract.canonicalRoot,
        authMode: contract.authMode,
        runtimeSourceType: contract.runtimeSourceType,
        startCommand: contract.startCommand,
        branch,
        commitSha,
        gitDirty,
        releaseFingerprintSeed,
        writtenAt,
        buildReason,
      },
      null,
      2
    )}\n`
  );

  const expectedLiveRelease = run("node", [
    "--import",
    "tsx",
    "scripts/release/read-release-fingerprint.ts",
  ]);
  fs.writeFileSync(expectedLiveReleasePath, `${expectedLiveRelease}\n`);
}

function copyReleaseProofIntoStandalone() {
  fs.mkdirSync(standaloneReleaseStateDir, { recursive: true });
  // Mirror, not overlay. This used to be a bare cpSync, which copies over what
  // exists in the source and leaves everything else — so a file REMOVED from
  // ops/release/ would persist in the target.
  //
  // Scope, measured rather than assumed: `next build` currently deletes
  // .next/standalone before regenerating it, so the normal build path recreates
  // this directory from scratch and the stale file never actually ships. This is
  // therefore DEFENCE IN DEPTH, not a live data bug — it matters if prep is ever
  // re-run against an existing tree, or if Next stops wiping the directory. The
  // cost of being right about it is one line.
  copyDir(sourceReleaseOpsDir, targetReleaseOpsDir);

  for (const filePath of [
    releaseStatePath,
    canonicalStatePath,
    expectedLiveReleasePath,
    lastKnownGoodReleasePath,
  ]) {
    if (fs.existsSync(filePath)) {
      fs.copyFileSync(filePath, path.join(standaloneReleaseStateDir, path.basename(filePath)));
    }
  }
}

if (!fs.existsSync(standaloneDir)) {
  throw new Error(`Standalone output is missing at ${standaloneDir}`);
}

if (!fs.existsSync(standaloneNextDir)) {
  throw new Error(`Standalone .next directory is missing at ${standaloneNextDir}`);
}

if (!fs.existsSync(sourceStaticDir)) {
  throw new Error(`Build static assets are missing at ${sourceStaticDir}`);
}

if (!fs.existsSync(sourcePublicDir)) {
  throw new Error(`Public assets directory is missing at ${sourcePublicDir}`);
}

if (!fs.existsSync(requiredBrandAsset)) {
  throw new Error(`Required PAT brand asset is missing at ${requiredBrandAsset}`);
}

copyDir(sourceStaticDir, targetStaticDir);
copyDir(sourcePublicDir, targetPublicDir);
writeReleaseArtifacts("pnpm-build");
copyReleaseProofIntoStandalone();

const result = {
  ok: true,
  standaloneDir,
  copied: {
    static: {
      from: sourceStaticDir,
      to: targetStaticDir,
    },
    public: {
      from: sourcePublicDir,
      to: targetPublicDir,
    },
  },
  requiredBrandAsset: path.relative(root, requiredBrandAsset),
  releaseState: {
    releaseStatePath: path.relative(root, releaseStatePath),
    canonicalStatePath: path.relative(root, canonicalStatePath),
    expectedLiveReleasePath: path.relative(root, expectedLiveReleasePath),
    lastKnownGoodReleasePath: path.relative(root, lastKnownGoodReleasePath),
  },
};

console.log(JSON.stringify(result, null, 2));
