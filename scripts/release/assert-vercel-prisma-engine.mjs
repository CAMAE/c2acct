#!/usr/bin/env node
/**
 * Founders-preview deploy gate — the Prisma engine landmine.
 *
 * Vercel's serverless function tracing (nft) does NOT follow Prisma's
 * runtime-loaded query-engine binary, so a macOS `vercel build --prod` can ship
 * a prebuilt .vercel/output with ZERO Linux engines — every DB route then 500s in
 * production with "Database unavailable". next.config.ts force-includes the rhel +
 * debian engines via outputFileTracingIncludes; this asserts they actually landed
 * in .vercel/output BEFORE any deploy. Fails loud (exit 1) on 0 Linux engines.
 *
 * Two modes:
 *   --root .            local prebuilt guard: assert .vercel/output has a Linux
 *                       engine (only meaningful when `vercel build` honors
 *                       outputFileTracingIncludes — NOT on macOS local builds).
 *   --deployed <url>    the REAL engine proof for a Vercel cloud build: hit
 *                       <url>/api/health/db and require 200 (a working query
 *                       engine is the only way that route reaches the DB). This is
 *                       the gate for the founders-preview deploy.
 *
 * Usage:
 *   node scripts/release/assert-vercel-prisma-engine.mjs --root .
 *   node scripts/release/assert-vercel-prisma-engine.mjs --deployed https://…vercel.app
 */
import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const deployedIndex = process.argv.indexOf("--deployed");
if (deployedIndex !== -1) {
  const base = process.argv[deployedIndex + 1]?.replace(/\/$/, "");
  if (!base) {
    console.error("FAIL assert-vercel-prisma-engine: --deployed requires a URL.");
    process.exit(1);
  }
  const url = `${base}/api/health/db`;
  try {
    const res = await fetch(url, { redirect: "manual" });
    const body = await res.json().catch(() => null);
    if (res.status !== 200 || body?.ok !== true) {
      console.error(
        `FAIL assert-vercel-prisma-engine(deployed): ${url} -> ${res.status} ok=${String(body?.ok)}. ` +
          `A missing/mismatched Linux Prisma engine is the usual cause ("Database unavailable").`
      );
      process.exit(1);
    }
    console.log(`PASS assert-vercel-prisma-engine(deployed): ${url} -> 200 ok=true (query engine reaches the DB).`);
    process.exit(0);
  } catch (error) {
    console.error(`FAIL assert-vercel-prisma-engine(deployed): ${url} threw ${error instanceof Error ? error.message : error}`);
    process.exit(1);
  }
}

const rootArgIndex = process.argv.indexOf("--root");
const ROOT = rootArgIndex !== -1 ? process.argv[rootArgIndex + 1] : process.cwd();
const OUTPUT = join(ROOT, ".vercel", "output");
// Vercel's runtime is Amazon Linux (RHEL family, OpenSSL 3). debian is the
// belt-and-suspenders target. Either proves a Linux engine shipped.
const LINUX_ENGINE_RE = /query-engine-(rhel|debian)-openssl/;

function walk(dir, hits) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return hits;
  }
  for (const name of entries) {
    const full = join(dir, name);
    let s;
    try {
      s = statSync(full);
    } catch {
      continue;
    }
    if (s.isDirectory()) {
      walk(full, hits);
    } else if (LINUX_ENGINE_RE.test(name)) {
      hits.push(full);
    }
  }
  return hits;
}

const hits = walk(OUTPUT, []);
const rhel = hits.filter((h) => /rhel-openssl/.test(h));

if (hits.length === 0) {
  console.error(
    `FAIL assert-vercel-prisma-engine: 0 Linux Prisma engines in ${OUTPUT}. ` +
      `A prebuilt deploy would 500 ("Database unavailable"). Check next.config.ts ` +
      `outputFileTracingIncludes (the "/**" rhel/debian engine globs) and re-run ` +
      `\`vercel build --prod\`.`
  );
  process.exit(1);
}
if (rhel.length === 0) {
  console.error(
    `FAIL assert-vercel-prisma-engine: ${hits.length} Linux engine(s) present but ` +
      `NONE is rhel-openssl (Vercel's runtime target). Found: ${[...new Set(hits.map((h) => h.replace(/^.*(query-engine-[^/]+)$/, "$1")))].join(", ")}.`
  );
  process.exit(1);
}
console.log(
  `PASS assert-vercel-prisma-engine: ${rhel.length} rhel-openssl + ${hits.length - rhel.length} debian engine copy(ies) bundled in .vercel/output.`
);
