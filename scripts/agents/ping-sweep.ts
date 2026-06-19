// Ping-sweep agent — the scheduled runner for the automated notification system.
// It gates on PAT_ENABLE_PINGS, gathers DB facts, runs the pure planner, and
// writes reminders/escalations through the B1 store (preference + dedupe gated).
// No LLM: the "should we ping?" decision is the deterministic backbone (see
// lib/notifications/triggers.ts); the agent layer is just cron + run logging.
//
// Two ways to run it:
//   - directly:       node --import tsx scripts/agents/ping-sweep.ts   (one-shot)
//   - via supervisor: registered through register-agents.ts, run on the cron.
import path from "node:path";
import { pathToFileURL } from "node:url";
import { registerAgent } from "@/lib/agents/registry";
import { runAgentByKey } from "@/lib/agents/sdk";
import type { AgentHandler } from "@/lib/agents/types";
import { runPingSweep } from "@/lib/notifications/runSweep";
import { loadEnv } from "../_shared/prismaScript";

export const PING_SWEEP_KEY = "ping-sweep";

export const pingSweepHandler: AgentHandler = async (ctx) => {
  await ctx.log("ping-sweep starting", { trigger: ctx.trigger });

  const summary = await runPingSweep();

  if (!summary.enabled) {
    await ctx.log("ping-sweep skipped — PAT_ENABLE_PINGS is off", {});
    return { summary: "ping-sweep no-op: PAT_ENABLE_PINGS is off." };
  }

  await ctx.log("ping-sweep complete", {
    evaluated: summary.evaluated,
    fired: summary.fired,
    escalated: summary.escalated,
    created: summary.created,
    suppressed: summary.suppressed,
  });

  return {
    summary:
      `ping-sweep: evaluated ${summary.evaluated} target(s), fired ${summary.fired}, ` +
      `escalated ${summary.escalated}; created ${summary.created} of ${summary.total} planned ` +
      `(${summary.suppressed} suppressed by preference/dedupe).`,
  };
};

registerAgent(PING_SWEEP_KEY, pingSweepHandler);

function isDirectCliInvocation(): boolean {
  const entryArg = process.argv[1];
  if (!entryArg) {
    return false;
  }
  return pathToFileURL(path.resolve(entryArg)).href === import.meta.url;
}

if (isDirectCliInvocation()) {
  loadEnv();
  runAgentByKey(PING_SWEEP_KEY, { trigger: "test", triggerSource: "cli" })
    .then((outcome) => {
      console.log(`[ping-sweep] run ${outcome.runId} → ${outcome.status}`);
      if (outcome.summary) {
        console.log(`[ping-sweep] ${outcome.summary}`);
      }
      if (outcome.error) {
        console.error(`[ping-sweep] ${outcome.error}`);
      }
      process.exit(outcome.status === "completed" ? 0 : 1);
    })
    .catch((error) => {
      console.error("[ping-sweep] fatal:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
