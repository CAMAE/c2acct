/**
 * DEPLOY-NIGHT PREFLIGHT — read-only. Prints a PASS/FAIL table and exits 1 on
 * any FAIL. Changes nothing, prints no secret values (lengths, hosts and
 * one-way fingerprints only). The companion runbook is docs/DEPLOY-NIGHT.md.
 *
 *   pnpm deploy-night:preflight
 *   pnpm deploy-night:preflight --night-env=/path/to/night.env   # value-check the tier vars
 *   pnpm deploy-night:preflight --skip-audit --skip-suites --skip-vercel
 *
 * What it asserts:
 *   1. Every required variable is PRESENT and NON-BLANK in the file that
 *      carries it (.env.prod for the DB + provider key Cam sources on the
 *      night; .env.local for the Mac-mini agent runtime). Blank ≠ absent —
 *      see scripts/deploy-night/checks.ts for why that distinction is a rule.
 *   2. Every rotation-dependent secret does NOT match its known-old fingerprint
 *      (scripts/deploy-night/known-old-fingerprints.json). Before the night
 *      these FAIL by design: the current secrets ARE the old ones.
 *   3. The Vercel Production scope has the night's variables PRESENT (values
 *      are unreadable by CLI here — dashboard or rendered surface only).
 *   4. `pnpm audit --prod` has no critical/high findings.
 *   5. The DB-conditional contract suites run at 0 skips (a skip means the
 *      suite silently did not test what it exists to test).
 *
 * The one write this script can do is behind an explicit flag and is NOT part
 * of a preflight run:
 *   --record-old-fingerprints   append the CURRENT secrets' fingerprints to the
 *                               known-old file. Run this BEFORE rotating, so the
 *                               post-rotation preflight can prove the change.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

import dotenv from "dotenv";

import {
  checkEnvVar,
  fingerprint,
  parseAuditJson,
  parseVercelEnvLs,
  parseVitestSummary,
  renderTable,
  summarize,
  type CheckResult,
  type EnvValues,
  type KnownOldFingerprints,
  type VarSpec,
} from "./deploy-night/checks";

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(`--${name}`);
const option = (name: string) => args.find((arg) => arg.startsWith(`--${name}=`))?.split("=").slice(1).join("=");

const ROOT = process.cwd();
const KNOWN_OLD_PATH = path.join(ROOT, "scripts/deploy-night/known-old-fingerprints.json");
const PROD_ENV_PATH = path.join(ROOT, option("env-prod") ?? ".env.prod");
const LOCAL_ENV_PATH = path.join(ROOT, option("env-local") ?? ".env.local");
const NIGHT_ENV_PATH = option("night-env") ? path.resolve(ROOT, option("night-env")!) : null;

/** The DB-conditional suites: each skips its cases when Postgres is unreachable. */
const ZERO_SKIP_SUITES = [
  "tests/module-history.contract.test.ts",
  "tests/public-tier-guardrails.contract.test.ts",
  "tests/vertical-cohort-isolation-db.contract.test.ts",
];

// ---- variable specs --------------------------------------------------------

const PROD_FILE_SPECS: VarSpec[] = [
  { name: "DATABASE_URL", scope: ".env.prod", kind: "url", required: true, rotation: true, why: "pooled Neon URL the app and seeds use" },
  { name: "DIRECT_URL", scope: ".env.prod", kind: "url", required: true, rotation: true, why: "non-pooled Neon URL; migrations and rotations:verify need it" },
  { name: "ANTHROPIC_API_KEY", scope: ".env.prod", kind: "secret", required: true, rotation: true, minLength: 20, why: "provider key — the org swap replaces it" },
];

const LOCAL_FILE_SPECS: VarSpec[] = [
  { name: "TELEGRAM_BOT_TOKEN", scope: ".env.local", kind: "secret", required: true, rotation: true, minLength: 20, why: "Mac-mini bot + supervisor; rotated via BotFather" },
  { name: "TELEGRAM_ALLOWED_CHAT_ID", scope: ".env.local", kind: "text", required: true, why: "the only chat the bot answers" },
  { name: "AUTH_SECRET", scope: ".env.local", kind: "secret", required: true, rotation: true, minLength: 32, why: "session signing; rotation invalidates every session" },
  { name: "ANTHROPIC_API_KEY", scope: ".env.local", kind: "secret", required: true, rotation: true, minLength: 20, why: "agents' provider key — same org swap" },
];

/** Values Cam will paste into Vercel Production; checked when --night-env points at them. */
const NIGHT_VALUE_SPECS: VarSpec[] = [
  { name: "PAT_PUBLIC_IP_HASH_SALT", scope: "night-env", kind: "secret", required: true, minLength: 16, why: "public tier refuses to write IP hashes without a salt" },
  { name: "PAT_WEB_TIER_DAILY_CAP_USD", scope: "night-env", kind: "usd", required: true, why: "web tier global cap; rehearsal runs at the minimum" },
  { name: "PAT_PUBLIC_DAILY_CAP_USD", scope: "night-env", kind: "usd", required: true, why: "public tier global cap; rehearsal runs at the minimum" },
  { name: "PAT_WEB_TIER_USER_DAILY_SEARCHES", scope: "night-env", kind: "usd", required: false },
  { name: "AUTH_SECRET", scope: "night-env", kind: "secret", required: true, rotation: true, minLength: 32 },
  { name: "ANTHROPIC_API_KEY", scope: "night-env", kind: "secret", required: true, rotation: true, minLength: 20 },
  { name: "DATABASE_URL", scope: "night-env", kind: "url", required: true, rotation: true },
  { name: "PAT_ENABLE_PAT_ASSISTANT", scope: "night-env", kind: "flag", required: false },
  { name: "PAT_ENABLE_PAT_LADDER", scope: "night-env", kind: "flag", required: false },
  { name: "PAT_ENABLE_PAT_WEB_TIER", scope: "night-env", kind: "flag", required: false },
  { name: "PAT_ENABLE_PUBLIC_TIER", scope: "night-env", kind: "flag", required: false },
];

/** Presence-only, in Vercel Production scope. */
const VERCEL_REQUIRED = [
  "DATABASE_URL",
  "AUTH_SECRET",
  "ANTHROPIC_API_KEY",
  "PAT_PUBLIC_IP_HASH_SALT",
  "PAT_WEB_TIER_DAILY_CAP_USD",
  "PAT_PUBLIC_DAILY_CAP_USD",
];
const VERCEL_FLAGS = ["PAT_ENABLE_PAT_ASSISTANT", "PAT_ENABLE_PAT_LADDER", "PAT_ENABLE_PAT_WEB_TIER", "PAT_ENABLE_PUBLIC_TIER"];

// ---- helpers ---------------------------------------------------------------

function readEnvFile(file: string): EnvValues | null {
  if (!fs.existsSync(file)) return null;
  return dotenv.parse(fs.readFileSync(file));
}

function readKnownOld(): { recordedAt: string | null; fingerprints: KnownOldFingerprints } {
  if (!fs.existsSync(KNOWN_OLD_PATH)) return { recordedAt: null, fingerprints: {} };
  const parsed = JSON.parse(fs.readFileSync(KNOWN_OLD_PATH, "utf8")) as {
    recordedAt?: string;
    fingerprints?: KnownOldFingerprints;
  };
  return { recordedAt: parsed.recordedAt ?? null, fingerprints: parsed.fingerprints ?? {} };
}

function vercelCredentialExists(): boolean {
  if (process.env.VERCEL_TOKEN?.trim()) return true;
  const home = process.env.HOME ?? "";
  const candidates = [
    path.join(home, "Library/Application Support/com.vercel.cli/auth.json"),
    path.join(home, ".local/share/com.vercel.cli/auth.json"),
    path.join(process.env.XDG_DATA_HOME ?? "", "com.vercel.cli/auth.json"),
  ];
  return candidates.some((file) => file.length > 0 && fs.existsSync(file));
}

function run(command: string, commandArgs: string[], timeoutMs: number) {
  // stdin closed: a CLI that wants to prompt (vercel login, a scope picker)
  // must fail immediately rather than hang the preflight waiting for a human.
  return spawnSync(command, commandArgs, {
    cwd: ROOT,
    encoding: "utf8",
    timeout: timeoutMs,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

// ---- record mode (the only write, explicit) --------------------------------

function recordOldFingerprints(): void {
  const existing = readKnownOld();
  const next: KnownOldFingerprints = { ...existing.fingerprints };
  const sources: Array<[EnvValues | null, VarSpec[]]> = [
    [readEnvFile(PROD_ENV_PATH), PROD_FILE_SPECS],
    [readEnvFile(LOCAL_ENV_PATH), LOCAL_FILE_SPECS],
  ];
  let added = 0;
  for (const [values, specs] of sources) {
    if (!values) continue;
    for (const spec of specs) {
      if (!spec.rotation) continue;
      const value = values[spec.name]?.trim();
      if (!value) continue;
      const fp = fingerprint(value);
      const list = next[spec.name] ?? [];
      if (!list.includes(fp)) {
        list.push(fp);
        added += 1;
      }
      next[spec.name] = list;
    }
  }
  const payload = {
    note:
      "One-way fingerprints (16 hex of a domain-separated SHA-256) of secrets that were IN USE before a rotation. " +
      "The preflight fails any rotation-dependent secret whose fingerprint is listed here. Never store values.",
    recordedAt: new Date().toISOString(),
    fingerprints: next,
  };
  fs.writeFileSync(KNOWN_OLD_PATH, JSON.stringify(payload, null, 2) + "\n");
  console.log(`[preflight] recorded ${added} new known-old fingerprint(s) → ${path.relative(ROOT, KNOWN_OLD_PATH)}`);
}

// ---- checks ----------------------------------------------------------------

function fileChecks(label: string, file: string, specs: VarSpec[], knownOld: KnownOldFingerprints): CheckResult[] {
  const values = readEnvFile(file);
  if (!values) {
    return [{ check: path.basename(file), scope: label, status: "FAIL", detail: `file not found at ${file}` }];
  }
  return specs.map((spec) => checkEnvVar(spec, values, knownOld));
}

function nightEnvChecks(knownOld: KnownOldFingerprints): CheckResult[] {
  if (!NIGHT_ENV_PATH) {
    return NIGHT_VALUE_SPECS.filter((spec) => spec.required).map((spec) => ({
      check: spec.name,
      scope: "night-env",
      status: "SKIP" as const,
      detail: "no --night-env file given; value-check the Vercel Production values by pointing at the file you will paste from",
    }));
  }
  return fileChecks("night-env", NIGHT_ENV_PATH, NIGHT_VALUE_SPECS, knownOld);
}

function vercelChecks(): CheckResult[] {
  const scope = "vercel:production";
  if (flag("skip-vercel")) return [{ check: "vercel env ls", scope, status: "SKIP", detail: "--skip-vercel" }];
  if (!fs.existsSync(path.join(ROOT, ".vercel/project.json"))) {
    return [{ check: "vercel env ls", scope, status: "WARN", detail: "repo is not linked to a Vercel project (.vercel/project.json missing)" }];
  }
  // The Vercel CLI starts a device-login flow the moment it finds no credential,
  // and that flow needs no stdin — it opens a browser and waits. A preflight must
  // never do that on its own, so it only calls the CLI when a credential already
  // exists (or the operator opts in with --vercel after `vercel login`).
  if (!flag("vercel") && !vercelCredentialExists()) {
    return [{ check: "vercel env ls", scope, status: "SKIP", detail: "no Vercel CLI credential on this machine — run `vercel login` (a human step), then re-run, or pass --vercel" }];
  }
  const result = run("vercel", ["env", "ls", "production"], 60_000);
  if (result.error || result.status !== 0) {
    const reason =
      result.error?.message ??
      `${result.stderr}\n${result.stdout}`
        .split("\n")
        .map((line) => line.replace(/[^\x20-\x7e]/g, "").trim())
        .filter((line) => /[a-z]/i.test(line))
        .find((line) => /error|not|no |login|token|denied|fail/i.test(line)) ??
      `exit ${result.status}`;
    return [{ check: "vercel env ls", scope, status: "WARN", detail: `could not list (${reason ?? "unknown"}) — verify presence in the dashboard` }];
  }
  const names = parseVercelEnvLs(`${result.stdout}\n${result.stderr}`);
  const rows: CheckResult[] = VERCEL_REQUIRED.map((name) => ({
    check: name,
    scope,
    status: names.has(name) ? "PASS" : "FAIL",
    detail: names.has(name)
      ? "present (value unreadable by CLI — confirm in dashboard / rendered surface)"
      : "ABSENT in Production scope",
  }));
  for (const name of VERCEL_FLAGS) {
    rows.push({
      check: name,
      scope,
      status: names.has(name) ? "WARN" : "PASS",
      detail: names.has(name)
        ? "present — flag exists in scope; its VALUE decides on/off and only the dashboard or a rendered surface can show it"
        : "absent — flag is off (fail-closed), as expected before its flip",
    });
  }
  return rows;
}

function auditCheck(): CheckResult {
  const scope = "pnpm audit --prod";
  if (flag("skip-audit")) return { check: "audit", scope, status: "SKIP", detail: "--skip-audit" };
  const result = run("pnpm", ["audit", "--prod", "--json"], 180_000);
  const counts = parseAuditJson(result.stdout);
  if (!counts) {
    return { check: "audit", scope, status: "WARN", detail: `no parseable audit output (${(result.stderr || "").trim().split("\n")[0] || "empty"})` };
  }
  const detail = `critical ${counts.critical} · high ${counts.high} · moderate ${counts.moderate} · low ${counts.low}`;
  return { check: "audit", scope, status: counts.critical === 0 && counts.high === 0 ? "PASS" : "FAIL", detail };
}

function zeroSkipCheck(): CheckResult {
  const scope = "test:unit (db suites)";
  if (flag("skip-suites")) return { check: "0-skip suites", scope, status: "SKIP", detail: "--skip-suites" };
  const result = run("npx", ["vitest", "run", ...ZERO_SKIP_SUITES], 300_000);
  const summary = parseVitestSummary(`${result.stdout}\n${result.stderr}`);
  if (!summary) {
    return { check: "0-skip suites", scope, status: "FAIL", detail: `vitest produced no summary (exit ${result.status})` };
  }
  const detail = `${summary.passed} passed · ${summary.skipped} skipped · ${summary.failed} failed across ${ZERO_SKIP_SUITES.length} DB-conditional suites`;
  if (summary.failed > 0) return { check: "0-skip suites", scope, status: "FAIL", detail };
  if (summary.skipped > 0) return { check: "0-skip suites", scope, status: "FAIL", detail: `${detail} — a skip means Postgres was unreachable and the suite tested nothing` };
  return { check: "0-skip suites", scope, status: "PASS", detail };
}

function gitCheck(): CheckResult[] {
  const head = run("git", ["rev-parse", "--short", "HEAD"], 10_000).stdout.trim();
  const status = run("git", ["status", "--short"], 10_000).stdout.trim();
  return [
    { check: "HEAD", scope: "git", status: "PASS", detail: head || "(unknown)" },
    {
      check: "tree clean",
      scope: "git",
      status: status.length === 0 ? "PASS" : "WARN",
      detail: status.length === 0 ? "clean" : `${status.split("\n").length} path(s) modified/untracked — deploy from a clean tree`,
    },
  ];
}

// ---- main ------------------------------------------------------------------

function main(): void {
  if (flag("record-old-fingerprints")) {
    recordOldFingerprints();
    return;
  }

  const knownOld = readKnownOld();
  const results: CheckResult[] = [
    ...gitCheck(),
    ...fileChecks(".env.prod", PROD_ENV_PATH, PROD_FILE_SPECS, knownOld.fingerprints),
    ...fileChecks(".env.local", LOCAL_ENV_PATH, LOCAL_FILE_SPECS, knownOld.fingerprints),
    ...nightEnvChecks(knownOld.fingerprints),
    ...vercelChecks(),
    auditCheck(),
    zeroSkipCheck(),
  ];

  console.log(`DEPLOY-NIGHT PREFLIGHT · ${new Date().toISOString()} · known-old fingerprints recorded ${knownOld.recordedAt ?? "never"}`);
  console.log("read-only: nothing changed; no secret values printed\n");
  console.log(renderTable(results));
  const counts = summarize(results);
  console.log(`\nPASS ${counts.PASS} · FAIL ${counts.FAIL} · WARN ${counts.WARN} · SKIP ${counts.SKIP}`);
  console.log(counts.FAIL === 0 ? "PREFLIGHT: PASS" : "PREFLIGHT: FAIL — every FAIL above blocks the night");
  process.exit(counts.FAIL === 0 ? 0 : 1);
}

main();
