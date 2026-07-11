#!/usr/bin/env node

/**
 * Asset-integrity proof (HOTFIX 2026-07-11, closer for "served build != disk build").
 *
 * A text-grep HTTP proof is NOT sufficient for "done": a running server can
 * serve HTML whose referenced CSS/JS 404 because a rebuild rotated the BUILD_ID
 * (+ asset hashes) after the server started. This proof catches exactly that.
 *
 * For each proof route it:
 *   1. asserts the route responds 200 (following one PAT auth redirect to a
 *      styled public page if needed),
 *   2. parses EVERY <link rel="stylesheet" href> and <script src> (plus
 *      modulepreload) pointing at /_next/*,
 *   3. fetches each asset and asserts 200 + a correct content-type
 *      (.css -> text/css, .js -> javascript),
 *   4. asserts the BUILD_ID embedded in the served HTML == .next/BUILD_ID on
 *      disk == the release fingerprint's buildId.
 *
 * Modes:
 *   --base-url http://127.0.0.1:3000   check a live server (nightly)
 *   --self-host                        spawn .next/standalone/server.js on an
 *                                      ephemeral port, check, tear down
 *                                      (release:prelaunch, no server needed)
 *
 * Exit non-zero on ANY failure. Wired into release:prelaunch (--self-host) and
 * the nightly (--base-url :3000). See [[feedback_app_service_startup_traps]].
 */

import fs from "node:fs";
import path from "node:path";
import { execFileSync, spawn } from "node:child_process";
import net from "node:net";

function parseArgs(argv) {
  const args = { root: process.cwd(), baseUrl: null, selfHost: false, routes: null, timeoutMs: 15000 };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === "--root") { args.root = argv[++i]; }
    else if (a === "--base-url") { args.baseUrl = argv[++i]; }
    else if (a === "--self-host") { args.selfHost = true; }
    else if (a === "--routes") { args.routes = argv[++i].split(",").map((s) => s.trim()).filter(Boolean); }
    else if (a === "--timeout") { args.timeoutMs = Number(argv[++i]); }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const root = path.resolve(args.root);
// Public, fully-styled routes (no auth). Add here as surfaces are added.
const PROOF_ROUTES = args.routes ?? ["/sign-in", "/methodology"];

function readDiskBuildId() {
  const p = path.join(root, ".next", "BUILD_ID");
  if (!fs.existsSync(p)) throw new Error(`missing .next/BUILD_ID at ${p}`);
  return fs.readFileSync(p, "utf8").trim();
}

function readFingerprintBuildId() {
  try {
    const stdout = execFileSync("node", ["--import", "tsx", "scripts/release/read-release-fingerprint.ts"], {
      cwd: root, encoding: "utf8",
    });
    return JSON.parse(stdout).buildId;
  } catch (e) {
    // Fallback: release-state.env BUILD_ID (written from the same fingerprint).
    const envPath = path.join(root, "artifacts", "mac-mini", "state", "release-state.env");
    if (fs.existsSync(envPath)) {
      const m = fs.readFileSync(envPath, "utf8").match(/^BUILD_ID=(.+)$/m);
      if (m) return m[1].trim();
    }
    throw new Error(`could not resolve fingerprint buildId: ${e?.message ?? e}`);
  }
}

async function fetchWithTimeout(url, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), args.timeoutMs);
  try {
    return await fetch(url, { redirect: "manual", signal: ctrl.signal, ...opts });
  } finally {
    clearTimeout(t);
  }
}

function extractAssets(html) {
  const assets = [];
  const linkRe = /<link\b[^>]*>/gi;
  let m;
  while ((m = linkRe.exec(html))) {
    const tag = m[0];
    const rel = (tag.match(/\brel="([^"]+)"/i) || [])[1] || "";
    const href = (tag.match(/\bhref="([^"]+)"/i) || [])[1];
    if (!href) continue;
    if (/stylesheet/i.test(rel)) assets.push({ url: href, kind: "css" });
    else if (/modulepreload|preload/i.test(rel) && /\.js(\?|$)/.test(href)) assets.push({ url: href, kind: "js" });
  }
  const scriptRe = /<script\b[^>]*\bsrc="([^"]+)"[^>]*>/gi;
  while ((m = scriptRe.exec(html))) {
    assets.push({ url: m[1], kind: "js" });
  }
  // Only PAT-hosted build assets; de-dupe.
  const seen = new Set();
  return assets.filter((a) => a.url.startsWith("/_next/")).filter((a) => {
    if (seen.has(a.url)) return false;
    seen.add(a.url);
    return true;
  });
}

function contentTypeOk(kind, ct) {
  if (!ct) return false;
  if (kind === "css") return /text\/css/i.test(ct);
  if (kind === "js") return /javascript/i.test(ct);
  return true;
}

async function checkRoute(baseUrl, route, diskBuildId, failures) {
  const url = `${baseUrl}${route}`;
  let res = await fetchWithTimeout(url);
  // Follow a single redirect to a styled public page (PAT bounces some routes).
  if ([301, 302, 303, 307, 308].includes(res.status)) {
    const loc = res.headers.get("location");
    if (loc) res = await fetchWithTimeout(new URL(loc, baseUrl).toString());
  }
  if (res.status !== 200) {
    failures.push(`${route}: route status ${res.status} (expected 200)`);
    return;
  }
  const html = await res.text();
  const assets = extractAssets(html);
  if (assets.length === 0) {
    failures.push(`${route}: no /_next stylesheet or script assets found in HTML (unstyled?)`);
  }
  // Served BUILD_ID must appear in the HTML and equal disk.
  if (!html.includes(diskBuildId)) {
    failures.push(`${route}: served HTML does not reference disk BUILD_ID ${diskBuildId} (stale server)`);
  }
  let okAssets = 0;
  for (const a of assets) {
    const ares = await fetchWithTimeout(`${baseUrl}${a.url}`);
    const ct = ares.headers.get("content-type");
    if (ares.status !== 200) {
      failures.push(`${route}: asset ${a.url} -> ${ares.status} (expected 200)`);
    } else if (!contentTypeOk(a.kind, ct)) {
      failures.push(`${route}: asset ${a.url} content-type "${ct}" not valid for ${a.kind}`);
    } else {
      okAssets += 1;
    }
  }
  console.log(`  ${route}: 200, ${okAssets}/${assets.length} assets 200+typed, buildId referenced ✓`);
}

function waitForPort(port, host, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const sock = net.connect(port, host);
      sock.once("connect", () => { sock.destroy(); resolve(); });
      sock.once("error", () => {
        sock.destroy();
        if (Date.now() > deadline) reject(new Error(`timeout waiting for ${host}:${port}`));
        else setTimeout(tryOnce, 300);
      });
    };
    tryOnce();
  });
}

async function main() {
  const diskBuildId = readDiskBuildId();
  const fingerprintBuildId = readFingerprintBuildId();
  const failures = [];

  console.log(`[asset-integrity] disk BUILD_ID=${diskBuildId} fingerprint buildId=${fingerprintBuildId}`);
  if (diskBuildId !== fingerprintBuildId) {
    failures.push(`disk BUILD_ID (${diskBuildId}) != fingerprint buildId (${fingerprintBuildId})`);
  }

  let child = null;
  let baseUrl = args.baseUrl;
  try {
    if (args.selfHost) {
      const port = 3400 + Math.floor((Date.now() % 500));
      baseUrl = `http://127.0.0.1:${port}`;
      console.log(`[asset-integrity] self-hosting standalone on ${baseUrl}`);
      child = spawn("node", [path.join(root, ".next", "standalone", "server.js")], {
        cwd: root,
        env: { ...process.env, PORT: String(port), HOSTNAME: "127.0.0.1" },
        stdio: "ignore",
      });
      await waitForPort(port, "127.0.0.1", 30000);
    }
    if (!baseUrl) throw new Error("no --base-url and not --self-host");

    console.log(`[asset-integrity] checking ${PROOF_ROUTES.length} route(s) against ${baseUrl}`);
    for (const route of PROOF_ROUTES) {
      await checkRoute(baseUrl, route, diskBuildId, failures);
    }
  } finally {
    if (child) child.kill("SIGTERM");
  }

  if (failures.length) {
    console.error(`\n[asset-integrity] FAIL (${failures.length}):`);
    for (const f of failures) console.error(`  - ${f}`);
    process.exit(1);
  }
  console.log(`[asset-integrity] PASS — served BUILD_ID == disk == fingerprint; all assets 200 + typed.`);
}

main().catch((e) => {
  console.error(`[asset-integrity] ERROR: ${e?.stack ?? e?.message ?? e}`);
  process.exit(1);
});
