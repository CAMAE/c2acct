// Minimal eval harness for the QA + Smoke agent (IMPL-SPEC §0 decision #4:
// minimal at Phase 1, just for QA). Loads the synthetic scenarios under
// agents/eval/qa-smoke/, runs each through the pure evaluator (no network, no
// DB), and asserts drift / findings / alert decision match the fixture. For
// drift scenarios it also builds the Telegram payload to prove the alert
// send-call path is reachable — without actually sending.
import { promises as fs } from "node:fs";
import path from "node:path";
import { parseYaml } from "@/lib/agents/yaml";
import { asRecord } from "@/lib/agents/qa-smoke/probe";
import { decideAlert, evaluate } from "@/lib/agents/qa-smoke/evaluator";
import { buildTelegramSendPayload } from "@/lib/agents/telegram";
import type { Expectations, ProbeResult, RouteId } from "@/lib/agents/qa-smoke/types";

const SCENARIO_DIR = "agents/eval/qa-smoke";

interface Scenario {
  name: string;
  description: string;
  expectations: Expectations;
  probes: ProbeResult[];
  expect: { drift: boolean; shouldAlert: boolean; findings: string[] };
}

function str(record: Record<string, unknown>, key: string): string | null {
  const value = record[key];
  return typeof value === "string" ? value : null;
}

function numOrNull(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];
  return typeof value === "number" ? value : null;
}

function boolOrNull(record: Record<string, unknown>, key: string): boolean | null {
  const value = record[key];
  return typeof value === "boolean" ? value : null;
}

function toProbe(raw: unknown): ProbeResult {
  const record = asRecord(raw);
  if (!record) {
    throw new Error("scenario probe is not a map");
  }
  const route = str(record, "route") as RouteId | null;
  if (route !== "sign-in" && route !== "health-db" && route !== "release-fingerprint") {
    throw new Error(`scenario probe has invalid route: ${String(record.route)}`);
  }
  return {
    route,
    url: str(record, "url") ?? `https://scenario.test/${route}`,
    status: numOrNull(record, "status"),
    ok: boolOrNull(record, "ok"),
    githubButtonPresent: boolOrNull(record, "github_button_present"),
    fingerprintPresent: boolOrNull(record, "fingerprint_present"),
    commitShort: str(record, "commit_short"),
    releaseId: str(record, "release_id"),
    releaseHeaderMatches: boolOrNull(record, "release_header_matches"),
    error: str(record, "error"),
  };
}

function toScenario(raw: unknown, file: string): Scenario {
  const record = asRecord(raw);
  if (!record) {
    throw new Error(`${file}: not a YAML map`);
  }
  const probesRaw = record.probes;
  if (!Array.isArray(probesRaw)) {
    throw new Error(`${file}: missing probes[]`);
  }
  const expect = asRecord(record.expect);
  if (!expect) {
    throw new Error(`${file}: missing expect`);
  }
  const findings = Array.isArray(expect.findings) ? expect.findings.map(String) : [];

  return {
    name: str(record, "name") ?? file,
    description: str(record, "description") ?? "",
    expectations: {
      expectedCommit: str(record, "expected_commit"),
      signInGithubButtonAllowed: record.github_button_allowed === true,
    },
    probes: probesRaw.map(toProbe),
    expect: {
      drift: expect.drift === true,
      shouldAlert: expect.should_alert === true,
      findings,
    },
  };
}

function sortedJson(values: string[]): string {
  return JSON.stringify([...values].sort());
}

async function main() {
  const dir = path.resolve(SCENARIO_DIR);
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".yaml")).sort();

  let passed = 0;
  const failures: string[] = [];

  for (const file of files) {
    const raw = await fs.readFile(path.join(dir, file), "utf8");
    const scenario = toScenario(parseYaml(raw), file);

    const evaluation = evaluate(scenario.probes, scenario.expectations);
    const alert = decideAlert(evaluation);
    const actualFindings = evaluation.findings.map((f) => f.code);

    const problems: string[] = [];
    if (evaluation.drift !== scenario.expect.drift) {
      problems.push(`drift expected ${scenario.expect.drift}, got ${evaluation.drift}`);
    }
    if (alert.shouldAlert !== scenario.expect.shouldAlert) {
      problems.push(`shouldAlert expected ${scenario.expect.shouldAlert}, got ${alert.shouldAlert}`);
    }
    if (sortedJson(actualFindings) !== sortedJson(scenario.expect.findings)) {
      problems.push(
        `findings expected ${sortedJson(scenario.expect.findings)}, got ${sortedJson(actualFindings)}`
      );
    }

    // For drift scenarios, prove the alert send-call path is reachable: a valid
    // Telegram payload is built from the alert message (no network send).
    if (scenario.expect.shouldAlert && problems.length === 0) {
      const payload = buildTelegramSendPayload("SCENARIO_CHAT", alert.message);
      if (!payload.text || payload.text.length === 0 || payload.chat_id !== "SCENARIO_CHAT") {
        problems.push("alert path: telegram payload did not build");
      }
    }

    if (problems.length === 0) {
      passed += 1;
      const note = scenario.expect.shouldAlert ? " (alert path reached, dry-run payload built)" : "";
      console.log(`PASS ${scenario.name}${note}`);
    } else {
      failures.push(`${scenario.name}: ${problems.join("; ")}`);
      console.error(`FAIL ${scenario.name}: ${problems.join("; ")}`);
    }
  }

  console.log(`\nqa-smoke eval: ${passed}/${files.length} scenarios passed.`);
  if (failures.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("[agent:eval:qa-smoke] fatal:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
