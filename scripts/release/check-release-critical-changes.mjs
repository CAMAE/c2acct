#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

function parseArgs(argv) {
  const args = {
    base: null,
    head: "HEAD",
    files: [],
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--base") {
      args.base = argv[index + 1] ?? null;
      index += 1;
    } else if (value === "--head") {
      args.head = argv[index + 1] ?? "HEAD";
      index += 1;
    } else if (value === "--files") {
      args.files = (argv[index + 1] ?? "")
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean);
      index += 1;
    }
  }

  return args;
}

function isMatch(filePath, pattern) {
  return pattern.endsWith("/") ? filePath.startsWith(pattern) : filePath === pattern;
}

function gitChangedFiles(base, head) {
  const output = execFileSync("git", ["diff", "--name-only", base, head], {
    encoding: "utf8",
  });

  return output
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

const args = parseArgs(process.argv.slice(2));
const config = JSON.parse(
  fs.readFileSync(path.resolve("ops/release/release-critical-files.json"), "utf8")
);
const changedFiles =
  args.files.length > 0
    ? args.files
    : args.base
      ? gitChangedFiles(args.base, args.head)
      : gitChangedFiles("HEAD^", args.head);

const criticalChanges = changedFiles.filter((filePath) =>
  config.criticalPaths.some((pattern) => isMatch(filePath, pattern))
);
const validationArtifactChanges = changedFiles.filter((filePath) =>
  config.validationArtifacts.some((pattern) => isMatch(filePath, pattern))
);

const result = {
  ok: true,
  escalationRequired: criticalChanges.length > 0,
  changedFiles,
  criticalChanges,
  validationArtifactChanges,
  failures: [],
};

if (criticalChanges.length > 0 && validationArtifactChanges.length === 0) {
  result.ok = false;
  result.failures.push("release_critical_changes_missing_validation_artifacts");
}

console.log(JSON.stringify(result, null, 2));

if (!result.ok) {
  process.exit(1);
}
