import { beforeEach, describe, expect, it, vi } from "vitest";
import { emptyDb, fakePrismaModule, type FakeDb } from "./helpers/agentPrismaFake";
import type { AgentConfig } from "@/lib/agents/config";

/**
 * Async approval pause/resume + timeout cancellation (S1/S2).
 *
 * Three properties the old blocking-poll design could not hold:
 *   1. timeout-cancels-tools — the runtime cap ABORTS in-flight work. A tool
 *      that resolves after the cap must observe signal.aborted and perform no
 *      side effect. Previously withTimeout only stopped *waiting*; the tool ran
 *      on and sent whatever it was going to send.
 *   2. approve-after-timeout-no-side-effect — once a run is terminal, a human
 *      tapping "approve" on a stale card can revive nothing. The expiry and the
 *      decision are both conditional writes, so exactly one wins.
 *   3. idempotent-resume — re-entering a paused run replays the handler, and a
 *      duplicate resume trigger replays it again. The approved side effect must
 *      still fire exactly once, guarded by the (runId, toolName, argsHash)
 *      idempotency key.
 */

const state = vi.hoisted(() => ({ db: null as unknown as FakeDb }));
state.db = emptyDb();

vi.mock("@/lib/prisma", () => fakePrismaModule(state.db));
// No Telegram mock: with the bot env unset (below), sendApprovalToTelegram
// throws "telegram env not configured", which ensureApproval already catches and
// audits. That exercises the real card-send failure path instead of hiding it,
// and keeps recordApprovalDecision — the code under test — entirely real.

function makeConfig(overrides: Partial<AgentConfig> = {}): AgentConfig {
  return {
    key: "contract-agent",
    name: "Contract Agent",
    description: "fixture",
    vertical_id: "accounting",
    enabled: true,
    schedule: { type: "manual", jitter_seconds: 0, run_on_start: false },
    limits: { max_turns: 25, max_budget_usd: 1, max_runtime_seconds: 30 },
    // outbound.probe is allowed and ungated; outbound.send is allowed and gated.
    tools: [{ server: "outbound", allow: ["probe", "send"] }],
    // Deny-by-default: outbound.probe must be classified to stay ungated.
    approval_rules: {
      always_require_approval: ["outbound.send"],
      never_require_approval: ["outbound.probe"],
    },
    ...overrides,
  } as AgentConfig;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

beforeEach(() => {
  // Truncate the tables IN PLACE. The mock factory runs once and captures each
  // array by reference, so reassigning them (Object.assign with a fresh db)
  // would leave the fake writing to arrays the test no longer reads.
  for (const rows of Object.values(state.db)) {
    rows.length = 0;
  }
  delete process.env.TELEGRAM_BOT_TOKEN;
  delete process.env.TELEGRAM_ALLOWED_CHAT_ID;
});

// --- 1. timeout-cancels-tools -------------------------------------------------

describe("timeout-cancels-tools", () => {
  it("aborts the signal at the cap so a late-resolving tool refuses its side effect", async () => {
    const { runAgent } = await import("@/lib/agents/sdk");
    const { registerAgent } = await import("@/lib/agents/registry");

    const sideEffects: string[] = [];
    // The cap is 50ms; the tool takes 200ms. It MUST come back to an aborted
    // signal and decline to send.
    const config = makeConfig({
      key: "slow-agent",
      limits: { max_turns: 25, max_budget_usd: 1, max_runtime_seconds: 0.05 },
      tools: [{ server: "outbound", allow: ["send"] }],
      approval_rules: { always_require_approval: [], never_require_approval: ["outbound.send"] },
    });

    registerAgent("slow-agent", async (ctx) => {
      await ctx.useTool("outbound.send", { to: "ops" }, async (_args, signal) => {
        await sleep(200);
        if (signal.aborted) {
          sideEffects.push("REFUSED");
          return { sent: false };
        }
        sideEffects.push("SENT");
        return { sent: true };
      });
      return { summary: "done" };
    });

    const outcome = await runAgent(config, { trigger: "test" });
    // Let the abandoned tool promise settle so its branch is recorded.
    await sleep(250);

    expect(outcome.status).toBe("timeout");
    expect(sideEffects).toEqual(["REFUSED"]);
    expect(sideEffects).not.toContain("SENT");

    const run = state.db.runs.find((row) => row.id === outcome.runId);
    expect(run?.status).toBe("timeout");
  });

  it("refuses to even start a tool once the run is aborted", async () => {
    const { runAgent } = await import("@/lib/agents/sdk");
    const { registerAgent } = await import("@/lib/agents/registry");

    const started: string[] = [];
    const config = makeConfig({
      key: "two-step-agent",
      limits: { max_turns: 25, max_budget_usd: 1, max_runtime_seconds: 0.05 },
      approval_rules: { always_require_approval: [], never_require_approval: ["outbound.send"] },
    });

    registerAgent("two-step-agent", async (ctx) => {
      // First tool outlives the cap; the second must never begin.
      await ctx
        .useTool("outbound.send", { n: 1 }, async () => {
          await sleep(120);
          return { ok: true };
        })
        .catch(() => undefined);
      await ctx.useTool("outbound.send", { n: 2 }, async () => {
        started.push("second-tool-ran");
        return { ok: true };
      });
      return { summary: "done" };
    });

    await runAgent(config, { trigger: "test" });
    await sleep(200);

    expect(started).toEqual([]);
  });
});

// --- 2. approve-after-timeout-no-side-effect ----------------------------------

describe("approve-after-timeout-no-side-effect", () => {
  it("a decision that lands after the approval expired settles nothing and sends nothing", async () => {
    const { runAgent } = await import("@/lib/agents/sdk");
    const { registerAgent } = await import("@/lib/agents/registry");
    const { DEFAULT_APPROVAL_TTL_MS, expireStaleApprovals } = await import("@/lib/agents/approvals");
    const { recordApprovalDecision } = await import("@/ops/telegram-bot/approvals");

    const sideEffects: string[] = [];
    const config = makeConfig({ key: "gated-agent" });

    registerAgent("gated-agent", async (ctx) => {
      await ctx.useTool("outbound.send", { to: "customer" }, async () => {
        sideEffects.push("SENT");
        return { sent: true };
      });
      return { summary: "done" };
    });

    // Attempt 1 parks on the approval card — nothing sent.
    const paused = await runAgent(config, { trigger: "manual" });
    expect(paused.status).toBe("paused_approval");
    expect(sideEffects).toEqual([]);

    // The card goes unanswered past the TTL: the sweep expires it and the run
    // is failed out by the orphan recovery pass.
    // 25 hours later, with the default 24h TTL — an injected clock, so the
    // assertion does not depend on real elapsed time.
    const expired = await expireStaleApprovals(
      DEFAULT_APPROVAL_TTL_MS,
      new Date(Date.now() + 25 * 60 * 60 * 1000)
    );
    expect(expired).toBe(1);
    const run = state.db.runs.find((row) => row.id === paused.runId)!;
    run.status = "timeout";

    // NOW the operator taps Approve on the stale card.
    await recordApprovalDecision(paused.approvalId!, { decision: "approve", decidedBy: "telegram:ops" });

    const approval = state.db.approvals.find((row) => row.id === paused.approvalId)!;
    // The late decision did not overwrite the expiry…
    expect(approval.status).toBe("expired");
    // …no resume was queued…
    expect(state.db.triggers.filter((row) => row.resumeRunId !== null)).toEqual([]);
    // …and the gated action never fired.
    expect(sideEffects).toEqual([]);

    const lostRace = state.db.audits.filter(
      (row) => (row.payload as { reason?: string })?.reason === "decision_lost_race"
    );
    expect(lostRace).toHaveLength(1);
  });
});

// --- 3. idempotent-resume -----------------------------------------------------

describe("idempotent-resume", () => {
  it("sends exactly once across pause → approve → resume → duplicate resume", async () => {
    const { runAgent } = await import("@/lib/agents/sdk");
    const { registerAgent } = await import("@/lib/agents/registry");
    const { recordApprovalDecision } = await import("@/ops/telegram-bot/approvals");

    const sideEffects: string[] = [];
    const config = makeConfig({ key: "resume-agent" });

    registerAgent("resume-agent", async (ctx) => {
      // A non-gated call replays harmlessly on every attempt.
      await ctx.useTool("outbound.probe", { probe: true }, async () => ({ ok: true }));
      await ctx.useTool("outbound.send", { to: "customer" }, async () => {
        sideEffects.push("SENT");
        return { sent: true, id: "msg-1" };
      });
      return { summary: "sent" };
    });

    // Attempt 1: parks on the gate.
    const paused = await runAgent(config, { trigger: "manual" });
    expect(paused.status).toBe("paused_approval");
    expect(sideEffects).toEqual([]);

    // Operator approves → the decision handler queues a resume for the SAME run.
    await recordApprovalDecision(paused.approvalId!, { decision: "approve", decidedBy: "telegram:ops" });
    const resumeTrigger = state.db.triggers.find((row) => row.resumeRunId === paused.runId);
    expect(resumeTrigger).toBeDefined();

    // Attempt 2: re-enter the original run.
    const resumed = await runAgent(config, {
      trigger: "approval-resume",
      resumeRunId: paused.runId,
    });
    expect(resumed.runId).toBe(paused.runId); // same run id → stable idempotency key
    expect(resumed.status).toBe("completed");
    expect(sideEffects).toEqual(["SENT"]);

    // A DUPLICATE resume trigger (redelivered callback, operator double-tap).
    // Park the run again to get past the re-entry guard, then replay.
    const run = state.db.runs.find((row) => row.id === paused.runId)!;
    run.status = "paused_approval";

    const replayed = await runAgent(config, {
      trigger: "approval-resume",
      resumeRunId: paused.runId,
    });
    expect(replayed.status).toBe("completed");

    // Still exactly one send: the idempotency key was already consumed.
    expect(sideEffects).toEqual(["SENT"]);

    const approval = state.db.approvals.find((row) => row.id === paused.approvalId)!;
    expect(approval.consumedAt).toBeInstanceOf(Date);
    expect(approval.idempotencyKey).toEqual(expect.any(String));
  });

  it("a second resume of a run that is no longer paused is refused", async () => {
    const { runAgent } = await import("@/lib/agents/sdk");
    const { registerAgent } = await import("@/lib/agents/registry");

    const config = makeConfig({
      key: "guard-agent",
      approval_rules: { always_require_approval: [], never_require_approval: ["outbound.send"] },
    });
    registerAgent("guard-agent", async () => ({ summary: "ok" }));

    const first = await runAgent(config, { trigger: "manual" });
    expect(first.status).toBe("completed");

    // The run is completed, not paused — re-entry must be refused, not silently
    // re-run (which would replay every side effect in the handler). The refusal
    // is a throw: the supervisor's trigger catch turns it into a failed trigger
    // rather than a second run.
    await expect(
      runAgent(config, { trigger: "approval-resume", resumeRunId: first.runId })
    ).rejects.toThrow(/not paused_approval/);
  });
});
