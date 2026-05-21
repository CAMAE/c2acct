#!/usr/bin/env node

/**
 * AUDIT-D16-001 closer (Day-18 Block 1, option a — auto-promote on chain pass).
 *
 * Promotes `last-known-good-release.json` to the current commit's
 * fingerprint atomically. Reads the fingerprint via
 * `scripts/release/read-release-fingerprint.ts` so the writer uses the
 * SAME source-of-truth (`lib/release/fingerprint.ts`) as the runtime
 * reader — no fingerprint drift possible.
 *
 * Idempotent: a re-run with last-known-good already matching current is a
 * no-op (logs "already current"). Atomic: writes via `.tmp.$$` + `mv -f`,
 * same pattern as Day-16 `fc69af0`. Preserves the prior known-good as
 * `previous-known-good-release.json` for rollback.
 *
 * Wired into `scripts/validate-launch.ts` AFTER `release:prelaunch` so a
 * skipped-due-to-freshness prelaunch (Day-7 AUDIT-D7-002 optimization)
 * doesn't bypass promotion — that was the root cause of AUDIT-D16-001.
 *
 * Failure semantics: any error (read, parse, write) exits non-zero. The
 * validate:launch chain is never silently green when promotion fails.
 */

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

const args = parseArgs(process.argv.slice(2));
const root = path.resolve(args.root);
const stateDir = path.join(root, "artifacts", "mac-mini", "state");
const lastKnownGoodPath = path.join(stateDir, "last-known-good-release.json");
const previousKnownGoodPath = path.join(stateDir, "previous-known-good-release.json");

function readJsonOrNull(filePath) {
  if (!fs.existsSync(filePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function readCurrentFingerprint() {
  // Single source of truth: same script that mac_mini_publish_release_artifacts
  // uses to write expected-live-release.json. Calling it here guarantees the
  // writer and the runtime reader agree byte-for-byte.
  const stdout = execFileSync(
    "node",
    ["--import", "tsx", "scripts/release/read-release-fingerprint.ts"],
    { cwd: root, encoding: "utf8" }
  );
  return JSON.parse(stdout);
}

function writeAtomic(targetPath, payload) {
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  const tmpPath = `${targetPath}.tmp.${process.pid}`;
  fs.writeFileSync(tmpPath, `${JSON.stringify(payload, null, 2)}\n`);
  fs.renameSync(tmpPath, targetPath);
}

function shortReleaseId(fingerprint) {
  return fingerprint?.releaseId ?? "missing";
}

let exitCode = 0;
const result = {
  ok: true,
  promoted: false,
  previous: null,
  current: null,
};

try {
  const current = readCurrentFingerprint();
  result.current = shortReleaseId(current);

  // Block C (WS-LAUNCH-PREP-002, audit Hole #2): guard against LKG drift —
  // the fingerprint's commitSha MUST match git HEAD at write time. If a
  // developer runs release:promote-known-good with build artifacts that
  // disagree with HEAD (e.g., the build was produced from a prior commit
  // and a later commit landed without rebuilding), fail loud rather than
  // silently writing a misleading LKG record. The fingerprint is the
  // single source of truth shared with the runtime reader, so any
  // mismatch is a real authoring drift that should halt the chain.
  const headSha = execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
  if (current.commitSha && headSha !== current.commitSha) {
    console.error(
      `[promote-known-good] LKG write guard: fingerprint commitSha (${current.commitSha}) does not match git HEAD (${headSha}). Refusing to write a stale LKG record.`
    );
    result.ok = false;
    result.error = `commitSha/HEAD mismatch: fingerprint=${current.commitSha} head=${headSha}`;
    console.log(JSON.stringify(result, null, 2));
    process.exit(1);
  }

  const existing = readJsonOrNull(lastKnownGoodPath);
  result.previous = existing ? shortReleaseId(existing) : null;

  const alreadyCurrent =
    existing &&
    (existing.releaseId === current.releaseId ||
      (existing.commitSha === current.commitSha && existing.buildId === current.buildId));

  if (alreadyCurrent) {
    console.log(
      `[promote-known-good] already current at ${result.current}; no-op.`
    );
    result.ok = true;
  } else {
    // Preserve prior known-good for rollback before overwriting. If there
    // was no prior known-good (first run), skip the backup.
    if (existing) {
      writeAtomic(previousKnownGoodPath, existing);
    }
    writeAtomic(lastKnownGoodPath, current);
    result.promoted = true;
    console.log(
      `[promote-known-good] promoted from ${result.previous ?? "missing"} to ${result.current}.`
    );
  }
} catch (error) {
  result.ok = false;
  result.error = error instanceof Error ? error.message : String(error);
  exitCode = 1;
  console.error(`[promote-known-good] error: ${result.error}`);
}

console.log(JSON.stringify(result, null, 2));
process.exit(exitCode);
