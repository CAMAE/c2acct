import { beforeEach, describe, expect, it, vi } from "vitest";
import { emptyDb, fakePrismaModule, type FakeDb } from "./helpers/agentPrismaFake";
import type { AgentConfig } from "@/lib/agents/config";

/**
 * Orphan recovery boot sweep (S5).
 *
 * A crash, kill -9, or launchd restart leaves rows describing work nobody is
 * doing: runs stuck `running`, runs parked in `paused_approval` behind a card
 * nobody will tap, and triggers `claimed` by a process that no longer exists.
 * Nothing cleaned any of them, so /admin showed phantom in-flight work forever
 * and the overlap guard had no truthful state to read.
 *
 * The sweep must be conservative in both directions: it reaps what cannot still
 * be alive, and it leaves alone anything that plausibly is.
 */

const state = vi.hoisted(() => ({ db: null as unknown as FakeDb }));
state.db = emptyDb();
vi.mock("@/lib/prisma", () => fakePrismaModule(state.db));

function makeConfig(key: string, maxRuntimeSeconds = 180): AgentConfig {
  return {
    key,
    name: key,
    vertical_id: "accounting",
    enabled: true,
    schedule: { type: "manual", jitter_seconds: 0, run_on_start: false },
    limits: { max_turns: 25, max_budget_usd: 1, max_runtime_seconds: maxRuntimeSeconds },
    tools: [],
  } as AgentConfig;
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

beforeEach(() => {
  for (const rows of Object.values(state.db)) {
    rows.length = 0;
  }
});

describe("orphan-sweep", () => {
  it("fails runs past their own cap + margin, and spares runs still inside it", async () => {
    const { bootSweep } = await import("@/lib/agents/recovery");

    const now = new Date("2026-08-20T12:00:00Z");
    // fast-agent caps at 60s; slow-agent at 30 min. The margin is 5 min.
    const fast = makeConfig("fast-agent", 60);
    const slow = makeConfig("slow-agent", 30 * 60);

    state.db.runs.push(
      // Well past 60s + 5 min → orphaned.
      { id: "stale-fast", agentKey: "fast-agent", status: "running", startedAt: new Date(now.getTime() - 30 * MINUTE) },
      // 2 minutes old: inside fast-agent's cap + margin → left alone.
      { id: "live-fast", agentKey: "fast-agent", status: "running", startedAt: new Date(now.getTime() - 2 * MINUTE) },
      // 20 minutes old but slow-agent may legitimately run 30 → left alone.
      { id: "live-slow", agentKey: "slow-agent", status: "running", startedAt: new Date(now.getTime() - 20 * MINUTE) },
      // A completed run is never touched.
      { id: "done", agentKey: "fast-agent", status: "completed", startedAt: new Date(now.getTime() - 30 * MINUTE) }
    );

    const result = await bootSweep([fast, slow], now);
    expect(result.failedRunning).toBe(1);

    const byId = (id: string) => state.db.runs.find((row) => row.id === id)!;
    expect(byId("stale-fast").status).toBe("timeout");
    expect(byId("stale-fast").errorClass).toBe("orphaned");
    expect(byId("live-fast").status).toBe("running");
    expect(byId("live-slow").status).toBe("running");
    expect(byId("done").status).toBe("completed");
  });

  it("reaps a run belonging to an agent this supervisor no longer loads", async () => {
    const { bootSweep } = await import("@/lib/agents/recovery");
    const now = new Date("2026-08-20T12:00:00Z");

    state.db.runs.push({
      id: "ghost",
      agentKey: "retired-agent",
      status: "running",
      startedAt: new Date(now.getTime() - 6 * HOUR),
    });

    const result = await bootSweep([makeConfig("fast-agent", 60)], now);
    expect(result.failedRunning).toBe(1);
    expect(state.db.runs.find((row) => row.id === "ghost")!.errorClass).toBe("orphaned");
  });

  it("fails a run abandoned in paused_approval past the approval TTL", async () => {
    const { bootSweep } = await import("@/lib/agents/recovery");
    const now = new Date("2026-08-20T12:00:00Z");

    state.db.runs.push(
      // 3 days parked → the card will never be answered.
      { id: "abandoned", agentKey: "a", status: "paused_approval", startedAt: new Date(now.getTime() - 72 * HOUR) },
      // 2 hours parked → still well within the 24h approval window.
      { id: "waiting", agentKey: "a", status: "paused_approval", startedAt: new Date(now.getTime() - 2 * HOUR) }
    );

    const result = await bootSweep([makeConfig("a")], now);
    expect(result.failedPaused).toBe(1);
    expect(state.db.runs.find((row) => row.id === "abandoned")!.errorClass).toBe("approval_abandoned");
    // A pause that a human can still answer must survive the sweep.
    expect(state.db.runs.find((row) => row.id === "waiting")!.status).toBe("paused_approval");
  });

  it("expires stale CLAIMED triggers, not just pending ones", async () => {
    const { bootSweep } = await import("@/lib/agents/recovery");
    const now = new Date("2026-08-20T12:00:00Z");

    state.db.triggers.push(
      // Claimed 3 hours ago by a supervisor that died mid-run. This is the half
      // the old expiry missed entirely — it only ever touched `pending`.
      {
        id: "orphan-claim",
        agentKey: "a",
        status: "claimed",
        createdAt: new Date(now.getTime() - 4 * HOUR),
        claimedAt: new Date(now.getTime() - 3 * HOUR),
      },
      // Claimed 2 minutes ago: a live run, must be left alone.
      {
        id: "live-claim",
        agentKey: "a",
        status: "claimed",
        createdAt: new Date(now.getTime() - 3 * MINUTE),
        claimedAt: new Date(now.getTime() - 2 * MINUTE),
      },
      // Pending for an hour: past the 15-minute pending TTL.
      { id: "stale-pending", agentKey: "a", status: "pending", createdAt: new Date(now.getTime() - HOUR), claimedAt: null },
      // Pending for 1 minute: fresh.
      { id: "fresh-pending", agentKey: "a", status: "pending", createdAt: new Date(now.getTime() - MINUTE), claimedAt: null }
    );

    const result = await bootSweep([makeConfig("a")], now);

    expect(result.expiredClaimedTriggers).toBe(1);
    expect(result.expiredPendingTriggers).toBe(1);

    const byId = (id: string) => state.db.triggers.find((row) => row.id === id)!;
    expect(byId("orphan-claim").status).toBe("expired");
    expect(byId("orphan-claim").error).toMatch(/died mid-run/);
    expect(byId("live-claim").status).toBe("claimed");
    expect(byId("stale-pending").status).toBe("expired");
    expect(byId("fresh-pending").status).toBe("pending");
  });

  it("expires pending approvals past the TTL and audits the cleanup", async () => {
    const { bootSweep } = await import("@/lib/agents/recovery");
    const now = new Date("2026-08-20T12:00:00Z");

    state.db.approvals.push(
      { id: "old", runId: "r", agentKey: "a", status: "pending", createdAt: new Date(now.getTime() - 48 * HOUR) },
      { id: "recent", runId: "r", agentKey: "a", status: "pending", createdAt: new Date(now.getTime() - HOUR) },
      // An already-decided row must never be rewritten by the sweep.
      { id: "approved", runId: "r", agentKey: "a", status: "approved", createdAt: new Date(now.getTime() - 48 * HOUR) }
    );

    const result = await bootSweep([makeConfig("a")], now);
    expect(result.expiredApprovals).toBe(1);

    const byId = (id: string) => state.db.approvals.find((row) => row.id === id)!;
    expect(byId("old").status).toBe("expired");
    expect(byId("recent").status).toBe("pending");
    expect(byId("approved").status).toBe("approved");

    const swept = state.db.audits.filter(
      (row) => (row.payload as { sweep?: string })?.sweep === "boot_orphan_recovery"
    );
    expect(swept).toHaveLength(1);
  });

  it("reports a clean fleet without writing an audit row", async () => {
    const { bootSweep } = await import("@/lib/agents/recovery");
    const result = await bootSweep([makeConfig("a")], new Date());
    expect(result).toEqual({
      failedRunning: 0,
      failedPaused: 0,
      expiredApprovals: 0,
      expiredPendingTriggers: 0,
      expiredClaimedTriggers: 0,
    });
    expect(state.db.audits).toHaveLength(0);
  });
});

describe("scheduler overlap guard", () => {
  it("refuses to start an agent whose previous run is still in flight", async () => {
    const { Scheduler } = await import("@/lib/agents/scheduler");

    const skips: string[] = [];
    const scheduler = new Scheduler({ onSkip: (key, reason) => skips.push(`${key}:${reason}`) });

    let release: () => void = () => {};
    const inFlight = new Promise<void>((resolve) => {
      release = resolve;
    });
    let starts = 0;

    const config = makeConfig("slow-cadence");
    const task = async () => {
      starts += 1;
      await inFlight;
    };

    // Two ticks land while the first run is still going. `fire` is the private
    // path every schedule type funnels through, so driving it directly tests the
    // guard without waiting on real interval timers.
    const fire = (scheduler as unknown as { fire: (r: unknown, t: string) => Promise<void> }).fire.bind(
      scheduler
    );
    const first = fire({ config, task }, "scheduled");
    const second = fire({ config, task }, "scheduled");

    expect(scheduler.runningAgents()).toEqual(["slow-cadence"]);
    release();
    await Promise.all([first, second]);

    // The second tick was skipped, not stacked on top of the first.
    expect(starts).toBe(1);
    expect(skips).toHaveLength(1);
    expect(skips[0]).toMatch(/overlap guard/);
    // The slot is released once the run finishes.
    expect(scheduler.runningAgents()).toEqual([]);
  });

  it("skips a fire when the gate refuses (daily cap / circuit open)", async () => {
    const { Scheduler } = await import("@/lib/agents/scheduler");

    const skips: string[] = [];
    let starts = 0;
    const scheduler = new Scheduler({
      gate: async () => ({ allowed: false, reason: "daily cost cap reached" }),
      onSkip: (key, reason) => skips.push(`${key}:${reason}`),
    });
    const config = makeConfig("gated");

    await (scheduler as unknown as { fire: (r: unknown, t: string) => Promise<void> }).fire(
      { config, task: async () => { starts += 1; } },
      "scheduled"
    );

    expect(starts).toBe(0);
    expect(skips[0]).toMatch(/daily cost cap/);
  });
});
