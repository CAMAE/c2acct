import type { AgentConfig } from "./config";
import type { RunTrigger } from "./types";

export type ScheduledTask = (trigger: RunTrigger) => Promise<void>;

interface Registration {
  config: AgentConfig;
  task: ScheduledTask;
}

/**
 * Cadence manager for the supervisor.
 *
 * Phase 0 supports two schedule types fully:
 *   - `manual`   — never fires on a clock; runs once at start iff `run_on_start`.
 *   - `interval` — fires every `every_seconds` (+ optional `run_on_start`).
 *
 * `cron` is registered but not yet driven on a clock — cron cadence (the QA /
 * Pilot Ops / Cloudflare agents) lands in Phase 1. A cron-scheduled agent still
 * runs on start if `run_on_start` is set, and can always be triggered manually.
 */
export class Scheduler {
  private readonly registrations: Registration[] = [];
  private readonly timers: ReturnType<typeof setInterval>[] = [];

  register(config: AgentConfig, task: ScheduledTask): void {
    this.registrations.push({ config, task });
  }

  start(): void {
    for (const registration of this.registrations) {
      const { config } = registration;
      const { schedule } = config;

      if (schedule.run_on_start) {
        void this.fire(registration, "scheduled");
      }

      if (schedule.type === "interval" && schedule.every_seconds) {
        const timer = setInterval(() => {
          void this.fire(registration, "scheduled");
        }, schedule.every_seconds * 1000);
        this.timers.push(timer);
      } else if (schedule.type === "cron") {
        console.log(
          `[scheduler] ${config.key}: cron "${schedule.expression ?? "?"}" registered; cron cadence wiring lands in Phase 1.`
        );
      }
    }
  }

  async stop(): Promise<void> {
    for (const timer of this.timers) {
      clearInterval(timer);
    }
    this.timers.length = 0;
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
