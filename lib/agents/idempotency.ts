import { createHash } from "node:crypto";
import type { ToolArgs } from "./types";

/**
 * Idempotency keys for approved outbound side effects (S2).
 *
 * A gated action is identified by (runId, toolName, argsHash). The run id is
 * stable across an approval pause — a resume re-enters the ORIGINAL run rather
 * than opening a new one — so the same proposed call always hashes to the same
 * key, whether it is reached on the first attempt or on a resume replay. The key
 * is stored unique on the AgentApproval row; `consumedAt` is set by a
 * conditional update immediately before the call executes, so the effect fires
 * at most once no matter how many times the handler re-enters.
 */

/** Deterministic JSON: object keys sorted at every depth so key order never changes the hash. */
export function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value ?? null) ?? "null";
  }
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(",")}}`;
}

export function hashArgs(args: ToolArgs): string {
  return createHash("sha256").update(stableStringify(args)).digest("hex");
}

/** sha256(runId | toolName | argsHash) — the unique key stored on the approval row. */
export function idempotencyKeyFor(runId: string, toolName: string, args: ToolArgs): string {
  return createHash("sha256").update(`${runId}|${toolName}|${hashArgs(args)}`).digest("hex");
}
