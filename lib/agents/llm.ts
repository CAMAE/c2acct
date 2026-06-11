import type { AgentConfig } from "./config";

/**
 * ANTHROPIC_API_KEY plumbing for LLM-backed agents (Phase 2 seam).
 *
 * The key lives ONLY in the supervisor process env (Mac mini .env.local /
 * launchd plist) — never committed, never logged, never persisted to Neon.
 * Everything exported here is presence-only except getAnthropicApiKey(),
 * which hands the raw value to an SDK constructor and nothing else.
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
