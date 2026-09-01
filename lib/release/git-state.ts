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

/**
 * The session ledger — Mythos's append-only record of banked work.
 *
 * Exact path, not a prefix: the exemption below is for THIS file and nothing
 * else that might later live beside it.
 */
export const SESSION_LEDGER_PATH = "PATALIGN-MEMORY/SESSION-LEDGER.md";

export type StartupDirtyVerdict = "clean" | "ledger-only" | "dirty";

/**
 * The dirty-tree verdict for the mac-mini STARTUP gate specifically.
 *
 * Deliberately separate from {@link getReleaseGitState}'s `gitDirty`, which
 * feeds the release fingerprint and the canonical state written into release
 * proof. Widening that would change what a release ASSERTS about the tree it was
 * built from; this changes only what the app is willing to start on.
 *
 * The distinction being drawn: the launch gate exists to stop unbuilt code from
 * starting. The session ledger is an out-of-band record that appends on its own
 * cadence, entirely independent of the build — it has appended *during* a
 * fifteen-minute validate:launch run and failed the final step on a tree whose
 * every other gate had passed. Banking immediately before a run only shrinks
 * that window; it cannot close it, because the append can land at any moment.
 * Exempting the one exact path removes the race instead of narrowing it.
 *
 * The exemption is SOLE-FILE. A diff of ledger + anything else is `dirty`,
 * because the moment real work is in the tree the gate's original reason applies
 * again and the ledger's presence must not launder it.
 *
 * Renames are never exempt: a rename entry means a path moved, which is a
 * structural change to the record rather than an append, and is exactly the
 * case where "it's only the ledger" stops being true.
 */
export function classifyStartupDirty(entries: ReleaseGitStatusEntry[]): StartupDirtyVerdict {
  if (entries.length === 0) {
    return "clean";
  }
  const everyEntryIsTheLedger = entries.every(
    (entry) => !entry.raw.includes(" -> ") && entry.path === SESSION_LEDGER_PATH
  );
  return everyEntryIsTheLedger ? "ledger-only" : "dirty";
}

/** The startup verdict for a working tree. */
export function getStartupDirtyVerdict(root = process.cwd()): StartupDirtyVerdict {
  return classifyStartupDirty(getReleaseGitState(root).dirtyEntries);
}
