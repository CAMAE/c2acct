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
import { claimNextTrigger, completeTrigger, failTrigger } from "@/lib/agents/triggerQueue";
import {
  DEFAULT_REALERT_INTERVAL_MS,
  DEFAULT_SILENCE_THRESHOLD_MS,
  formatSilenceDuration,
  HeartbeatMonitor,
  writeHeartbeatFile,
} from "@/lib/agents/heartbeat";
import { anthropicApiKeyPresent, llmBackedAgentKeys } from "@/lib/agents/llm";
import { buildTelegramSendPayload, sendTelegramMessage } from "@/lib/agents/telegram";
import type { AgentConfig } from "@/lib/agents/config";
import { loadEnv } from "../_shared/prismaScript";
import "./register-agents";

const AGENTS_DIR = "agents";
const HEARTBEAT_MS = 60_000;
// Trigger-queue poll cadence (Phase 2.5 #5). 5s default keeps the /admin
// command bar feeling responsive without hammering Neon.
const TRIGGER_POLL_MS = Number(process.env.PAT_TRIGGER_POLL_MS ?? 5_000);
// Heartbeat silence alerting (June 10): alert after 15 min without a successful
// DB poll, re-alert hourly while still silent.
const HEARTBEAT_ALERT_AFTER_MS = Number(process.env.PAT_HEARTBEAT_ALERT_AFTER_MS ?? DEFAULT_SILENCE_THRESHOLD_MS);
const HEARTBEAT_REALERT_MS = Number(process.env.PAT_HEARTBEAT_REALERT_MS ?? DEFAULT_REALERT_INTERVAL_MS);

/** Telegram does not depend on the database, so alerts still go out when Neon auth is broken. */
async function sendHeartbeatTelegram(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ALLOWED_CHAT_ID;
  if (!token || !chatId) {
    console.error("[supervisor] heartbeat alert NOT sent (telegram env missing):", text);
    return;
  }
  const result = await sendTelegramMessage(token, buildTelegramSendPayload(chatId, text));
  if (!result.sent) {
    console.error(`[supervisor] heartbeat alert send failed (${result.reason ?? result.status}):`, text);
  }
}

/**
 * Run one claimed trigger from the production queue. Per-run env overrides
 * (PAT_PILOT_TASK / PAT_KNOWLEDGE_QUERY / …) are applied to process.env for
 * the duration of the run and restored after — safe because triggers are
 * processed strictly one at a time by the poll loop.
 */
async function runClaimedTrigger(
  configsByKey: Map<string, AgentConfig>,
  trigger: NonNullable<Awaited<ReturnType<typeof claimNextTrigger>>>
): Promise<void> {
  const config = configsByKey.get(trigger.agentKey);
  if (!config) {
    await failTrigger(trigger.id, `agent "${trigger.agentKey}" is not loaded/enabled on this supervisor`);
    return;
  }

  const previousEnv = new Map<string, string | undefined>();
  for (const [key, value] of Object.entries(trigger.taskEnv)) {
    previousEnv.set(key, process.env[key]);
    process.env[key] = value;
  }

  try {
    const outcome = await runAgent(config, {
      trigger: "manual",
      triggerSource: trigger.requestedBy ? `admin-command:${trigger.requestedBy}` : "admin-command",
    });
    console.log(`[supervisor] trigger ${trigger.id} → ${config.key} run ${outcome.runId} → ${outcome.status}`);
    if (outcome.status === "completed" || outcome.status === "awaiting_approval") {
      await completeTrigger(trigger.id, outcome.runId);
    } else {
      await failTrigger(trigger.id, outcome.error ?? `run ended with status ${outcome.status}`, outcome.runId);
    }
  } catch (error) {
    const messageText = error instanceof Error ? error.message : String(error);
    await failTrigger(trigger.id, messageText);
    await auditLog({
      agentKey: trigger.agentKey,
      hookPhase: "agent_message",
      payload: { error: messageText, triggerId: trigger.id },
      outcome: "error",
    });
    console.error(`[supervisor] trigger ${trigger.id} (${trigger.agentKey}) failed:`, error);
  } finally {
    for (const [key, value] of previousEnv) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

async function main() {
  loadEnv();

  const configs = await loadAgentConfigs(AGENTS_DIR);
  const enabled = configs.filter((config) => config.enabled);
  console.log(
    `[supervisor] loaded ${enabled.length} enabled agent(s): ${enabled.map((config) => config.key).join(", ") || "(none)"}`
  );

  // Presence-only — the key VALUE must never be logged or persisted anywhere.
  const llmKeys = llmBackedAgentKeys(enabled);
  console.log(
    `[supervisor] ANTHROPIC_API_KEY ${anthropicApiKeyPresent() ? "present" : "absent"}; LLM-backed agents: ${llmKeys.join(", ") || "(none)"}`
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

  // Production trigger queue (Phase 2.5 #5): poll Neon for /admin command-bar
  // triggers and run them one at a time. A simple busy-flag prevents
  // overlapping runs; claims are conditional so nothing runs twice.
  const configsByKey = new Map(enabled.map((config) => [config.key, config]));
  const monitor = new HeartbeatMonitor(Date.now(), HEARTBEAT_ALERT_AFTER_MS, HEARTBEAT_REALERT_MS);
  let triggerBusy = false;
  const triggerPoll = setInterval(() => {
    if (triggerBusy) {
      // A running trigger (possibly hours blocked on an approval card) is a
      // healthy supervisor, not a silent one. If the DB dies mid-run the run
      // errors out, busy clears, and the failing polls surface the silence.
      monitor.recordOk(Date.now());
      return;
    }
    triggerBusy = true;
    void (async () => {
      let cycleOk = false;
      try {
        let claimed = await claimNextTrigger();
        cycleOk = true; // the poll reached the database (empty queue still counts)
        while (claimed) {
          console.log(`[supervisor] claimed trigger ${claimed.id} → ${claimed.agentKey}`);
          await runClaimedTrigger(configsByKey, claimed);
          claimed = await claimNextTrigger();
        }
      } catch (error) {
        console.error("[supervisor] trigger poll failed:", error);
      } finally {
        triggerBusy = false;
      }
      if (cycleOk) {
        const now = Date.now();
        monitor.recordOk(now);
        await writeHeartbeatFile(now).catch((error) => {
          console.error("[supervisor] heartbeat file write failed:", error);
        });
      }
    })();
  }, TRIGGER_POLL_MS);

  // Keep the event loop alive even when every agent is manual-cadence, emit an
  // hourly liveness line into the launchd log, and watchdog the trigger-poll
  // heartbeat — silent DB failures (June 9 outage) raise a Telegram alert.
  let heartbeats = 0;
  const heartbeat = setInterval(() => {
    heartbeats += 1;
    if (heartbeats % 60 === 0) {
      console.log(`[supervisor] alive — ${heartbeats} min`);
    }

    const verdict = monitor.check(Date.now());
    if (verdict.kind === "alert" || verdict.kind === "still-silent") {
      const duration = formatSilenceDuration(verdict.silentForMs);
      console.error(`[supervisor] heartbeat silent for ${duration} — trigger polls are not reaching the database.`);
      void sendHeartbeatTelegram(
        [
          `🚨 SUPERVISOR HEARTBEAT SILENT (${duration})`,
          "The agent supervisor process is alive but trigger polls have not reached the database.",
          "Likely causes: Neon credential rotation / DB auth failure / network. Check the supervisor log and DATABASE_URL on the Mac mini.",
        ].join("\n")
      );
    } else if (verdict.kind === "recovered") {
      const duration = formatSilenceDuration(verdict.silentForMs);
      console.log(`[supervisor] heartbeat recovered after ${duration} of silence.`);
      void sendHeartbeatTelegram(`✅ Supervisor heartbeat recovered — database polls succeeding again (was silent ${duration}).`);
    }
  }, HEARTBEAT_MS);

  console.log(`[supervisor] started (trigger poll every ${TRIGGER_POLL_MS}ms). Ctrl+C / SIGTERM to exit.`);

  onShutdown(async () => {
    console.log("[supervisor] graceful shutdown…");
    clearInterval(heartbeat);
    clearInterval(triggerPoll);
    await scheduler.stop();
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("[supervisor] fatal:", error);
  process.exit(1);
});
