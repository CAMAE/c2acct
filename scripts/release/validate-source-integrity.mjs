#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

function parseArgs(argv) {
  const args = { root: process.cwd(), allowStaleLastKnownGood: false };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--root") {
      args.root = argv[i + 1];
      i += 1;
    } else if (argv[i] === "--allow-stale-last-known-good") {
      args.allowStaleLastKnownGood = true;
    }
  }
  return args;
}

function runGit(root, ...args) {
  return execFileSync("git", ["-C", root, ...args], { encoding: "utf8" }).trim();
}

function computeFingerprintSeed(root, commitSha, authMode, runtimeSourceType) {
  return execFileSync(
    "shasum",
    ["-a", "256"],
    {
      input: `${root}|${commitSha}|${authMode}|${runtimeSourceType}`,
      encoding: "utf8",
    }
  )
    .trim()
    .split(/\s+/)[0];
}

function loadReleaseCriticalConfig(root) {
  return JSON.parse(
    fs.readFileSync(path.join(root, "ops/release/release-critical-files.json"), "utf8")
  );
}

function normalizeStatusPath(rawPath) {
  if (!rawPath) return "";
  if (rawPath.includes(" -> ")) {
    return rawPath.split(" -> ").pop()?.trim() ?? rawPath.trim();
  }
  return rawPath.trim();
}

function parseGitStatus(root) {
  const output = execFileSync("git", ["-C", root, "status", "--porcelain"], {
    encoding: "utf8",
  });
  if (!output) {
    return [];
  }

  return output
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => ({
      status: line.slice(0, 2),
      path: normalizeStatusPath(line.slice(3)),
      raw: line,
    }));
}

function matchesCriticalPath(filePath, criticalPaths) {
  return criticalPaths.some((pattern) =>
    pattern.endsWith("/") ? filePath.startsWith(pattern) : filePath === pattern
  );
}

function matchesConfiguredPath(filePath, patterns = []) {
  return patterns.some((pattern) =>
    pattern.endsWith("/") ? filePath.startsWith(pattern) : filePath === pattern
  );
}

function readOptionalJson(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return Object.fromEntries(
    fs
      .readFileSync(filePath, "utf8")
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

function readBuildId(root) {
  const buildIdPath = path.join(root, ".next", "BUILD_ID");
  if (!fs.existsSync(buildIdPath)) {
    return "missing";
  }

  return fs.readFileSync(buildIdPath, "utf8").trim() || "missing";
}

function resolveBuildTimestamp(root, releaseState, canonicalState) {
  if (releaseState?.BUILD_TIME_UTC) {
    return releaseState.BUILD_TIME_UTC;
  }

  if (canonicalState?.writtenAt) {
    return canonicalState.writtenAt;
  }

  const buildIdPath = path.join(root, ".next", "BUILD_ID");
  if (fs.existsSync(buildIdPath)) {
    return fs.statSync(buildIdPath).mtime.toISOString();
  }

  return "unknown";
}

function expectedReleaseFingerprint({
  root,
  contract,
  branch,
  commitSha,
  gitDirty,
  releaseState,
  canonicalState,
}) {
  const buildId = readBuildId(root);
  const commitShort = commitSha.slice(0, 7);
  return {
    schemaVersion: 1,
    releaseId: `${commitShort}:${buildId}`,
    commitSha,
    commitShort,
    branch,
    canonicalRoot: contract.canonicalRoot,
    canonicalRootName: path.basename(contract.canonicalRoot),
    buildTimestamp: resolveBuildTimestamp(root, releaseState, canonicalState),
    authMode: contract.authMode,
    buildSourceType: contract.runtimeSourceType,
    buildId,
    releaseFingerprintSeed: computeFingerprintSeed(
      contract.canonicalRoot,
      commitSha,
      contract.authMode,
      contract.runtimeSourceType
    ),
    startCommand: contract.startCommand,
    gitDirty,
  };
}

function pushMismatch(failures, scope, field, actual, expected) {
  if (actual !== expected) {
    failures.push(`${scope}_${field}_mismatch expected=${expected} actual=${actual ?? "missing"}`);
  }
}

function validateFingerprintArtifact(failures, scope, artifact, expected) {
  const fields = [
    "schemaVersion",
    "releaseId",
    "commitSha",
    "commitShort",
    "branch",
    "canonicalRoot",
    "canonicalRootName",
    "buildTimestamp",
    "authMode",
    "buildSourceType",
    "buildId",
    "releaseFingerprintSeed",
    "startCommand",
    "gitDirty",
  ];

  for (const field of fields) {
    pushMismatch(failures, scope, field, artifact?.[field], expected[field]);
  }
}

export function validateReleaseArtifactAgreement({
  root = process.cwd(),
  contract,
  canonicalState = null,
  releaseState = null,
  expectedLiveRelease = null,
  lastKnownGoodRelease = null,
  allowStaleLastKnownGood = false,
  branch,
  commitSha,
  gitDirty,
}) {
  const failures = [];
  const warnings = [];
  const expected = expectedReleaseFingerprint({
    root,
    contract,
    branch,
    commitSha,
    gitDirty,
    releaseState,
    canonicalState,
  });

  if (!canonicalState) {
    warnings.push("missing_runtime_state_file");
  } else {
    pushMismatch(failures, "canonical_state", "canonicalRoot", canonicalState.canonicalRoot, contract.canonicalRoot);
    pushMismatch(failures, "canonical_state", "authMode", canonicalState.authMode, contract.authMode);
    pushMismatch(
      failures,
      "canonical_state",
      "runtimeSourceType",
      canonicalState.runtimeSourceType,
      contract.runtimeSourceType
    );
    pushMismatch(failures, "canonical_state", "startCommand", canonicalState.startCommand, contract.startCommand);
    pushMismatch(failures, "canonical_state", "branch", canonicalState.branch, branch);
    pushMismatch(failures, "canonical_state", "commitSha", canonicalState.commitSha, commitSha);
    pushMismatch(failures, "canonical_state", "gitDirty", canonicalState.gitDirty, gitDirty);
    pushMismatch(
      failures,
      "canonical_state",
      "releaseFingerprintSeed",
      canonicalState.releaseFingerprintSeed,
      expected.releaseFingerprintSeed
    );
  }

  if (!releaseState) {
    warnings.push("missing_release_state_file");
  } else {
    pushMismatch(failures, "release_state", "BRANCH", releaseState.BRANCH, branch);
    pushMismatch(failures, "release_state", "COMMIT", releaseState.COMMIT, expected.commitShort);
    pushMismatch(failures, "release_state", "GIT_DIRTY", releaseState.GIT_DIRTY, gitDirty);
    pushMismatch(failures, "release_state", "BUILD_ID", releaseState.BUILD_ID, expected.buildId);
  }

  if (!expectedLiveRelease) {
    warnings.push("missing_expected_live_release");
  } else {
    validateFingerprintArtifact(failures, "expected_live_release", expectedLiveRelease, expected);
  }

  if (!lastKnownGoodRelease) {
    const message = "missing_last_known_good_release";
    if (allowStaleLastKnownGood) {
      warnings.push(message);
    } else {
      failures.push(message);
    }
  } else if (
    lastKnownGoodRelease.releaseId === expected.releaseId ||
    (lastKnownGoodRelease.commitSha === expected.commitSha && lastKnownGoodRelease.buildId === expected.buildId)
  ) {
    validateFingerprintArtifact(failures, "last_known_good_release", lastKnownGoodRelease, expected);
  } else {
    const message = `last_known_good_release_not_current expected=${expected.releaseId} actual=${lastKnownGoodRelease.releaseId ?? "missing"}`;
    if (allowStaleLastKnownGood) {
      warnings.push(message);
    } else {
      failures.push(message);
    }
  }

  return {
    ok: failures.length === 0,
    expected,
    failures,
    warnings,
  };
}

export function runSourceIntegrityValidation({
  root = process.cwd(),
  allowStaleLastKnownGood = false,
} = {}) {
  const resolvedRoot = path.resolve(root);
  const contractPath = path.join(resolvedRoot, "ops/release/canonical-root.json");
  const statePath = path.join(resolvedRoot, "artifacts/mac-mini/state/canonical-root.json");
  const releaseStatePath = path.join(resolvedRoot, "artifacts/mac-mini/state/release-state.env");
  const expectedLiveReleasePath = path.join(
    resolvedRoot,
    "artifacts/mac-mini/state/expected-live-release.json"
  );
  const lastKnownGoodReleasePath = path.join(
    resolvedRoot,
    "artifacts/mac-mini/state/last-known-good-release.json"
  );
  const criticalConfig = loadReleaseCriticalConfig(resolvedRoot);
  const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
  const state = readOptionalJson(statePath);
  const releaseState = parseEnvFile(releaseStatePath);
  const expectedLiveRelease = readOptionalJson(expectedLiveReleasePath);
  const lastKnownGoodRelease = readOptionalJson(lastKnownGoodReleasePath);
  const failures = [];
  const warnings = [];

  if (resolvedRoot !== contract.canonicalRoot) {
    failures.push(`root_mismatch expected=${contract.canonicalRoot} actual=${resolvedRoot}`);
  }

  if (resolvedRoot === "/Users/camerongarrett/work/c2acct") {
    failures.push("forbidden_dev_root");
  }

  if (resolvedRoot.startsWith("/private/tmp/")) {
    failures.push("forbidden_tmp_root");
  }

  const dirtyEntries = parseGitStatus(resolvedRoot);
  const ignoredDirtyEntries = dirtyEntries.filter((entry) =>
    matchesConfiguredPath(entry.path, criticalConfig.ignoredDirtyPaths ?? [])
  );
  const scopedDirtyEntries = dirtyEntries.filter((entry) =>
    !matchesConfiguredPath(entry.path, criticalConfig.ignoredDirtyPaths ?? [])
  );
  const criticalDirtyEntries = scopedDirtyEntries.filter((entry) =>
    matchesCriticalPath(entry.path, criticalConfig.criticalPaths)
  );
  const nonCriticalDirtyEntries = scopedDirtyEntries.filter((entry) =>
    !matchesCriticalPath(entry.path, criticalConfig.criticalPaths)
  );
  const gitDirty = scopedDirtyEntries.length > 0 ? "dirty" : "clean";

  if (criticalDirtyEntries.length > 0) {
    failures.push("git_dirty");
  }

  const commitSha = runGit(resolvedRoot, "rev-parse", "HEAD");
  const branch = runGit(resolvedRoot, "rev-parse", "--abbrev-ref", "HEAD");
  const seed = computeFingerprintSeed(
    contract.canonicalRoot,
    commitSha,
    contract.authMode,
    contract.runtimeSourceType
  );

  if (!fs.existsSync(path.join(resolvedRoot, ".next", "standalone", "server.js"))) {
    failures.push("missing_standalone_server");
  }

  const artifactAgreement = validateReleaseArtifactAgreement({
    root: resolvedRoot,
    contract,
    canonicalState: state,
    releaseState,
    expectedLiveRelease,
    lastKnownGoodRelease,
    allowStaleLastKnownGood,
    branch,
    commitSha,
    gitDirty,
  });
  failures.push(...artifactAgreement.failures);
  warnings.push(...artifactAgreement.warnings);

  return {
    ok: failures.length === 0,
    canonicalRoot: contract.canonicalRoot,
    root: resolvedRoot,
    branch,
    commitSha,
    authMode: contract.authMode,
    runtimeSourceType: contract.runtimeSourceType,
    startCommand: contract.startCommand,
    releaseFingerprintSeed: seed,
    gitDirty,
    dirtyEntries: scopedDirtyEntries.map((entry) => entry.raw),
    ignoredDirtyEntries: ignoredDirtyEntries.map((entry) => entry.raw),
    criticalDirtyEntries: criticalDirtyEntries.map((entry) => entry.raw),
    nonCriticalDirtyEntries: nonCriticalDirtyEntries.map((entry) => entry.raw),
    artifactAgreement: {
      expected: artifactAgreement.expected,
      failures: artifactAgreement.failures,
      warnings: artifactAgreement.warnings,
      allowStaleLastKnownGood,
    },
    warnings,
    failures,
  };
}

const isMainModule = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  const { root, allowStaleLastKnownGood } = parseArgs(process.argv.slice(2));
  const result = runSourceIntegrityValidation({ root, allowStaleLastKnownGood });
  console.log(JSON.stringify(result, null, 2));

  if (result.failures.length > 0) {
    process.exit(1);
  }
}
