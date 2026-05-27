// Generic manual agent runner: `pnpm agent:run <agent-key>`.
// Runs one invocation of an agent outside the supervisor's cron loop. Used for
// manual smoke runs and verification. Imports register-agents so every handler
// is available before dispatch.
import "./register-agents";
import { runAgentByKey } from "@/lib/agents/sdk";
import { loadEnv } from "../_shared/prismaScript";

async function main() {
  loadEnv();

  const key = process.argv[2];
  if (!key) {
    console.error("usage: pnpm agent:run <agent-key>");
    process.exit(2);
    return;
  }

  const outcome = await runAgentByKey(key, { trigger: "manual", triggerSource: "agent:run" });
  console.log(`[agent:run] ${key} run ${outcome.runId} → ${outcome.status}`);
  if (outcome.summary) {
    console.log(`[agent:run] ${outcome.summary}`);
  }
  if (outcome.error) {
    console.error(`[agent:run] ${outcome.error}`);
  }
  process.exit(outcome.status === "completed" ? 0 : 1);
}

main().catch((error) => {
  console.error("[agent:run] fatal:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
