import path from "node:path";
import prisma from "@/lib/prisma";
import { auditLog } from "./audit";
import { BudgetExceededError, budgetSnapshot, endRun, startRun } from "./budget";
import { canUseTool, postToolUse, preToolUse } from "./hooks";
import { getHandler } from "./registry";
import { toJsonValue } from "./json";
import { loadAgentConfigs } from "./config";
import { resolveVerticalId } from "./vertical-pack";
import type { AgentConfig } from "./config";
import type { AgentRunContext, RunInput, ToolArgs } from "./types";

/**
 * Thin runtime wrapper for Patalign agents.
 *
 * Phase 0 runs scripted handlers (registered via `lib/agents/registry.ts`) and
 * owns the full run lifecycle: sync the AgentDefinition from config, open an
 * AgentRun, drive the handler through the hooks layer, and close the run with a
 * terminal status + summary. Phase 1 plugs the actual Claude Agent SDK
 * (`query()` with model routing) into the same lifecycle — the hooks, audit,
 * budget, and approval seams stay exactly as they are here.
 */

type RunStatus =
  | "completed"
  | "failed"
  | "timeout"
  | "budget_exceeded"
  | "awaiting_approval";

export interface RunOutcome {
  runId: string;
  status: RunStatus;
  summary?: string;
  error?: string;
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

export async function runAgent(config: AgentConfig, input: RunInput): Promise<RunOutcome> {
  const verticalId = resolveVerticalId(config);
  const configYaml = JSON.stringify(config, null, 2);

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

  const run = await prisma.agentRun.create({
    data: {
      agentKey: config.key,
      trigger: input.trigger,
      triggerSource: input.triggerSource ?? null,
      status: "running",
    },
  });

  startRun(run.id, config.limits);
  const startedAt = Date.now();
  let stepIdx = 0;
  const nextStep = () => {
    stepIdx += 1;
    return stepIdx;
  };

  await auditLog({
    runId: run.id,
    agentKey: config.key,
    hookPhase: "user_message",
    payload: { trigger: input.trigger, triggerSource: input.triggerSource ?? null },
  });

  const ctx = createRunContext(config, run.id, input, nextStep);

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
        )
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
        durationMs: Date.now() - startedAt,
        finalSummary: result.summary,
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
    const { status, errorClass, message } = classifyError(error);
    await prisma.agentRun.update({
      where: { id: run.id },
      data: {
        status,
        finishedAt: new Date(),
        durationMs: Date.now() - startedAt,
        errorClass,
        errorMessage: message,
      },
    });

    await auditLog({
      runId: run.id,
      agentKey: config.key,
      hookPhase: "agent_message",
      payload: { error: message, errorClass },
      outcome: "error",
    });

    return { runId: run.id, status, error: message };
  } finally {
    endRun(run.id);
  }
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
  nextStep: () => number
): AgentRunContext {
  const hookCtx = { runId, agentKey: config.key, config };

  return {
    ...hookCtx,
    trigger: input.trigger,
    async useTool<T>(toolName: string, toolArgs: ToolArgs, exec: (args: ToolArgs) => Promise<T>): Promise<T> {
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

      const result = await exec(effectiveArgs);

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

      await postToolUse(hookCtx, toolName, effectiveArgs, result);
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

function withTimeout<T>(promise: Promise<T>, ms: number, makeError: () => Error): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(makeError()), ms);
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

function classifyError(error: unknown): { status: RunStatus; errorClass: string; message: string } {
  if (error instanceof TimeoutError) {
    return { status: "timeout", errorClass: "timeout", message: error.message };
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
