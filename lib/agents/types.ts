import type { AgentConfig } from "./config";

export type RunTrigger = "scheduled" | "manual" | "approval-resume" | "test";

export interface RunInput {
  trigger: RunTrigger;
  triggerSource?: string | null;
}

/** Context passed to hook functions (matches IMPL-SPEC §6 HookCtx). */
export interface HookCtx {
  runId: string;
  agentKey: string;
  config: AgentConfig;
}

export interface ToolArgs {
  [key: string]: unknown;
}

/**
 * Context handed to an agent handler. `useTool()` routes a tool call through the
 * hooks layer (audit → budget → approval gate → allowlist), records an
 * AgentStep, then runs the executor. `log()` records a free-form "thought" step.
 */
export interface AgentRunContext extends HookCtx {
  trigger: RunTrigger;
  useTool<T>(toolName: string, toolArgs: ToolArgs, exec: (args: ToolArgs) => Promise<T>): Promise<T>;
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
