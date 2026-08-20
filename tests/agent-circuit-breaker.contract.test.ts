import { beforeEach, describe, expect, it, vi } from "vitest";
import { emptyDb, fakePrismaModule, type FakeDb } from "./helpers/agentPrismaFake";
import type { AgentConfig } from "@/lib/agents/config";

/**
 * Per-agent circuit breaker (S4).
 *
 * `limits.circuit_breaker` sat in the config schema — and in qa-smoke.yaml —
 * validated by zod and read by nothing. An agent whose dependency was down
 * retried on its cadence forever, burning budget and filling the audit log with
 * identical failures.
 *
 * State is derived from AgentRun history rather than stored, so it can never
 * drift from what an operator sees in /admin. These tests walk the full cycle:
 * closed → open → cooling → half-open probe → closed (or re-open).
 */

const state = vi.hoisted(() => ({ db: null as unknown as FakeDb }));
state.db = emptyDb();
vi.mock("@/lib/prisma", () => fakePrismaModule(state.db));

function makeConfig(consecutive = 3, cooldownMinutes = 30): AgentConfig {
  return {
    key: "flaky-agent",
    name: "Flaky Agent",
    vertical_id: "accounting",
    enabled: true,
    schedule: { type: "cron", expression: "0 * * * *", jitter_seconds: 0, run_on_start: false },
    limits: {
      max_turns: 25,
      max_budget_usd: 1,
      max_runtime_seconds: 180,
      circuit_breaker: { consecutive_failures: consecutive, cooldown_minutes: cooldownMinutes },
    },
    tools: [],
  } as AgentConfig;
}

const MINUTE = 60 * 1000;
const T0 = new Date("2026-08-20T12:00:00Z");

/** Append a terminal run to the fake history. */
function pushRun(status: string, minutesAgo: number, agentKey = "flaky-agent") {
  state.db.runs.push({
    id: `run-${state.db.runs.length}`,
    agentKey,
    status,
    startedAt: new Date(T0.getTime() - minutesAgo * MINUTE),
  });
}

beforeEach(() => {
  for (const rows of Object.values(state.db)) {
    rows.length = 0;
  }
});

describe("breaker-opens-and-half-opens", () => {
  it("stays closed below the threshold", async () => {
    const { checkBreaker } = await import("@/lib/agents/circuitBreaker");
    pushRun("failed", 30);
    pushRun("failed", 20);

    const verdict = await checkBreaker(makeConfig(3), T0);
    expect(verdict.state).toBe("closed");
    expect(verdict.allowed).toBe(true);
    expect(verdict.consecutiveFailures).toBe(2);
  });

  it("a success breaks the streak, however many failures came before it", async () => {
    const { checkBreaker } = await import("@/lib/agents/circuitBreaker");
    pushRun("failed", 50);
    pushRun("failed", 40);
    pushRun("failed", 30);
    pushRun("completed", 20); // most recent
    const verdict = await checkBreaker(makeConfig(3), T0);
    expect(verdict.state).toBe("closed");
    expect(verdict.consecutiveFailures).toBe(0);
  });

  it("opens on N consecutive failures and writes a circuit_open marker run", async () => {
    const { checkBreaker } = await import("@/lib/agents/circuitBreaker");
    pushRun("failed", 30);
    pushRun("timeout", 20); // mixed failure kinds all count
    pushRun("budget_exceeded", 10);

    const verdict = await checkBreaker(makeConfig(3, 30), T0);
    expect(verdict.state).toBe("open");
    expect(verdict.allowed).toBe(false);
    expect(verdict.consecutiveFailures).toBe(3);

    // The marker is what /admin renders, and the cooldown clock.
    const markers = state.db.runs.filter((row) => row.status === "circuit_open");
    expect(markers).toHaveLength(1);
    expect(markers[0].agentKey).toBe("flaky-agent");
    expect(markers[0].triggerSource).toBe("circuit-breaker");
    expect(verdict.retryAt).toEqual(new Date(T0.getTime() + 30 * MINUTE));
  });

  it("stays open (and does not re-mark) while cooling down", async () => {
    const { checkBreaker } = await import("@/lib/agents/circuitBreaker");
    const config = makeConfig(3, 30);
    pushRun("failed", 30);
    pushRun("failed", 20);
    pushRun("failed", 10);

    await checkBreaker(config, T0);
    // 10 minutes into a 30-minute cooldown.
    const verdict = await checkBreaker(config, new Date(T0.getTime() + 10 * MINUTE));

    expect(verdict.state).toBe("open");
    expect(verdict.allowed).toBe(false);
    expect(state.db.runs.filter((row) => row.status === "circuit_open")).toHaveLength(1);
  });

  it("goes half-open after the cooldown and lets exactly one probe through", async () => {
    const { checkBreaker } = await import("@/lib/agents/circuitBreaker");
    const config = makeConfig(3, 30);
    pushRun("failed", 30);
    pushRun("failed", 20);
    pushRun("failed", 10);

    await checkBreaker(config, T0);
    const verdict = await checkBreaker(config, new Date(T0.getTime() + 31 * MINUTE));

    expect(verdict.state).toBe("half_open");
    expect(verdict.allowed).toBe(true);
    expect(verdict.reason).toMatch(/half-open probe/);
  });

  it("closes when the half-open probe succeeds", async () => {
    const { checkBreaker } = await import("@/lib/agents/circuitBreaker");
    const config = makeConfig(3, 30);
    pushRun("failed", 30);
    pushRun("failed", 20);
    pushRun("failed", 10);
    await checkBreaker(config, T0);

    // The probe runs and succeeds — recorded as a completed run.
    state.db.runs.push({
      id: "probe-ok",
      agentKey: "flaky-agent",
      status: "completed",
      startedAt: new Date(T0.getTime() + 32 * MINUTE),
    });

    const verdict = await checkBreaker(config, new Date(T0.getTime() + 33 * MINUTE));
    expect(verdict.state).toBe("closed");
    expect(verdict.allowed).toBe(true);
    expect(verdict.consecutiveFailures).toBe(0);
  });

  it("re-opens with a fresh cooldown when the half-open probe fails", async () => {
    const { checkBreaker } = await import("@/lib/agents/circuitBreaker");
    const config = makeConfig(3, 30);
    pushRun("failed", 30);
    pushRun("failed", 20);
    pushRun("failed", 10);
    await checkBreaker(config, T0);

    // The probe runs and fails again.
    const probeAt = new Date(T0.getTime() + 32 * MINUTE);
    state.db.runs.push({ id: "probe-fail", agentKey: "flaky-agent", status: "failed", startedAt: probeAt });

    const at = new Date(T0.getTime() + 33 * MINUTE);
    const verdict = await checkBreaker(config, at);

    // Re-opened, not half-open again. Without a fresh marker the stale one stays
    // past its cooldown forever and every later tick reports half_open — the
    // breaker would let a probe through on each cadence, which is the flapping
    // it exists to prevent.
    expect(verdict.state).toBe("open");
    expect(verdict.allowed).toBe(false);
    expect(verdict.reason).toMatch(/probe failed/);
    expect(verdict.retryAt).toEqual(new Date(at.getTime() + 30 * MINUTE));
    // Two markers now: the original open, and the re-open after the failed probe.
    expect(state.db.runs.filter((row) => row.status === "circuit_open")).toHaveLength(2);

    // And it stays shut for the new cooldown rather than flapping on the next tick.
    const nextTick = await checkBreaker(config, new Date(at.getTime() + MINUTE));
    expect(nextTick.allowed).toBe(false);
  });

  it("applies a default breaker to a config that declares none", async () => {
    const { checkBreaker, DEFAULT_BREAKER } = await import("@/lib/agents/circuitBreaker");
    const config = {
      ...makeConfig(),
      limits: { max_turns: 25, max_budget_usd: 1, max_runtime_seconds: 180 },
    } as AgentConfig;

    for (let i = 0; i < DEFAULT_BREAKER.consecutive_failures; i += 1) {
      pushRun("failed", 30 - i);
    }
    const verdict = await checkBreaker(config, T0);
    // Breakers are ON by default — an agent that forgot to declare one is still
    // protected, rather than silently retrying forever.
    expect(verdict.allowed).toBe(false);
    expect(verdict.threshold).toBe(DEFAULT_BREAKER.consecutive_failures);
  });

  it("does not let one agent's failures open another agent's circuit", async () => {
    const { checkBreaker } = await import("@/lib/agents/circuitBreaker");
    pushRun("failed", 30, "other-agent");
    pushRun("failed", 20, "other-agent");
    pushRun("failed", 10, "other-agent");

    const verdict = await checkBreaker(makeConfig(3), T0);
    expect(verdict.state).toBe("closed");
    expect(verdict.consecutiveFailures).toBe(0);
  });
});
