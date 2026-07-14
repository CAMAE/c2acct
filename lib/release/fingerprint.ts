import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { getReleaseGitState } from "./git-state";

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
  startCommand: string;
  gitDirty: string;
};

const PUBLIC_RUNTIME_IDENTITY_FIELDS = [
  "schemaVersion",
  "releaseId",
  "commitSha",
  "commitShort",
  "branch",
  "canonicalRootName",
  "buildTimestamp",
  "authMode",
  "buildSourceType",
  "buildId",
  "releaseFingerprintSeed",
  "startCommand",
  "gitDirty",
] as const satisfies ReadonlyArray<keyof PublicReleaseFingerprint>;

const repoRoot = process.cwd();
const contractPath = path.join(repoRoot, "ops/release/canonical-root.json");
const statePath = path.join(repoRoot, "artifacts/mac-mini/state/canonical-root.json");
const releaseStatePath = path.join(repoRoot, "artifacts/mac-mini/state/release-state.env");
const buildIdPath = path.join(repoRoot, ".next/BUILD_ID");
// Baked by scripts/release/bake-release.mjs at the END of the CLOUD build (Vercel).
// The mac-mini state files are gitignored + git is absent in the Vercel runtime,
// so without this the footer falls back to the STALE contract baselineCommit. When
// present it is the authoritative source of truth for commit/buildId/branch/ts.
const bakedPath = path.join(repoRoot, "lib/release/baked-fingerprint.json");

type BakedFingerprint = {
  commitSha?: string;
  branch?: string;
  buildId?: string;
  buildTimestamp?: string;
  buildSourceType?: string;
  canonicalRoot?: string;
  authMode?: string;
  releaseFingerprintSeed?: string;
};

function readBaked(): BakedFingerprint | null {
  try {
    if (!fs.existsSync(bakedPath)) return null;
    const parsed = JSON.parse(fs.readFileSync(bakedPath, "utf8")) as BakedFingerprint;
    return parsed?.commitSha ? parsed : null;
  } catch {
    return null;
  }
}

function readJsonFile<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function runGit(...args: string[]) {
  return execFileSync("git", ["-C", repoRoot, ...args], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  }).trim();
}

function readBuildId() {
  const baked = readBaked();
  if (baked?.buildId) return baked.buildId;
  if (fs.existsSync(buildIdPath)) {
    const value = fs.readFileSync(buildIdPath, "utf8").trim();
    if (value) return value;
  }
  // Cloud runtime fallback: the per-deploy id is always set and unique per build.
  return process.env.VERCEL_DEPLOYMENT_ID?.trim() || "missing";
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
  const baked = readBaked();
  if (baked?.buildTimestamp) {
    return baked.buildTimestamp;
  }
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

function resolveCommitSha(state: CanonicalRootState | null) {
  // Single source of truth: the cloud bake. VERCEL_GIT_COMMIT_SHA only appears on
  // git-integration deploys; git only on mac-mini/local; state on mac-mini runtime.
  // The STALE committed contract.baselineCommit fallback is intentionally gone — a
  // cloud build that reaches here with nothing must FAIL LOUD, not report 2018.
  const baked = readBaked();
  if (baked?.commitSha) return baked.commitSha;
  if (process.env.VERCEL_GIT_COMMIT_SHA) return process.env.VERCEL_GIT_COMMIT_SHA.trim();
  try {
    return runGit("rev-parse", "HEAD");
  } catch {
    if (state?.commitSha) return state.commitSha;
    throw new Error(
      "release fingerprint has no commit source (no baked-fingerprint.json, no VERCEL_GIT_COMMIT_SHA, no git, no mac-mini state) — a cloud build must run scripts/release/bake-release.mjs; refusing to report a stale baseline."
    );
  }
}

function resolveBranch(state: CanonicalRootState | null) {
  const baked = readBaked();
  if (baked?.branch) return baked.branch;
  if (process.env.VERCEL_GIT_COMMIT_REF) return process.env.VERCEL_GIT_COMMIT_REF.trim();
  try {
    return runGit("rev-parse", "--abbrev-ref", "HEAD");
  } catch {
    return state?.branch ?? "unknown";
  }
}

function resolveGitDirty(state: CanonicalRootState | null) {
  try {
    return getReleaseGitState(repoRoot).gitDirty;
  } catch {
    return state?.gitDirty ?? "unknown";
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
  const baked = readBaked();
  // Baked (cloud build) is authoritative for every field it carries — it is the ONE
  // source generated in the same build that produced BUILD_ID. mac-mini falls to
  // state → contract as before.
  const canonicalRoot = baked?.canonicalRoot ?? state?.canonicalRoot ?? contract.canonicalRoot;
  const commitSha = resolveCommitSha(state);
  const buildSourceType = baked?.buildSourceType ?? state?.runtimeSourceType ?? contract.runtimeSourceType;
  const authMode = baked?.authMode ?? state?.authMode ?? contract.authMode;
  const releaseFingerprintSeed =
    baked?.releaseFingerprintSeed ??
    computeReleaseFingerprintSeed(canonicalRoot, commitSha, authMode, buildSourceType);
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
    startCommand: fingerprint.startCommand,
    gitDirty: fingerprint.gitDirty,
  };
}

export function getPublicReleaseFingerprintMismatches(
  actual: Partial<PublicReleaseFingerprint> | null | undefined,
  expected: PublicReleaseFingerprint = getPublicReleaseFingerprint()
) {
  if (!actual) {
    return ["fingerprint_missing"];
  }

  return PUBLIC_RUNTIME_IDENTITY_FIELDS.flatMap((field) => {
    const actualValue = actual[field];
    const expectedValue = expected[field];

    if (actualValue === expectedValue) {
      return [];
    }

    return [`${field}_mismatch:${String(actualValue ?? "missing")}:${String(expectedValue)}`];
  });
}
