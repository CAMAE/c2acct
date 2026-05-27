import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

type ReleaseCriticalConfig = {
  ignoredDirtyPaths?: string[];
};

export type ReleaseGitStatusEntry = {
  status: string;
  path: string;
  raw: string;
};

export type ReleaseGitState = {
  gitDirty: "clean" | "dirty";
  dirtyEntries: ReleaseGitStatusEntry[];
  ignoredDirtyEntries: ReleaseGitStatusEntry[];
};

function readReleaseCriticalConfig(root: string): ReleaseCriticalConfig {
  const configPath = path.join(root, "ops/release/release-critical-files.json");
  if (!fs.existsSync(configPath)) {
    return {};
  }

  return JSON.parse(fs.readFileSync(configPath, "utf8")) as ReleaseCriticalConfig;
}

function normalizeStatusPath(rawPath: string) {
  if (!rawPath) return "";
  if (rawPath.includes(" -> ")) {
    return rawPath.split(" -> ").pop()?.trim() ?? rawPath.trim();
  }
  return rawPath.trim();
}

export function parseGitStatusPorcelain(output: string): ReleaseGitStatusEntry[] {
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

export function matchesReleaseDirtyPath(filePath: string, patterns: string[] = []) {
  return patterns.some((pattern) =>
    pattern.endsWith("/") ? filePath.startsWith(pattern) : filePath === pattern
  );
}

export function getReleaseGitState(root = process.cwd()): ReleaseGitState {
  const resolvedRoot = path.resolve(root);
  const config = readReleaseCriticalConfig(resolvedRoot);
  const output = execFileSync("git", ["-C", resolvedRoot, "status", "--porcelain"], {
    encoding: "utf8",
  });
  const entries = parseGitStatusPorcelain(output);
  const ignoredDirtyEntries = entries.filter((entry) =>
    matchesReleaseDirtyPath(entry.path, config.ignoredDirtyPaths ?? [])
  );
  const dirtyEntries = entries.filter(
    (entry) => !matchesReleaseDirtyPath(entry.path, config.ignoredDirtyPaths ?? [])
  );

  return {
    gitDirty: dirtyEntries.length > 0 ? "dirty" : "clean",
    dirtyEntries,
    ignoredDirtyEntries,
  };
}
