#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

function parseArgs(argv) {
  const args = { root: process.cwd() };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === "--root") {
      args.root = argv[i + 1];
      i += 1;
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

function loadReleaseCriticalConfig() {
  return JSON.parse(fs.readFileSync(path.resolve("ops/release/release-critical-files.json"), "utf8"));
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

const { root } = parseArgs(process.argv.slice(2));
const resolvedRoot = path.resolve(root);
const contractPath = path.resolve("ops/release/canonical-root.json");
const statePath = path.resolve("artifacts/mac-mini/state/canonical-root.json");
const criticalConfig = loadReleaseCriticalConfig();
const contract = JSON.parse(fs.readFileSync(contractPath, "utf8"));
const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, "utf8")) : null;
const failures = [];

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
const criticalDirtyEntries = dirtyEntries.filter((entry) =>
  matchesCriticalPath(entry.path, criticalConfig.criticalPaths)
);
const nonCriticalDirtyEntries = dirtyEntries.filter((entry) =>
  !matchesCriticalPath(entry.path, criticalConfig.criticalPaths)
);

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

if (!state) {
  failures.push("missing_runtime_state_file");
} else {
  if (state.canonicalRoot !== contract.canonicalRoot) {
    failures.push("state_root_mismatch");
  }
  if (state.authMode !== contract.authMode) {
    failures.push("state_auth_mode_mismatch");
  }
  if (state.releaseFingerprintSeed !== seed) {
    failures.push("state_fingerprint_seed_mismatch");
  }
}

const result = {
  ok: failures.length === 0,
  canonicalRoot: contract.canonicalRoot,
  root: resolvedRoot,
  branch,
  commitSha,
  authMode: contract.authMode,
  runtimeSourceType: contract.runtimeSourceType,
  startCommand: contract.startCommand,
  releaseFingerprintSeed: seed,
  dirtyEntries: dirtyEntries.map((entry) => entry.raw),
  criticalDirtyEntries: criticalDirtyEntries.map((entry) => entry.raw),
  nonCriticalDirtyEntries: nonCriticalDirtyEntries.map((entry) => entry.raw),
  failures,
};

console.log(JSON.stringify(result, null, 2));

if (failures.length > 0) {
  process.exit(1);
}
