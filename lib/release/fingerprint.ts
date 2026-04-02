import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";

type CanonicalRootContract = {
  canonicalRoot: string;
  authMode: string;
  runtimeSourceType: string;
  startCommand: string;
  baselineCommit?: string;
};

type CanonicalRootState = {
  canonicalRoot?: string;
  authMode?: string;
  runtimeSourceType?: string;
  startCommand?: string;
  branch?: string;
  commitSha?: string;
  gitDirty?: string;
  releaseFingerprintSeed?: string;
  writtenAt?: string;
  buildReason?: string;
};

export type ReleaseFingerprint = {
  schemaVersion: 1;
  releaseId: string;
  commitSha: string;
  commitShort: string;
  branch: string;
  canonicalRoot: string;
  canonicalRootName: string;
  buildTimestamp: string;
  authMode: string;
  buildSourceType: string;
  buildId: string;
  releaseFingerprintSeed: string;
  startCommand: string;
  gitDirty: string;
};

export type PublicReleaseFingerprint = Omit<ReleaseFingerprint, "canonicalRoot">;

export type PublicReleaseFingerprintView = {
  releaseId: string;
  branch: string;
  commitSha: string;
  buildId: string;
  buildTimestamp: string;
  authMode: string;
  buildSourceType: string;
  canonicalRootName: string;
  releaseFingerprintSeed: string;
  gitDirty: string;
};

const repoRoot = process.cwd();
const contractPath = path.join(repoRoot, "ops/release/canonical-root.json");
const statePath = path.join(repoRoot, "artifacts/mac-mini/state/canonical-root.json");
const releaseStatePath = path.join(repoRoot, "artifacts/mac-mini/state/release-state.env");
const buildIdPath = path.join(repoRoot, ".next/BUILD_ID");

function readJsonFile<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function runGit(...args: string[]) {
  return execFileSync("git", ["-C", repoRoot, ...args], { encoding: "utf8" }).trim();
}

function readBuildId() {
  if (!fs.existsSync(buildIdPath)) {
    return "missing";
  }

  return fs.readFileSync(buildIdPath, "utf8").trim() || "missing";
}

function readReleaseStateValue(key: string) {
  if (!fs.existsSync(releaseStatePath)) {
    return null;
  }

  const entries = fs.readFileSync(releaseStatePath, "utf8").split(/\r?\n/);
  for (const entry of entries) {
    if (!entry || entry.startsWith("#")) continue;
    const separatorIndex = entry.indexOf("=");
    if (separatorIndex <= 0) continue;
    const entryKey = entry.slice(0, separatorIndex);
    if (entryKey === key) {
      return entry.slice(separatorIndex + 1);
    }
  }

  return null;
}

function resolveBuildTimestamp(state: CanonicalRootState | null) {
  const stateValue = readReleaseStateValue("BUILD_TIME_UTC");
  if (stateValue) {
    return stateValue;
  }

  if (state?.writtenAt) {
    return state.writtenAt;
  }

  if (fs.existsSync(buildIdPath)) {
    return fs.statSync(buildIdPath).mtime.toISOString();
  }

  return "unknown";
}

function resolveCommitSha(contract: CanonicalRootContract, state: CanonicalRootState | null) {
  if (state?.commitSha) {
    return state.commitSha;
  }

  try {
    return runGit("rev-parse", "HEAD");
  } catch {
    return contract.baselineCommit ?? "unknown";
  }
}

function resolveBranch(state: CanonicalRootState | null) {
  if (state?.branch) {
    return state.branch;
  }

  try {
    return runGit("rev-parse", "--abbrev-ref", "HEAD");
  } catch {
    return "unknown";
  }
}

function resolveGitDirty(state: CanonicalRootState | null) {
  if (state?.gitDirty) {
    return state.gitDirty;
  }

  try {
    return runGit("status", "--porcelain").length > 0 ? "dirty" : "clean";
  } catch {
    return "unknown";
  }
}

function computeReleaseFingerprintSeed(
  canonicalRoot: string,
  commitSha: string,
  authMode: string,
  buildSourceType: string
) {
  return createHash("sha256")
    .update(`${canonicalRoot}|${commitSha}|${authMode}|${buildSourceType}`)
    .digest("hex");
}

export function getReleaseFingerprint(): ReleaseFingerprint {
  const contract = readJsonFile<CanonicalRootContract>(contractPath);
  if (!contract) {
    throw new Error(`Missing runtime contract at ${contractPath}`);
  }

  const state = readJsonFile<CanonicalRootState>(statePath);
  const canonicalRoot = state?.canonicalRoot ?? contract.canonicalRoot;
  const commitSha = resolveCommitSha(contract, state);
  const buildSourceType = state?.runtimeSourceType ?? contract.runtimeSourceType;
  const authMode = state?.authMode ?? contract.authMode;
  const releaseFingerprintSeed =
    state?.releaseFingerprintSeed
    ?? computeReleaseFingerprintSeed(canonicalRoot, commitSha, authMode, buildSourceType);
  const buildId = readBuildId();

  return {
    schemaVersion: 1,
    releaseId: `${commitSha.slice(0, 7)}:${buildId}`,
    commitSha,
    commitShort: commitSha.slice(0, 7),
    branch: resolveBranch(state),
    canonicalRoot,
    canonicalRootName: path.basename(canonicalRoot),
    buildTimestamp: resolveBuildTimestamp(state),
    authMode,
    buildSourceType,
    buildId,
    releaseFingerprintSeed,
    startCommand: state?.startCommand ?? contract.startCommand,
    gitDirty: resolveGitDirty(state),
  };
}

export function getPublicReleaseFingerprint(): PublicReleaseFingerprint {
  const fingerprint = getReleaseFingerprint();
  return {
    schemaVersion: fingerprint.schemaVersion,
    releaseId: fingerprint.releaseId,
    commitSha: fingerprint.commitSha,
    commitShort: fingerprint.commitShort,
    branch: fingerprint.branch,
    canonicalRootName: fingerprint.canonicalRootName,
    buildTimestamp: fingerprint.buildTimestamp,
    authMode: fingerprint.authMode,
    buildSourceType: fingerprint.buildSourceType,
    buildId: fingerprint.buildId,
    releaseFingerprintSeed: fingerprint.releaseFingerprintSeed,
    startCommand: fingerprint.startCommand,
    gitDirty: fingerprint.gitDirty,
  };
}

export function getPublicReleaseFingerprintView(
  fingerprint: ReleaseFingerprint = getReleaseFingerprint()
): PublicReleaseFingerprintView {
  return {
    releaseId: fingerprint.releaseId,
    branch: fingerprint.branch,
    commitSha: fingerprint.commitSha,
    buildId: fingerprint.buildId,
    buildTimestamp: fingerprint.buildTimestamp,
    authMode: fingerprint.authMode,
    buildSourceType: fingerprint.buildSourceType,
    canonicalRootName: fingerprint.canonicalRootName,
    releaseFingerprintSeed: fingerprint.releaseFingerprintSeed,
    gitDirty: fingerprint.gitDirty,
  };
}
