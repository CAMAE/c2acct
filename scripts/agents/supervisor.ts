#!/usr/bin/env node
// Patalign agent supervisor. Long-lived process managed by launchd
// (ops/launchd/com.patalign.agent-supervisor.plist). Loads agent configs from
// agents/*.yaml, registers each on its schedule, and runs them through the
// shared runtime. All actions are logged via the hooks layer to Neon.
//
// Phase 0: only hello-world is enabled (manual + run_on_start), so the
// supervisor runs it once on start, then idles. Phase 1 adds the cron-driven
// QA / Pilot Ops / Cloudflare agents.
import { loadAgentConfigs } from "@/lib/agents/config";
import { Scheduler } from "@/lib/agents/scheduler";
import { runAgent } from "@/lib/agents/sdk";
import { auditLog } from "@/lib/agents/audit";
import { onShutdown } from "@/lib/agents/lifecycle";
import { loadEnv } from "../_shared/prismaScript";
import "./register-agents";

const AGENTS_DIR = "agents";
const HEARTBEAT_MS = 60_000;

async function main() {
  loadEnv();

  const configs = await loadAgentConfigs(AGENTS_DIR);
  const enabled = configs.filter((config) => config.enabled);
  console.log(
    `[supervisor] loaded ${enabled.length} enabled agent(s): ${enabled.map((config) => config.key).join(", ") || "(none)"}`
  );

  const scheduler = new Scheduler();
  for (const config of enabled) {
    scheduler.register(config, async (trigger) => {
      try {
        const outcome = await runAgent(config, { trigger, triggerSource: "supervisor" });
        console.log(`[supervisor] ${config.key} run ${outcome.runId} → ${outcome.status}`);
      } catch (error) {
        await auditLog({
          agentKey: config.key,
          hookPhase: "agent_message",
          payload: { error: error instanceof Error ? error.message : String(error) },
          outcome: "error",
        });
        console.error(`[supervisor] ${config.key} failed to start a run:`, error);
      }
    });
  }

  scheduler.start();

  // Keep the event loop alive even when every agent is manual-cadence, and emit
  // an hourly liveness line into the launchd log.
  let heartbeats = 0;
  const heartbeat = setInterval(() => {
    heartbeats += 1;
    if (heartbeats % 60 === 0) {
      console.log(`[supervisor] alive — ${heartbeats} min`);
    }
  }, HEARTBEAT_MS);

  console.log("[supervisor] started. Ctrl+C / SIGTERM to exit.");

  onShutdown(async () => {
    console.log("[supervisor] graceful shutdown…");
    clearInterval(heartbeat);
    await scheduler.stop();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("[supervisor] fatal:", error);
  process.exit(1);
});
