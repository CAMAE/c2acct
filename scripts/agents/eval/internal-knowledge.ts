// Eval harness for the Internal Knowledge agent (Phase 2 #2). DB-backed — runs
// retrieve() against the indexed corpus (run `pnpm agent:index-knowledge` first).
import { applyRepoEnv } from "@/lib/env/repoEnv";
import { retrieve } from "@/lib/agents/internal-knowledge/retrieve";

/** Eval helper: the same walls the internal-knowledge agent declares. */
const retrieveDocs = (query: string, k: number) =>
  retrieve(query, k, { kinds: ["repo_doc", "dream_state"], roleAccess: [] });

type Check = { name: string; fn: () => Promise<string | null> }; // null = pass, string = failure

const checks: Check[] = [
  {
    name: "query 'Stripe' returns chunks",
    fn: async () => ((await retrieveDocs("Stripe", 5)).length > 0 ? null : "no results"),
  },
  {
    name: "query 'patalign.com DNS' returns chunks",
    fn: async () => ((await retrieveDocs("patalign.com DNS", 5)).length > 0 ? null : "no results"),
  },
  {
    name: "query 'agent system' returns agent docs",
    fn: async () => {
      const r = await retrieveDocs("agent system", 5);
      if (r.length === 0) return "no results";
      return r.some((c) => c.sourcePath.includes("agents") || /agent/i.test(c.text)) ? null : "no agent-related source";
    },
  },
  {
    name: "audit-log substring matches AgentAuditLogEntry text",
    fn: async () => {
      const r = await retrieveDocs("qa-smoke", 10);
      return r.some((c) => c.sourceKind === "audit_log") ? null : "no audit_log chunk matched";
    },
  },
  {
    name: "empty query returns empty result (no error)",
    fn: async () => ((await retrieveDocs("", 5)).length === 0 ? null : "empty query returned results"),
  },
];

async function main() {
  applyRepoEnv();
  let passed = 0;
  const failures: string[] = [];
  for (const check of checks) {
    try {
      const result = await check.fn();
      if (result === null) {
        passed += 1;
        console.log(`PASS ${check.name}`);
      } else {
        failures.push(`${check.name}: ${result}`);
        console.error(`FAIL ${check.name}: ${result}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${check.name}: ${message}`);
      console.error(`FAIL ${check.name}: ${message}`);
    }
  }
  console.log(`\ninternal-knowledge eval: ${passed}/${checks.length} passed.`);
  process.exit(failures.length > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("[agent:eval:internal-knowledge] fatal:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
