import path from "node:path";
import prisma from "@/lib/prisma";
import { auditLog } from "./audit";
import { ApprovalPauseSignal, expirePendingApprovalsForRun } from "./approvals";
import { BudgetExceededError, budgetSnapshot, endRun, startRun } from "./budget";
import { canUseTool, postToolUse, preToolUse } from "./hooks";
import { getHandler } from "./registry";
import { toJsonValue } from "./json";
import { loadAgentConfigs } from "./config";
import { stringifyYaml } from "./yaml";
import { resolveVerticalId } from "./vertical-pack";
import type { AgentConfig } from "./config";
import type { AgentRunContext, RunInput, TokenUsage, ToolArgs, ToolExecutor } from "./types";

/**
 * Thin runtime wrapper for Patalign agents.
 *
 * Phase 0 runs scripted handlers (registered via `lib/agents/registry.ts`) and
 * owns the full run lifecycle: sync the AgentDefinition from config, open an
 * AgentRun, drive the handler through the hooks layer, and close the run with a
 * terminal status + summary. Phase 1 plugs the actual Claude Agent SDK
 * (`query()` with model routing) into the same lifecycle — the hooks, audit,
 * budget, and approval seams stay exactly as they are here.
 *
 * Two hardening invariants live in this file (S1):
 *   - The runtime cap CANCELS. An AbortController is threaded through every
 *     tool executor and fired the moment the cap trips, so a tool that resolves
 *     after the deadline finds `signal.aborted` and performs no side effect.
 *     Timing out is not "stop waiting" — it is "stop working".
 *   - An approval pause is not a failure. When a gated call has no decision yet
 *     the handler unwinds with ApprovalPauseSignal and the run closes as
 *     `paused_approval`, to be re-entered later under the SAME run id.
 */

type RunStatus =
  | "completed"
  | "failed"
  | "timeout"
  | "budget_exceeded"
  | "awaiting_approval"
  | "paused_approval";

export interface RunOutcome {
  runId: string;
  status: RunStatus;
  summary?: string;
  error?: string;
  /** Set when status is paused_approval: the approval the run is waiting on. */
  approvalId?: string;
}

export class AgentError extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
    this.name = "AgentError";
  }
}

class TimeoutError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TimeoutError";
  }
}

/** Thrown when a tool is reached after the run's abort signal has fired. */
export class RunAbortedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RunAbortedError";
  }
}

export async function runAgent(config: AgentConfig, input: RunInput): Promise<RunOutcome> {
  const verticalId = resolveVerticalId(config);
  // Store the config as YAML-shaped JSON text. The column is named configYaml and
  // is read back as the agent's declared configuration, so the serialization must
  // stay a faithful round-trip of the parsed config (see boot validation).
  const configYaml = serializeConfigForStorage(config);

  await prisma.agentDefinition.upsert({
    where: { key: config.key },
    create: {
      key: config.key,
      name: config.name,
      description: config.description ?? null,
      enabled: config.enabled,
      configYaml,
      verticalId,
    },
    update: {
      name: config.name,
      description: config.description ?? null,
      enabled: config.enabled,
      configYaml,
      verticalId,
    },
  });

  // A disabled agent must never open a run, however it was triggered. The
  // supervisor already filters its schedule list, but manual /admin triggers and
  // direct runAgentByKey callers reach here too (S8).
  if (!config.enabled) {
    throw new AgentError(
      "agent_disabled",
      `Agent "${config.key}" is disabled in config; refusing to run.`
    );
  }

  const { run, priorDurationMs } = await openRun(config, input);

  startRun(run.id, config.limits);
  const startedAt = Date.now();
  const controller = new AbortController();
  let stepIdx = await nextStepSeed(run.id, Boolean(input.resumeRunId));
  const nextStep = () => {
    stepIdx += 1;
    return stepIdx;
  };

  await auditLog({
    runId: run.id,
    agentKey: config.key,
    hookPhase: "user_message",
    payload: {
      trigger: input.trigger,
      triggerSource: input.triggerSource ?? null,
      resumed: Boolean(input.resumeRunId),
    },
  });

  const ctx = createRunContext(config, run.id, input, nextStep, controller.signal);

  try {
    const handler = getHandler(config.key);
    if (!handler) {
      throw new AgentError(
        "no_handler",
        `No handler registered for agent "${config.key}". Import its module (scripts/agents/${config.key}.ts) before running.`
      );
    }

    const result = await withTimeout(
      handler(ctx),
      config.limits.max_runtime_seconds * 1000,
      () =>
        new TimeoutError(
          `Agent "${config.key}" exceeded max_runtime_seconds (${config.limits.max_runtime_seconds}).`
        ),
      controller
    );

    await prisma.agentStep.create({
      data: { runId: run.id, stepIdx: nextStep(), kind: "summary", toolArgs: toJsonValue({ summary: result.summary }) },
    });

    const snapshot = budgetSnapshot(run.id);
    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status: "completed",
        finishedAt: new Date(),
        durationMs: priorDurationMs + (Date.now() - startedAt),
        finalSummary: result.summary,
        tokensInput: snapshot && snapshot.tokensInput > 0 ? snapshot.tokensInput : null,
        tokensOutput: snapshot && snapshot.tokensOutput > 0 ? snapshot.tokensOutput : null,
        estCostUsd: snapshot && snapshot.costUsd > 0 ? snapshot.costUsd : null,
      },
    });

    await auditLog({
      runId: run.id,
      agentKey: config.key,
      hookPhase: "agent_message",
      payload: { summary: result.summary },
      outcome: "allowed",
    });

    return { runId: run.id, status: "completed", summary: result.summary };
  } catch (error) {
    // A pause is a suspension, not a failure: no errorClass, no errorMessage,
    // and the run stays resumable under this same id.
    if (error instanceof ApprovalPauseSignal) {
      await prisma.agentRun.update({
        where: { id: run.id },
        data: {
          status: "paused_approval",
          durationMs: priorDurationMs + (Date.now() - startedAt),
        },
      });
      await auditLog({
        runId: run.id,
        agentKey: config.key,
        hookPhase: "approval_decision",
        payload: { approvalId: error.approvalId, toolName: error.toolName, outcome: "paused" },
      });
      return { runId: run.id, status: "paused_approval", approvalId: error.approvalId };
    }

    const { status, errorClass, message } = classifyError(error);
    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status,
        finishedAt: new Date(),
        durationMs: priorDurationMs + (Date.now() - startedAt),
        errorClass,
        errorMessage: message,
      },
    });

    // The run is over; nothing may act on its behalf any more. Expiring its
    // pending approvals is conditional on status "pending", so an operator who
    // decided a moment earlier keeps their decision — the idempotency guard, not
    // this write, is what prevents the effect from firing late.
    if (status === "timeout" || status === "budget_exceeded") {
      await expirePendingApprovalsForRun(run.id, `run ended as ${status} before the approval was decided`);
    }

    await auditLog({
      runId: run.id,
      agentKey: config.key,
      hookPhase: "agent_message",
      payload: { error: message, errorClass },
      outcome: "error",
    });

    return { runId: run.id, status, error: message };
  } finally {
    // Cancel anything still in flight even on the success path, so a stray
    // background tool cannot outlive the run that started it.
    controller.abort();
    endRun(run.id);
  }
}

/**
 * Open the AgentRun for this attempt. A resume re-enters the EXISTING row (same
 * id → same idempotency keys); anything else opens a fresh run.
 */
async function openRun(
  config: AgentConfig,
  input: RunInput
): Promise<{ run: { id: string }; priorDurationMs: number }> {
  if (!input.resumeRunId) {
    const run = await prisma.agentRun.create({
      data: {
        agentKey: config.key,
        trigger: input.trigger,
        triggerSource: input.triggerSource ?? null,
        status: "running",
      },
    });
    return { run, priorDurationMs: 0 };
  }

  const existing = await prisma.agentRun.findUnique({ where: { id: input.resumeRunId } });
  if (!existing) {
    throw new AgentError("resume_run_not_found", `No AgentRun "${input.resumeRunId}" to resume.`);
  }
  if (existing.agentKey !== config.key) {
    throw new AgentError(
      "resume_agent_mismatch",
      `AgentRun "${input.resumeRunId}" belongs to "${existing.agentKey}", not "${config.key}".`
    );
  }
  // Conditional re-entry: only a run still parked on an approval may be resumed,
  // and only once — a second resume trigger for the same run finds it already
  // running/terminal and loses the race.
  const claimed = await prisma.agentRun.updateMany({
    where: { id: existing.id, status: "paused_approval" },
    data: { status: "running", finishedAt: null },
  });
  if (claimed.count !== 1) {
    throw new AgentError(
      "resume_not_paused",
      `AgentRun "${input.resumeRunId}" is ${existing.status}, not paused_approval; refusing to resume.`
    );
  }
  return { run: { id: existing.id }, priorDurationMs: existing.durationMs ?? 0 };
}

/** Continue the step sequence on a resume so replayed steps do not collide. */
async function nextStepSeed(runId: string, resumed: boolean): Promise<number> {
  if (!resumed) {
    return 0;
  }
  const last = await prisma.agentStep.findFirst({
    where: { runId },
    orderBy: { stepIdx: "desc" },
    select: { stepIdx: true },
  });
  return last?.stepIdx ?? 0;
}

/** Convenience entry for standalone agent scripts: load config by key, then run. */
export async function runAgentByKey(
  key: string,
  input: RunInput,
  agentsDir = "agents"
): Promise<RunOutcome> {
  const configs = await loadAgentConfigs(path.resolve(agentsDir));
  const config = configs.find((candidate) => candidate.key === key);
  if (!config) {
    throw new AgentError("config_not_found", `No agent config with key "${key}" under ${agentsDir}/.`);
  }
  return runAgent(config, input);
}

function createRunContext(
  config: AgentConfig,
  runId: string,
  input: RunInput,
  nextStep: () => number,
  signal: AbortSignal
): AgentRunContext {
  const hookCtx = { runId, agentKey: config.key, config, signal };

  const assertLive = (toolName: string) => {
    if (signal.aborted) {
      throw new RunAbortedError(
        `Run ${runId} was aborted (runtime cap or shutdown); refusing to execute "${toolName}".`
      );
    }
  };

  return {
    ...hookCtx,
    trigger: input.trigger,
    async useTool<T>(toolName: string, toolArgs: ToolArgs, exec: ToolExecutor<T>): Promise<T> {
      // Guard before any gate work: once the run is aborted nothing else runs.
      assertLive(toolName);

      const allowed = await canUseTool(hookCtx, toolName, toolArgs);
      if (!allowed) {
        throw new AgentError("tool_not_allowed", `Tool "${toolName}" is not in ${config.key}'s allowlist.`);
      }

      const pre = await preToolUse(hookCtx, toolName, toolArgs);
      if (pre.block) {
        throw new AgentError("approval_denied", pre.reason ?? `Tool "${toolName}" blocked by approval gate.`);
      }
      // Operator edits overlay the original args (change one field, keep the rest).
      const effectiveArgs = pre.editedArgs ? { ...toolArgs, ...pre.editedArgs } : toolArgs;

      // The approved effect already fired on an earlier attempt of this run.
      // Replay the recorded result instead of sending it a second time.
      if (pre.skip) {
        return (await replayRecordedResult<T>(runId, toolName)) as T;
      }

      // Re-check immediately before the side effect: the gate work above is
      // asynchronous and the cap may have tripped while it ran.
      assertLive(toolName);

      await prisma.agentStep.create({
        data: {
          runId,
          stepIdx: nextStep(),
          kind: "tool_call",
          toolName,
          toolArgs: toJsonValue(effectiveArgs),
          modelUsed: config.model?.default ?? null,
        },
      });

      const result = await exec(effectiveArgs, signal);

      // A tool that resolved AFTER the cap tripped must not have its result
      // recorded or fed onward — the run is already terminal.
      assertLive(toolName);

      await prisma.agentStep.create({
        data: {
          runId,
          stepIdx: nextStep(),
          kind: "tool_result",
          toolName,
          toolResult: result === undefined ? undefined : toJsonValue(result),
          finishedAt: new Date(),
        },
      });

      await postToolUse(hookCtx, toolName, effectiveArgs, result, extractUsage(result));
      return result;
    },
    async log(message: string, data?: ToolArgs): Promise<void> {
      await prisma.agentStep.create({
        data: {
          runId,
          stepIdx: nextStep(),
          kind: "thought",
          toolArgs: toJsonValue({ message, ...(data ?? {}) }),
        },
      });
    },
  };
}

/**
 * Pull token usage out of a tool result (S3).
 *
 * A tool that calls a model reports what it spent by returning a `usage` field
 * shaped like TokenUsage — see lib/agents/llm.ts `generateNarrative`, which
 * builds one from the SDK's real `response.usage`. Anything without that field
 * contributes nothing, so non-model tools need no changes.
 */
function extractUsage(result: unknown): TokenUsage | undefined {
  if (!result || typeof result !== "object") {
    return undefined;
  }
  const usage = (result as { usage?: unknown }).usage;
  if (!usage || typeof usage !== "object") {
    return undefined;
  }
  const { inputTokens, outputTokens, costUsd } = usage as Record<string, unknown>;
  const numeric = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : undefined);
  const parsed: TokenUsage = {
    inputTokens: numeric(inputTokens),
    outputTokens: numeric(outputTokens),
    costUsd: numeric(costUsd),
  };
  if (parsed.inputTokens === undefined && parsed.outputTokens === undefined && parsed.costUsd === undefined) {
    return undefined;
  }
  return parsed;
}

/** The recorded result of an already-executed approved call, for resume replay. */
async function replayRecordedResult<T>(runId: string, toolName: string): Promise<T | undefined> {
  const step = await prisma.agentStep.findFirst({
    where: { runId, toolName, kind: "tool_result" },
    orderBy: { stepIdx: "desc" },
    select: { toolResult: true },
  });
  return (step?.toolResult ?? undefined) as T | undefined;
}

/**
 * Race a promise against the runtime cap. On expiry the controller is aborted
 * FIRST, so in-flight tool executors observe cancellation, and only then is the
 * timeout raised.
 */
function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  makeError: () => Error,
  controller: AbortController
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      controller.abort();
      reject(makeError());
    }, ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });
}

/**
 * Serialize a validated config for the AgentDefinition.configYaml column.
 *
 * Actual YAML, not JSON. The column has always been named configYaml and was
 * always written with JSON.stringify; anything reading it back as YAML got a
 * format it did not expect. Round-trips through parseYaml (see the boot
 * validation contract test).
 */
function serializeConfigForStorage(config: AgentConfig): string {
  return stringifyYaml(config as unknown as Parameters<typeof stringifyYaml>[0]);
}

function classifyError(error: unknown): { status: RunStatus; errorClass: string; message: string } {
  if (error instanceof TimeoutError) {
    return { status: "timeout", errorClass: "timeout", message: error.message };
  }
  if (error instanceof RunAbortedError) {
    return { status: "timeout", errorClass: "aborted", message: error.message };
  }
  if (error instanceof BudgetExceededError) {
    const status: RunStatus = error.reason === "max_runtime_seconds" ? "timeout" : "budget_exceeded";
    return { status, errorClass: `budget_exceeded:${error.reason}`, message: error.message };
  }
  if (error instanceof AgentError) {
    return { status: "failed", errorClass: error.code, message: error.message };
  }
  if (error instanceof Error) {
    return { status: "failed", errorClass: error.name || "error", message: error.message };
  }
  return { status: "failed", errorClass: "error", message: String(error) };
}
