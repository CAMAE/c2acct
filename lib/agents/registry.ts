import type { AgentHandler } from "./types";

/**
 * In-process registry mapping an agent key to its handler. Each agent module
 * (`scripts/agents/<key>.ts`) registers itself at import time; the supervisor
 * imports `register-agents.ts` to populate the registry before dispatching.
 */
const handlers = new Map<string, AgentHandler>();

export function registerAgent(key: string, handler: AgentHandler): void {
  handlers.set(key, handler);
}

export function getHandler(key: string): AgentHandler | undefined {
  return handlers.get(key);
}

export function registeredKeys(): string[] {
  return [...handlers.keys()];
}
