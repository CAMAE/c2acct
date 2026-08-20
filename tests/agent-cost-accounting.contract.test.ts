import { beforeEach, describe, expect, it, vi } from "vitest";
import { emptyDb, fakePrismaModule, type FakeDb } from "./helpers/agentPrismaFake";
import type { AgentConfig } from "@/lib/agents/config";

/**
 * Real cost accounting (S3).
 *
 * `max_budget_usd` was config fiction: cost only accrued when a caller
 * volunteered a `costUsd`, nothing ever did, and AgentRun.tokensInput /
 * tokensOutput stayed null on every row ever written. These tests pin the whole
 * chain — a tool reports usage → the budget accrues it → the run row records it
 * → the cap actually trips — plus the global daily ceiling that stops
 * scheduling when the fleet as a whole overspends.
 */

const state = vi.hoisted(() => ({ db: null as unknown as FakeDb }));
state.db = emptyDb();
vi.mock("@/lib/prisma", () => fakePrismaModule(state.db));

function makeConfig(overrides: Partial<AgentConfig> = {}): AgentConfig {
  return {
    key: "cost-agent",
    name: "Cost Agent",
    vertical_id: "accounting",
    enabled: true,
    schedule: { type: "manual", jitter_seconds: 0, run_on_start: false },
    limits: { max_turns: 25, max_budget_usd: 1, max_runtime_seconds: 30 },
    tools: [{ server: "model", allow: ["call"] }],
    approval_rules: { never_require_approval: ["model.call"] },
    model: { default: "claude-sonnet-4-6" },
    ...overrides,
  } as AgentConfig;
}

beforeEach(() => {
  for (const rows of Object.values(state.db)) {
    rows.length = 0;
  }
  delete process.env.TELEGRAM_BOT_TOKEN;
});

// --- the rate card ------------------------------------------------------------

describe("cost derivation", () => {
  it("prices a call from the published per-model rates", async () => {
    const { estimateCostUsd } = await import("@/lib/agents/cost");
    // Sonnet 4.6 is $3/MTok in, $15/MTok out.
    expect(estimateCostUsd("claude-sonnet-4-6", 1_000_000, 0)).toBeCloseTo(3, 6);
    expect(estimateCostUsd("claude-sonnet-4-6", 0, 1_000_000)).toBeCloseTo(15, 6);
    // Opus 5 is $5/$25.
    expect(estimateCostUsd("claude-opus-5", 200_000, 20_000)).toBeCloseTo(1 + 0.5, 6);
  });

  it("prices an unknown model at the most expensive tier, never the cheapest", async () => {
    const { estimateCostUsd, FALLBACK_RATE, MODEL_RATES } = await import("@/lib/agents/cost");
    const cheapest = Math.min(...Object.values(MODEL_RATES).map((rate) => rate.outputPerMTok));
    // An unpriced model must make the budget trip EARLY, not late.
    expect(FALLBACK_RATE.outputPerMTok).toBeGreaterThan(cheapest);
    expect(estimateCostUsd("some-model-we-have-never-seen", 0, 1_000_000)).toBeCloseTo(
      FALLBACK_RATE.outputPerMTok,
      6
    );
  });
});

// --- cost-written --------------------------------------------------------------

describe("cost-written", () => {
  it("writes real tokensInput/tokensOutput/estCostUsd onto the run row", async () => {
    const { runAgent } = await import("@/lib/agents/sdk");
    const { registerAgent } = await import("@/lib/agents/registry");
    const { usageFromTokens } = await import("@/lib/agents/cost");

    const config = makeConfig({ key: "cost-writer" });
    registerAgent("cost-writer", async (ctx) => {
      // Two model calls, reporting usage the way lib/agents/llm.ts does.
      await ctx.useTool("model.call", { n: 1 }, async () => ({
        text: "a",
        usage: usageFromTokens("claude-sonnet-4-6", 10_000, 1_000),
      }));
      await ctx.useTool("model.call", { n: 2 }, async () => ({
        text: "b",
        usage: usageFromTokens("claude-sonnet-4-6", 20_000, 2_000),
      }));
      return { summary: "done" };
    });

    const outcome = await runAgent(config, { trigger: "test" });
    expect(outcome.status).toBe("completed");

    const run = state.db.runs.find((row) => row.id === outcome.runId)!;
    expect(run.tokensInput).toBe(30_000);
    expect(run.tokensOutput).toBe(3_000);
    // 30k in @ $3/M + 3k out @ $15/M = 0.09 + 0.045
    expect(Number(run.estCostUsd)).toBeCloseTo(0.135, 6);
  });

  it("leaves the row untouched for a run that spends nothing", async () => {
    const { runAgent } = await import("@/lib/agents/sdk");
    const { registerAgent } = await import("@/lib/agents/registry");

    const config = makeConfig({ key: "free-agent" });
    registerAgent("free-agent", async (ctx) => {
      await ctx.useTool("model.call", {}, async () => ({ ok: true }));
      return { summary: "done" };
    });

    const outcome = await runAgent(config, { trigger: "test" });
    const run = state.db.runs.find((row) => row.id === outcome.runId)!;
    expect(run.tokensInput).toBeNull();
    expect(run.estCostUsd).toBeNull();
  });
});

// --- the per-run cap now actually trips ---------------------------------------

describe("max_budget_usd trips", () => {
  it("stops the run once accrued cost passes the cap", async () => {
    const { runAgent } = await import("@/lib/agents/sdk");
    const { registerAgent } = await import("@/lib/agents/registry");
    const { usageFromTokens } = await import("@/lib/agents/cost");

    const calls: number[] = [];
    // $0.05 cap; each call costs 100k in + 10k out on Sonnet = 0.3 + 0.15 = $0.45.
    const config = makeConfig({
      key: "spendy-agent",
      limits: { max_turns: 25, max_budget_usd: 0.05, max_runtime_seconds: 30 },
    });

    registerAgent("spendy-agent", async (ctx) => {
      for (let i = 0; i < 5; i += 1) {
        calls.push(i);
        await ctx.useTool("model.call", { i }, async () => ({
          usage: usageFromTokens("claude-sonnet-4-6", 100_000, 10_000),
        }));
      }
      return { summary: "done" };
    });

    const outcome = await runAgent(config, { trigger: "test" });

    expect(outcome.status).toBe("budget_exceeded");
    expect(outcome.error).toMatch(/max_budget_usd/);
    // The cap is checked before each call, so the first spends and the second
    // is refused — the loop must NOT have run to completion.
    expect(calls.length).toBeLessThan(5);
    expect(calls.length).toBe(2);
  });
});

// --- global daily ceiling ------------------------------------------------------

describe("global daily cost cap", () => {
  it("reports exceeded once today's runs sum past the cap", async () => {
    const { checkDailyCap } = await import("@/lib/agents/cost");

    const today = new Date();
    state.db.runs.push(
      { id: "r1", agentKey: "a", status: "completed", startedAt: today, estCostUsd: 2.5 },
      { id: "r2", agentKey: "b", status: "completed", startedAt: today, estCostUsd: 2.6 },
      // Yesterday's spend must not count against today's ceiling.
      {
        id: "r3",
        agentKey: "a",
        status: "completed",
        startedAt: new Date(today.getTime() - 48 * 60 * 60 * 1000),
        estCostUsd: 100,
      }
    );

    const verdict = await checkDailyCap(5);
    expect(verdict.spentUsd).toBeCloseTo(5.1, 6);
    expect(verdict.exceeded).toBe(true);

    const under = await checkDailyCap(10);
    expect(under.exceeded).toBe(false);
  });
});
