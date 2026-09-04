/**
 * Pure checks behind scripts/deploy-night-preflight.ts. No I/O here, so every
 * rule the preflight applies can be pinned by a unit test without a shell.
 *
 * Vocabulary the whole preflight uses:
 *   absent  — the variable is not defined at all
 *   blank   — defined, but empty or whitespace-only
 *   set     — defined with a non-blank value
 *
 * Blank is NOT absent, and the code base does not treat them the same. A blank
 * PAT_WEB_TIER_DAILY_CAP_USD reaches `Number("")`, which is 0, which is a valid
 * cap — so the web tier silently declines every call instead of falling back
 * to its default. An absent one falls back to the default. That is the lesson
 * this file exists to keep, so a blank required variable is always a FAIL with
 * its own message, never folded into "missing".
 */
import { createHash } from "node:crypto";

export type EnvValues = Record<string, string | undefined>;

export type Presence = { state: "absent" | "blank" | "set"; length: number };

export function presence(name: string, source: EnvValues): Presence {
  if (!Object.prototype.hasOwnProperty.call(source, name) || source[name] === undefined) {
    return { state: "absent", length: 0 };
  }
  const value = source[name] ?? "";
  return value.trim().length === 0
    ? { state: "blank", length: value.length }
    : { state: "set", length: value.trim().length };
}

/**
 * A short, one-way fingerprint of a secret, for "has this been rotated?" checks.
 * 16 hex characters of a domain-separated SHA-256: enough to compare, useless to
 * invert, and safe to commit. The value itself never leaves the process.
 */
export function fingerprint(value: string): string {
  return createHash("sha256").update(`patalign-fingerprint-v1:${value.trim()}`).digest("hex").slice(0, 16);
}

export type VarKind = "secret" | "url" | "usd" | "flag" | "text";

export type VarSpec = {
  name: string;
  /** Where the value lives, for the report — not a lookup key. */
  scope: string;
  kind: VarKind;
  required: boolean;
  /** Secrets shorter than this are a FAIL (a 12-byte AUTH_SECRET is not a secret). */
  minLength?: number;
  /** Rotation-dependent: FAIL when the value's fingerprint is in the known-old set. */
  rotation?: boolean;
  /** Why the night needs it, printed on failure. */
  why?: string;
};

export type CheckStatus = "PASS" | "FAIL" | "WARN" | "SKIP";

export type CheckResult = {
  check: string;
  scope: string;
  status: CheckStatus;
  detail: string;
};

export type KnownOldFingerprints = Record<string, string[]>;

function hostOf(url: string): string {
  try {
    return new URL(url).host || "(no host)";
  } catch {
    return "(unparseable URL)";
  }
}

/** One variable, one verdict. Never includes the value in the detail. */
export function checkEnvVar(
  spec: VarSpec,
  source: EnvValues,
  knownOld: KnownOldFingerprints = {}
): CheckResult {
  const base = { check: spec.name, scope: spec.scope };
  const found = presence(spec.name, source);

  if (found.state === "absent") {
    return spec.required
      ? { ...base, status: "FAIL", detail: `absent${spec.why ? ` — ${spec.why}` : ""}` }
      : { ...base, status: "SKIP", detail: "absent (optional)" };
  }
  if (found.state === "blank") {
    return {
      ...base,
      status: "FAIL",
      detail:
        `BLANK — defined but empty (${found.length} whitespace char${found.length === 1 ? "" : "s"}). ` +
        "Blank is not absent: a blank value does not fall back to the default" +
        (spec.kind === "usd" ? ' — Number("") is 0, so a blank cap declines everything.' : "."),
    };
  }

  const value = (source[spec.name] ?? "").trim();

  if (spec.kind === "usd") {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return { ...base, status: "FAIL", detail: `not a non-negative number (${JSON.stringify(value)}) — falls back to the code default silently` };
    }
    return { ...base, status: "PASS", detail: `${parsed} USD` };
  }

  if (spec.kind === "flag") {
    return value === "1"
      ? { ...base, status: "PASS", detail: "ON (=1)" }
      : { ...base, status: "WARN", detail: `OFF — value ${JSON.stringify(value)} is not "1"; flags are === "1" and anything else is off` };
  }

  if (spec.minLength && value.length < spec.minLength) {
    return { ...base, status: "FAIL", detail: `too short: ${value.length} chars, need ≥ ${spec.minLength}` };
  }

  if (spec.rotation) {
    const fp = fingerprint(value);
    const olds = knownOld[spec.name] ?? [];
    if (olds.includes(fp)) {
      return { ...base, status: "FAIL", detail: `NOT ROTATED — fingerprint ${fp} is in the known-old set` };
    }
    const where = spec.kind === "url" ? `, host ${hostOf(value)}` : "";
    return {
      ...base,
      status: olds.length > 0 ? "PASS" : "WARN",
      detail:
        olds.length > 0
          ? `rotated — fingerprint ${fp} not in known-old set (${olds.length} recorded)${where}`
          : `fingerprint ${fp}; no known-old fingerprint recorded, so rotation is unproven${where}`,
    };
  }

  const where = spec.kind === "url" ? `host ${hostOf(value)}` : `${value.length} chars`;
  return { ...base, status: "PASS", detail: `set (${where})` };
}

/** Vitest's closing summary line, e.g. "Tests  1482 passed | 3 skipped (1485)". */
export function parseVitestSummary(output: string): { passed: number; skipped: number; failed: number } | null {
  const line = output.split("\n").find((entry) => /^\s*Tests\s+\d/.test(entry));
  if (!line) return null;
  const pick = (label: string) => Number(line.match(new RegExp(`(\\d+) ${label}`))?.[1] ?? 0);
  return { passed: pick("passed"), skipped: pick("skipped"), failed: pick("failed") };
}

/** `pnpm audit --json` → severity counts. Missing metadata reads as all zero. */
export function parseAuditJson(json: string): { critical: number; high: number; moderate: number; low: number } | null {
  try {
    const parsed = JSON.parse(json) as { metadata?: { vulnerabilities?: Record<string, number> } };
    const counts = parsed.metadata?.vulnerabilities;
    if (!counts) return null;
    return {
      critical: counts.critical ?? 0,
      high: counts.high ?? 0,
      moderate: counts.moderate ?? 0,
      low: counts.low ?? 0,
    };
  } catch {
    return null;
  }
}

/**
 * Names present in `vercel env ls <target>` output. Presence is the ONLY thing
 * the CLI can tell us here: `vercel env pull` returns empty for every encrypted
 * value in this project (docs/incidents/2026-07-23-prod-env-scope-drift.md), so
 * values are verified in the dashboard or on a rendered surface, never by CLI.
 */
export function parseVercelEnvLs(output: string): Set<string> {
  const names = new Set<string>();
  for (const line of output.split("\n")) {
    const match = line.trim().match(/^([A-Z][A-Z0-9_]*)\s+/);
    if (match && match[1] !== "NAME") names.add(match[1]);
  }
  return names;
}

export function summarize(results: readonly CheckResult[]): Record<CheckStatus, number> {
  const counts: Record<CheckStatus, number> = { PASS: 0, FAIL: 0, WARN: 0, SKIP: 0 };
  for (const result of results) counts[result.status] += 1;
  return counts;
}

export function renderTable(results: readonly CheckResult[]): string {
  const width = Math.max(5, ...results.map((r) => r.check.length));
  const scopeWidth = Math.max(5, ...results.map((r) => r.scope.length));
  const lines = [`${"CHECK".padEnd(width)}  ${"SCOPE".padEnd(scopeWidth)}  RESULT  DETAIL`];
  for (const r of results) {
    lines.push(`${r.check.padEnd(width)}  ${r.scope.padEnd(scopeWidth)}  ${r.status.padEnd(6)}  ${r.detail}`);
  }
  return lines.join("\n");
}
