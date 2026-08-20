import type { AgentConfig } from "./config";
import type { RunTrigger } from "./types";
import { cronMatches } from "./cron";

export type ScheduledTask = (trigger: RunTrigger) => Promise<void>;

/**
 * Consulted before every scheduled fire. Returning `allowed: false` skips the
 * run (and says why). The supervisor supplies one that enforces the global
 * daily cost cap (S3) and the per-agent circuit breaker (S4); keeping it
 * injected leaves the Scheduler pure and unit-testable.
 */
export type ScheduleGate = (config: AgentConfig) => Promise<{ allowed: boolean; reason?: string }>;

export interface SchedulerOptions {
  gate?: ScheduleGate;
  /** Agent keys already running when the supervisor started (orphan sweep seed). */
  initiallyRunning?: Iterable<string>;
  onSkip?: (agentKey: string, reason: string) => void;
}

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
  /**
   * Agents with a fire in flight. An agent whose run outlasts its own cadence
   * (a 5-minute QA sweep on a 1-minute interval) must not be started again on
   * top of itself — previously every tick stacked another concurrent run, which
   * is how one slow agent turned into a pile of duplicate work and duplicate
   * side effects.
   */
  private readonly inFlight = new Set<string>();
  private readonly gate?: ScheduleGate;
  private readonly onSkip: (agentKey: string, reason: string) => void;

  constructor(options: SchedulerOptions = {}) {
    this.gate = options.gate;
    this.onSkip =
      options.onSkip ?? ((agentKey, reason) => console.warn(`[scheduler] ${agentKey} skipped: ${reason}`));
    for (const key of options.initiallyRunning ?? []) {
      this.inFlight.add(key);
    }
  }

  register(config: AgentConfig, task: ScheduledTask): void {
    this.registrations.push({ config, task });
  }

  /** Test/ops seam: which agents the scheduler currently believes are running. */
  runningAgents(): string[] {
    return [...this.inFlight];
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
    const key = registration.config.key;

    // Claim the slot BEFORE the jitter sleep. Claiming after it would leave a
    // window in which a second tick sails through the guard.
    if (this.inFlight.has(key)) {
      this.onSkip(key, "previous run still in flight (overlap guard)");
      return;
    }
    this.inFlight.add(key);

    try {
      const jitterMs = (registration.config.schedule.jitter_seconds ?? 0) * 1000 * Math.random();
      if (jitterMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, jitterMs));
      }

      if (this.gate) {
        const verdict = await this.gate(registration.config);
        if (!verdict.allowed) {
          this.onSkip(key, verdict.reason ?? "blocked by schedule gate");
          return;
        }
      }

      await registration.task(trigger);
    } catch (error) {
      // PII hygiene (B12): log the message only, never the raw error object
      // (stack/cause can carry request bodies, tokens, or PII from upstream).
      console.error(
        `[scheduler] ${key} task error: ${error instanceof Error ? error.message : String(error)}`
      );
    } finally {
      this.inFlight.delete(key);
    }
  }
}
