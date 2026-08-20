import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Supervisor heartbeat (June 10 hardening). The trigger-poll loop records a
 * heartbeat after every cycle that successfully reached the database; if the
 * heartbeat goes silent past the threshold the supervisor raises a Telegram
 * alert. This catches the "process alive, DB auth dead" failure mode (the
 * June 9 17-hour outage): the supervisor kept running, every poll failed
 * silently, and nothing told the operator.
 *
 * The monitor is pure state-machine logic (injected clock) so the alert /
 * re-alert / recovery transitions are unit-testable; the supervisor wires it
 * to the heartbeat file and the Telegram transport.
 */

export const DEFAULT_SILENCE_THRESHOLD_MS = 15 * 60 * 1000; // alert after 15 min silent
export const DEFAULT_REALERT_INTERVAL_MS = 60 * 60 * 1000; // re-alert hourly while silent

export type HeartbeatCheck =
  | { kind: "ok" }
  | { kind: "alert"; silentForMs: number }
  | { kind: "still-silent"; silentForMs: number }
  | { kind: "recovered"; silentForMs: number };

export class HeartbeatMonitor {
  private lastOkAt: number;
  private alerting = false;
  private lastAlertAt = 0;
  private silenceStartedAt = 0;

  constructor(
    nowMs: number,
    private readonly silenceThresholdMs = DEFAULT_SILENCE_THRESHOLD_MS,
    private readonly realertIntervalMs = DEFAULT_REALERT_INTERVAL_MS
  ) {
    // Start "fresh" so a just-restarted supervisor gets a full grace window.
    this.lastOkAt = nowMs;
  }

  /** Call after a poll cycle that successfully reached the database. */
  recordOk(nowMs: number): void {
    this.lastOkAt = nowMs;
  }

  /** Call on a watchdog tick; returns the action the caller should take. */
  check(nowMs: number): HeartbeatCheck {
    const silentForMs = nowMs - this.lastOkAt;

    if (silentForMs <= this.silenceThresholdMs) {
      if (this.alerting) {
        this.alerting = false;
        return { kind: "recovered", silentForMs: this.lastOkAt - this.silenceStartedAt };
      }
      return { kind: "ok" };
    }

    if (!this.alerting) {
      this.alerting = true;
      this.silenceStartedAt = this.lastOkAt;
      this.lastAlertAt = nowMs;
      return { kind: "alert", silentForMs };
    }
    if (nowMs - this.lastAlertAt >= this.realertIntervalMs) {
      this.lastAlertAt = nowMs;
      return { kind: "still-silent", silentForMs };
    }
    return { kind: "ok" };
  }
}

export interface HeartbeatFileShape {
  lastOkPollAt: string;
  pid: number;
  updatedAt: string;
}

/**
 * Repo root, derived from THIS module's location (lib/agents/… → ../..) rather
 * than from `process.cwd()`.
 *
 * The heartbeat path used to be the bare relative "artifacts/agents/…", which
 * silently resolved against whatever directory the process happened to start
 * in. launchd does not run the supervisor from the repo root, so in production
 * the heartbeat was written somewhere else entirely — while every status script
 * and the operator both looked for it in the repo and found a stale file or
 * none. A watchdog whose own output can go missing is worse than no watchdog,
 * because its silence is indistinguishable from health.
 */
const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = path.resolve(MODULE_DIR, "..", "..");

/** Absolute by construction; override with PAT_HEARTBEAT_FILE if ever needed. */
export const HEARTBEAT_FILE =
  process.env.PAT_HEARTBEAT_FILE ??
  path.join(REPO_ROOT, "artifacts", "agents", "supervisor-heartbeat.json");

/** Persist the heartbeat for external inspection (status scripts, future watchdog). */
export async function writeHeartbeatFile(lastOkPollMs: number, file = HEARTBEAT_FILE): Promise<void> {
  const payload: HeartbeatFileShape = {
    lastOkPollAt: new Date(lastOkPollMs).toISOString(),
    pid: process.pid,
    updatedAt: new Date().toISOString(),
  };
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
}

export function formatSilenceDuration(silentForMs: number): string {
  const minutes = Math.round(silentForMs / 60_000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}
