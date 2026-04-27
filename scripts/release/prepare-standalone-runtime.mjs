#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

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

function resetDir(target) {
  fs.rmSync(target, { recursive: true, force: true });
}

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
  const writtenAt = nowUtc();
  const buildId = readBuildId();

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
  fs.cpSync(sourceReleaseOpsDir, targetReleaseOpsDir, { recursive: true });

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
