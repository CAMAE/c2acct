import type { AgentConfig } from "./config";

export type RunTrigger = "scheduled" | "manual" | "approval-resume" | "test";

export interface RunInput {
  trigger: RunTrigger;
  triggerSource?: string | null;
  /**
   * Re-enter an existing run that is paused on an approval (S1/S2 async
   * pause/resume). The SDK reuses this AgentRun row instead of opening a new
   * one, which keeps the run id — and therefore every idempotency key derived
   * from it — stable across the pause. Only meaningful with trigger
   * "approval-resume".
   */
  resumeRunId?: string | null;
}

/** Context passed to hook functions (matches IMPL-SPEC §6 HookCtx). */
export interface HookCtx {
  runId: string;
  agentKey: string;
  config: AgentConfig;
  /**
   * Aborted when the run's wall-clock cap trips. Every tool executor receives
   * it and MUST refuse to start (or finish) a side effect once it is aborted —
   * a timeout cancels work, it does not merely stop waiting for it.
   */
  signal: AbortSignal;
}

export interface ToolArgs {
  [key: string]: unknown;
}

/** A tool executor. `signal` aborts when the run's runtime cap trips. */
export type ToolExecutor<T> = (args: ToolArgs, signal: AbortSignal) => Promise<T>;

/**
 * Context handed to an agent handler. `useTool()` routes a tool call through the
 * hooks layer (audit → budget → approval gate → allowlist), records an
 * AgentStep, then runs the executor. `log()` records a free-form "thought" step.
 */
export interface AgentRunContext extends HookCtx {
  trigger: RunTrigger;
  useTool<T>(toolName: string, toolArgs: ToolArgs, exec: ToolExecutor<T>): Promise<T>;
  log(message: string, data?: ToolArgs): Promise<void>;
}

export interface AgentResult {
  summary: string;
}

export type AgentHandler = (ctx: AgentRunContext) => Promise<AgentResult>;

/** Optional token/cost usage a Phase 1 model call can report back to the budget. */
export interface TokenUsage {
  inputTokens?: number;
  outputTokens?: number;
  costUsd?: number;
}
