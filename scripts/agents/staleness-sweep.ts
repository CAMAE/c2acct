// Staleness-sweep agent (16b) — the scheduled runner for evidence-freshness
// alerts. Gates on PAT_ENABLE_STALENESS_ALERTS (+ PAT_ENABLE_PINGS), gathers the
// newest assessment date per firm/vendor, and for each recipient decides — via
// the send-ledger — whether an Aging/Stale crossing earns one change-triggered
// nudge. Writes through the B1 store (preference + dedupe gated). No LLM; the
// agent layer is just cron + run logging + the shared audit trail + heartbeat.
//
// Two ways to run it:
//   - directly:       node --import tsx scripts/agents/staleness-sweep.ts
//   - via supervisor: registered through register-agents.ts, run on the cron.
import path from "node:path";
import { pathToFileURL } from "node:url";
import { registerAgent } from "@/lib/agents/registry";
import { runAgentByKey } from "@/lib/agents/sdk";
import type { AgentHandler } from "@/lib/agents/types";
import { runStalenessSweep } from "@/lib/notifications/staleness/runStalenessSweep";
import { loadEnv } from "../_shared/prismaScript";

export const STALENESS_SWEEP_KEY = "staleness-sweep";

export const stalenessSweepHandler: AgentHandler = async (ctx) => {
  await ctx.log("staleness-sweep starting", { trigger: ctx.trigger });

  const summary = await runStalenessSweep();

  if (!summary.enabled) {
    await ctx.log("staleness-sweep skipped — PAT_ENABLE_STALENESS_ALERTS is off", {});
    return { summary: "staleness-sweep no-op: PAT_ENABLE_STALENESS_ALERTS is off." };
  }

  await ctx.log("staleness-sweep complete", {
    companiesScanned: summary.companiesScanned,
    evaluated: summary.evaluated,
    fired: summary.fired,
    created: summary.created,
    suppressed: summary.suppressed,
  });

  return {
    summary:
      `staleness-sweep: scanned ${summary.companiesScanned} compan(ies), evaluated ${summary.evaluated} ` +
      `recipient-item(s), fired ${summary.fired}; created ${summary.created} nudge(s) ` +
      `(${summary.suppressed} suppressed by ledger/dedupe).`,
  };
};

registerAgent(STALENESS_SWEEP_KEY, stalenessSweepHandler);

function isDirectCliInvocation(): boolean {
  const entryArg = process.argv[1];
  if (!entryArg) {
    return false;
  }
  return pathToFileURL(path.resolve(entryArg)).href === import.meta.url;
}

if (isDirectCliInvocation()) {
  loadEnv();
  runAgentByKey(STALENESS_SWEEP_KEY, { trigger: "test", triggerSource: "cli" })
    .then((outcome) => {
      console.log(`[staleness-sweep] run ${outcome.runId} → ${outcome.status}`);
      if (outcome.summary) {
        console.log(`[staleness-sweep] ${outcome.summary}`);
      }
      if (outcome.error) {
        console.error(`[staleness-sweep] ${outcome.error}`);
      }
      process.exit(outcome.status === "completed" ? 0 : 1);
    })
    .catch((error) => {
      console.error("[staleness-sweep] fatal:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    });
}
