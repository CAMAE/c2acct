// Hello World agent — the Phase 0 trivial test agent. It logs a "thought", runs
// one no-op tool call through the hooks layer, and returns a summary. Running it
// exercises the entire runtime: AgentDefinition sync, AgentRun lifecycle, the
// PreToolUse/canUseTool/PostToolUse hooks, the audit trail, and Neon persistence.
//
// Two ways to run it:
//   - directly:    node --import tsx scripts/agents/hello-world.ts   (one-shot)
//   - via supervisor: registered through register-agents.ts, run on start.
import path from "node:path";
import { pathToFileURL } from "node:url";
import { registerAgent } from "@/lib/agents/registry";
import { runAgentByKey } from "@/lib/agents/sdk";
import type { AgentHandler } from "@/lib/agents/types";
import { loadEnv } from "../_shared/prismaScript";

export const HELLO_WORLD_KEY = "hello-world";

export const helloWorldHandler: AgentHandler = async (ctx) => {
  await ctx.log("hello-world agent starting", { trigger: ctx.trigger });

  const result = await ctx.useTool(
    "noop.log",
    { message: "hello world" },
    async (args) => ({ ok: true, echoed: args.message })
  );

  return {
    summary: `hello-world ran: logged one no-op tool call (${JSON.stringify(result)}) and exited.`,
  };
};

registerAgent(HELLO_WORLD_KEY, helloWorldHandler);

function isDirectCliInvocation(): boolean {
  const entryArg = process.argv[1];
  if (!entryArg) {
    return false;
  }
  return pathToFileURL(path.resolve(entryArg)).href === import.meta.url;
}

if (isDirectCliInvocation()) {
  loadEnv();
  runAgentByKey(HELLO_WORLD_KEY, { trigger: "test", triggerSource: "cli" })
    .then((outcome) => {
      console.log(`[hello-world] run ${outcome.runId} → ${outcome.status}`);
      if (outcome.summary) {
        console.log(`[hello-world] ${outcome.summary}`);
      }
      if (outcome.error) {
        console.error(`[hello-world] ${outcome.error}`);
      }
      process.exit(outcome.status === "completed" ? 0 : 1);
    })
    .catch((error) => {
      console.error("[hello-world] fatal:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
