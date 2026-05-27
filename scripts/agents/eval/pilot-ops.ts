// Minimal eval harness for the Pilot Ops agent (Phase 1b). Pure: no network/DB.
//   kind: health     — feed member snapshots → computeHealth → assert tiers + alert.
//   kind: invitation — buildInvitationDraft + resolveInvitationAction(decision) →
//                      assert executed + final subject (approve/deny/edit).
import { promises as fs } from "node:fs";
import path from "node:path";
import { parseYaml } from "@/lib/agents/yaml";
import { computeHealth, healthHasAlert } from "@/lib/agents/pilot-ops/health";
import { buildInvitationDraft, resolveInvitationAction } from "@/lib/agents/pilot-ops/invitation";
import type { PilotMemberSnapshot, ProvisioningState } from "@/lib/agents/pilot-ops/types";

const SCENARIO_DIR = "agents/eval/pilot-ops";

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}
function num(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  return typeof value === "number" ? value : 0;
}
function str(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === "string" ? value : "";
}

function evalHealth(record: Record<string, unknown>, expect: Record<string, unknown>): string[] {
  const rawMembers = Array.isArray(record.members) ? record.members : [];
  const members: PilotMemberSnapshot[] = rawMembers.map((raw, index) => {
    const m = asRecord(raw) ?? {};
    return {
      id: `m${index}`,
      kind: "FIRM",
      provisioningState: str(m, "state") as ProvisioningState,
      createdAtMs: num(m, "created_ms"),
      displayName: str(m, "name") || `m${index}`,
    };
  });
  const summary = computeHealth(members, num(record, "now_ms"), num(record, "stalled_threshold_days") || 7);
  const alert = healthHasAlert(summary);

  const problems: string[] = [];
  if (alert !== (expect.alert === true)) problems.push(`alert expected ${expect.alert === true}, got ${alert}`);
  for (const key of ["active", "provisioning", "invited", "stalled", "blocked"] as const) {
    if (expect[key] !== undefined && summary[key] !== num(expect, key)) {
      problems.push(`${key} expected ${num(expect, key)}, got ${summary[key]}`);
    }
  }
  return problems;
}

function evalInvitation(record: Record<string, unknown>, expect: Record<string, unknown>): string[] {
  const draft = buildInvitationDraft(str(record, "firm"), str(record, "to"));
  const outcome = str(record, "decision") as "approved" | "denied" | "edited" | "timeout";
  const editedArgs = record.edited_subject ? { subject: str(record, "edited_subject") } : undefined;
  const action = resolveInvitationAction(draft, { outcome, editedArgs });

  const problems: string[] = [];
  if (action.executed !== (expect.executed === true)) {
    problems.push(`executed expected ${expect.executed === true}, got ${action.executed}`);
  }
  if (typeof expect.subject === "string" && action.draft?.subject !== expect.subject) {
    problems.push(`subject expected "${expect.subject}", got "${action.draft?.subject ?? ""}"`);
  }
  return problems;
}

async function main() {
  const dir = path.resolve(SCENARIO_DIR);
  const files = (await fs.readdir(dir)).filter((f) => f.endsWith(".yaml")).sort();
  const failures: string[] = [];

  for (const file of files) {
    const record = asRecord(parseYaml(await fs.readFile(path.join(dir, file), "utf8")));
    const expect = record ? asRecord(record.expect) : null;
    if (!record || !expect) {
      failures.push(`${file}: malformed`);
      continue;
    }
    const name = str(record, "name") || file;
    const problems = str(record, "kind") === "invitation" ? evalInvitation(record, expect) : evalHealth(record, expect);

    if (problems.length === 0) {
      console.log(`PASS ${name}`);
    } else {
      failures.push(`${name}: ${problems.join("; ")}`);
      console.error(`FAIL ${name}: ${problems.join("; ")}`);
    }
  }

  console.log(`\npilot-ops eval: ${failures.length === 0 ? "ALL PASS" : `${failures.length} FAILURE(S)`}`);
  if (failures.length > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("[agent:eval:pilot-ops] fatal:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
