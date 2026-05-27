import type { AgentConfig } from "./config";
import type { RunTrigger } from "./types";
import { cronMatches } from "./cron";

export type ScheduledTask = (trigger: RunTrigger) => Promise<void>;

interface Registration {
  config: AgentConfig;
  task: ScheduledTask;
  lastCronMinute?: string;
}

const CRON_TICK_MS = 30_000;

/**
 * Cadence manager for the supervisor. Supported schedule types:
 *   - `manual`   — never fires on a clock; runs once at start iff `run_on_start`.
 *   - `interval` — fires every `every_seconds` (+ optional `run_on_start`).
 *   - `cron`     — fires when the 5-field expression matches local time
 *                  (e.g. QA `0 * * * *`). A single ticker checks every cron
 *                  registration each 30s, deduped per wall-clock minute.
 */
export class Scheduler {
  private readonly registrations: Registration[] = [];
  private readonly timers: ReturnType<typeof setInterval>[] = [];
  private cronTicker: ReturnType<typeof setInterval> | null = null;

  register(config: AgentConfig, task: ScheduledTask): void {
    this.registrations.push({ config, task });
  }

  start(): void {
    let hasCron = false;

    for (const registration of this.registrations) {
      const { schedule } = registration.config;

      if (schedule.run_on_start) {
        void this.fire(registration, "scheduled");
      }

      if (schedule.type === "interval" && schedule.every_seconds) {
        const timer = setInterval(() => {
          void this.fire(registration, "scheduled");
        }, schedule.every_seconds * 1000);
        this.timers.push(timer);
      } else if (schedule.type === "cron") {
        hasCron = true;
        console.log(
          `[scheduler] ${registration.config.key}: cron "${schedule.expression ?? "?"}" registered.`
        );
      }
    }

    if (hasCron) {
      this.cronTicker = setInterval(() => this.checkCron(), CRON_TICK_MS);
    }
  }

  async stop(): Promise<void> {
    for (const timer of this.timers) {
      clearInterval(timer);
    }
    this.timers.length = 0;
    if (this.cronTicker) {
      clearInterval(this.cronTicker);
      this.cronTicker = null;
    }
  }

  private checkCron(): void {
    const now = new Date();
    const minuteKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}T${now.getHours()}:${now.getMinutes()}`;

    for (const registration of this.registrations) {
      const { schedule } = registration.config;
      if (schedule.type !== "cron" || !schedule.expression) {
        continue;
      }
      if (registration.lastCronMinute === minuteKey) {
        continue; // already fired this wall-clock minute
      }
      if (cronMatches(schedule.expression, now)) {
        registration.lastCronMinute = minuteKey;
        void this.fire(registration, "scheduled");
      }
    }
  }

  private async fire(registration: Registration, trigger: RunTrigger): Promise<void> {
    const jitterMs = (registration.config.schedule.jitter_seconds ?? 0) * 1000 * Math.random();
    if (jitterMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, jitterMs));
    }
    try {
      await registration.task(trigger);
    } catch (error) {
      console.error(`[scheduler] ${registration.config.key} task error:`, error);
    }
  }
}
