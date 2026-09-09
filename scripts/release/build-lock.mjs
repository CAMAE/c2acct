#!/usr/bin/env node
/**
 * Build lock (Finish box, 2026-09-08). `pnpm build` runs through here.
 *
 * Why: launchd's com.c2acct.app (KeepAlive) runs its own `pnpm build` whenever
 * .next/standalone/server.js is missing, and every `next build` deletes that
 * file mid-run — so a manual build and the launchd build could race. This is
 * the smallest guard: one lock directory (atomic mkdir) holding the builder's
 * pid. A second builder sees a live pid, prints one line, and exits 75
 * (EX_TEMPFAIL) without touching .next. A stale lock (dead pid) is reclaimed.
 */
import { spawnSync } from "node:child_process";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const lockDir = path.join(root, "artifacts", "mac-mini", "state", "build.lock");
const log = (line) => console.log(`[build-lock] ${line}`);

function pidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error && error.code === "EPERM";
  }
}

function readHolder() {
  try {
    const raw = JSON.parse(readFileSync(path.join(lockDir, "holder.json"), "utf8"));
    return typeof raw.pid === "number" ? raw : null;
  } catch {
    return null;
  }
}

function acquire() {
  mkdirSync(path.dirname(lockDir), { recursive: true });
  try {
    mkdirSync(lockDir);
  } catch (error) {
    if (!error || error.code !== "EEXIST") throw error;
    const holder = readHolder();
    if (holder && pidAlive(holder.pid)) {
      log(`refusing: a build is already running (pid ${holder.pid}, started ${holder.startedAt}); not touching .next`);
      process.exit(75);
    }
    log(`reclaiming stale lock (${holder ? `pid ${holder.pid} is gone` : "no holder recorded"})`);
    rmSync(lockDir, { recursive: true, force: true });
    mkdirSync(lockDir);
  }
  writeFileSync(path.join(lockDir, "holder.json"), JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString(), cwd: root }));
}

function release() {
  rmSync(lockDir, { recursive: true, force: true });
}

acquire();
log(`acquired (pid ${process.pid})`);
let code = 1;
try {
  const steps = [
    ["pnpm", ["exec", "next", "build", "--webpack"]],
    ["node", ["scripts/release/prepare-standalone-runtime.mjs"]],
  ];
  code = 0;
  for (const [cmd, args] of steps) {
    const result = spawnSync(cmd, args, { stdio: "inherit", cwd: root, env: process.env });
    code = result.status ?? 1;
    if (code !== 0) break;
  }
} finally {
  release();
  log(`released (exit ${code})`);
}
process.exit(code);
