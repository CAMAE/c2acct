import prisma from "@/lib/prisma";
import { toJsonValue } from "./json";

/**
 * Per-agent key/value state, backed by the AgentState table. This is runtime
 * plumbing (the same category as AgentRun / the audit log), not an agent tool —
 * it does not go through the allowlist, and it is the agent's own bookkeeping,
 * not a write to production business data. The Cloudflare/Domain watcher uses it
 * to remember its last-known DNS snapshot between runs.
 */

export async function getAgentState<T>(agentKey: string, key: string): Promise<T | null> {
  const row = await prisma.agentState.findUnique({
    where: { agentKey_key: { agentKey, key } },
  });
  return row ? (row.value as unknown as T) : null;
}

export async function setAgentState(agentKey: string, key: string, value: unknown): Promise<void> {
  const json = toJsonValue(value);
  await prisma.agentState.upsert({
    where: { agentKey_key: { agentKey, key } },
    create: { agentKey, key, value: json },
    update: { value: json },
  });
}
