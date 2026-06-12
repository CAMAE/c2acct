import Anthropic from "@anthropic-ai/sdk";
import type { AgentConfig } from "./config";

/**
 * ANTHROPIC_API_KEY plumbing + the Anthropic API client for LLM-backed
 * features (agents, report narratives).
 *
 * The key lives in the runtime env only (Mac mini .env.local / launchd plist /
 * Vercel prod env as of 2026-06-11) — never committed, never logged, never
 * persisted to Neon. Everything exported here is presence-only except
 * getAnthropicApiKey(), which hands the raw value to the SDK constructor and
 * nothing else.
 *
 * An agent is LLM-backed when BOTH are true:
 *   - its YAML opts in with `llm: { enabled: true }`
 *   - ANTHROPIC_API_KEY is present in the runtime env
 * The flag without the key (or vice versa) degrades to the existing scripted
 * behavior, so configs are safe to ship ahead of the credential.
 */

export function anthropicApiKeyPresent(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

/** Raw key for SDK construction only. Never log, audit, or serialize this value. */
export function getAnthropicApiKey(): string | null {
  const value = process.env.ANTHROPIC_API_KEY?.trim();
  return value ? value : null;
}

export function isLlmBackingEnabled(config: Pick<AgentConfig, "llm">): boolean {
  return Boolean(config.llm?.enabled) && anthropicApiKeyPresent();
}

/** Keys of the configs that will actually run LLM-backed (flag AND key). */
export function llmBackedAgentKeys(configs: AgentConfig[]): string[] {
  return configs.filter((config) => isLlmBackingEnabled(config)).map((config) => config.key);
}

export const NARRATIVE_MODEL = "claude-sonnet-4-6";

/** Hard wall-clock budget for a narrative call; maxRetries 0 keeps it honest. */
export const NARRATIVE_TIMEOUT_MS = 20_000;

/**
 * One short-text generation call through the official SDK. Throws on any
 * failure (missing key, timeout, API error) — callers own degradation.
 * Thinking disabled + low effort: this is a fast prose-synthesis call with a
 * 20s budget, not a reasoning task.
 */
export async function generateNarrativeText(input: {
  system: string;
  prompt: string;
  maxTokens?: number;
  timeoutMs?: number;
}): Promise<string> {
  const apiKey = getAnthropicApiKey();
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not present in the runtime env");
  }

  const client = new Anthropic({
    apiKey,
    timeout: input.timeoutMs ?? NARRATIVE_TIMEOUT_MS,
    maxRetries: 0,
  });

  const response = await client.messages.create({
    model: NARRATIVE_MODEL,
    max_tokens: input.maxTokens ?? 800,
    thinking: { type: "disabled" },
    output_config: { effort: "low" },
    system: input.system,
    messages: [{ role: "user", content: input.prompt }],
  });

  const text = response.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();

  if (!text) {
    throw new Error(`empty narrative response (stop_reason=${response.stop_reason})`);
  }

  return text;
}
