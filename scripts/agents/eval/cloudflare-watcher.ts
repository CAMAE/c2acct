// Minimal eval harness for the Cloudflare / Domain Watcher (Phase 1c).
//   Part A — state-diff scenarios (pure diffState, no network/DB).
//   Part B — allowlist_strict: load the real config and confirm the deny-by-
//            default gate (isToolAllowed, the predicate canUseTool enforces)
//            allows only dig/cloudflare.read/telegram.send_message and blocks
//            everything else.
import { promises as fs } from "node:fs";
import path from "node:path";
import { parseYaml } from "@/lib/agents/yaml";
import { loadAgentConfig, isToolAllowed } from "@/lib/agents/config";
import { decideAlert, diffState } from "@/lib/agents/cloudflare-watcher/evaluator";
import { buildTelegramSendPayload } from "@/lib/agents/telegram";
import type { DnsSnapshot } from "@/lib/agents/cloudflare-watcher/types";

const SCENARIO_DIR = "agents/eval/cloudflare-watcher";
const CONFIG_FILE = "agents/cloudflare-watcher.yaml";

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function strArray(record: Record<string, unknown>, key: string): string[] {
  const value = record[key];
  return Array.isArray(value) ? value.map(String) : [];
}

function strOrNull(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" ? value : null;
}

function snapshot(record: Record<string, unknown>, prefix: string): DnsSnapshot {
  return {
    ns: strArray(record, `${prefix}_ns`),
    a: strArray(record, `${prefix}_a`),
    wwwA: strArray(record, `${prefix}_www_a`),
    cloudflareZoneStatus: strOrNull(record, `${prefix}_zone_status`),
    capturedAt: "2026-05-27T00:00:00.000Z",
  };
}

function sortedJson(values: string[]): string {
  return JSON.stringify([...values].sort());
}

async function runScenarios(): Promise<string[]> {
  const dir = path.resolve(SCENARIO_DIR);
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".yaml")).sort();
  const failures: string[] = [];

  for (const file of files) {
    const record = asRecord(parseYaml(await fs.readFile(path.join(dir, file), "utf8")));
    if (!record) {
      failures.push(`${file}: not a YAML map`);
      continue;
    }
    const expect = asRecord(record.expect);
    if (!expect) {
      failures.push(`${file}: missing expect`);
      continue;
    }

    const previous = record.has_previous === true ? snapshot(record, "previous") : null;
    const current = snapshot(record, "current");
    const evaluation = diffState(previous, current);
    const alert = decideAlert(evaluation);

    const expectedFindings = Array.isArray(expect.findings) ? expect.findings.map(String) : [];
    const actualFindings = evaluation.changes.map((change) => change.code);

    const problems: string[] = [];
    if (evaluation.changed !== (expect.changed === true)) {
      problems.push(`changed expected ${expect.changed === true}, got ${evaluation.changed}`);
    }
    if (sortedJson(actualFindings) !== sortedJson(expectedFindings)) {
      problems.push(`findings expected ${sortedJson(expectedFindings)}, got ${sortedJson(actualFindings)}`);
    }
    // Alert scenarios must build a valid Telegram payload (send-call reachable).
    if (evaluation.changed && problems.length === 0) {
      const payload = buildTelegramSendPayload("SCENARIO_CHAT", alert.message);
      if (!payload.text || payload.chat_id !== "SCENARIO_CHAT") {
        problems.push("alert path: telegram payload did not build");
      }
    }

    const name = strOrNull(record, "name") ?? file;
    if (problems.length === 0) {
      console.log(`PASS ${name}${evaluation.changed ? " (alert path reached, dry-run payload built)" : ""}`);
    } else {
      failures.push(`${name}: ${problems.join("; ")}`);
      console.error(`FAIL ${name}: ${problems.join("; ")}`);
    }
  }

  return failures;
}

async function runAllowlistChecks(): Promise<string[]> {
  const config = await loadAgentConfig(path.resolve(CONFIG_FILE));
  const cases: Array<{ tool: string; args: Record<string, unknown>; expect: boolean }> = [
    { tool: "shell.exec", args: { command: "dig +short NS patalign.com" }, expect: true },
    { tool: "shell.exec", args: { command: "dig +short A patalign.com" }, expect: true },
    { tool: "shell.exec", args: { command: "dig +short A www.patalign.com" }, expect: true },
    { tool: "cloudflare.read", args: { zone: "patalign.com" }, expect: true },
    { tool: "telegram.send_message", args: {}, expect: true },
    // Blocked — anything outside the allowlist:
    { tool: "shell.exec", args: { command: "rm -rf /" }, expect: false },
    { tool: "shell.exec", args: { command: "dig +short ANY evil.example" }, expect: false },
    { tool: "cloudflare.write", args: { zone: "patalign.com" }, expect: false },
    { tool: "cloudflare.purge_cache", args: {}, expect: false },
    { tool: "telegram.delete_message", args: {}, expect: false },
    { tool: "neon.read", args: { table: "User" }, expect: false },
    { tool: "http_fetch.get", args: { method: "GET", url: "https://example.com" }, expect: false },
  ];

  const failures: string[] = [];
  for (const testCase of cases) {
    const allowed = isToolAllowed(config, testCase.tool, testCase.args);
    const ok = allowed === testCase.expect;
    const label = `${testCase.tool} ${JSON.stringify(testCase.args)} → ${allowed ? "allowed" : "blocked"}`;
    if (ok) {
      console.log(`PASS allowlist: ${label}`);
    } else {
      failures.push(`allowlist: ${label} (expected ${testCase.expect ? "allowed" : "blocked"})`);
      console.error(`FAIL allowlist: ${label} (expected ${testCase.expect ? "allowed" : "blocked"})`);
    }
  }
  return failures;
}

async function main() {
  console.log("— state-diff scenarios —");
  const scenarioFailures = await runScenarios();
  console.log("\n— allowlist_strict (deny-by-default) —");
  const allowlistFailures = await runAllowlistChecks();

  const failures = [...scenarioFailures, ...allowlistFailures];
  console.log(`\ncloudflare-watcher eval: ${failures.length === 0 ? "ALL PASS" : `${failures.length} FAILURE(S)`}`);
  if (failures.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(
    "[agent:eval:cloudflare-watcher] fatal:",
    error instanceof Error ? error.message : String(error)
  );
  process.exit(1);
});
