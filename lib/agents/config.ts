import { promises as fs } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { parseYaml } from "./yaml";

/**
 * Agent config loader. Reads `agents/*.yaml`, parses with the in-repo YAML
 * subset loader, and validates against the schema below. Field names mirror the
 * YAML (snake_case) so the parsed object maps 1:1 to the file — the only
 * camelCase mapping happens at the Prisma persistence boundary in sdk.ts.
 */

const scheduleSchema = z.object({
  type: z.enum(["cron", "interval", "manual"]),
  expression: z.string().optional(),
  every_seconds: z.number().int().positive().optional(),
  jitter_seconds: z.number().int().nonnegative().default(0),
  run_on_start: z.boolean().default(false),
});

const circuitBreakerSchema = z.object({
  consecutive_failures: z.number().int().positive(),
  cooldown_minutes: z.number().int().nonnegative(),
});

const limitsSchema = z.object({
  max_turns: z.number().int().positive().default(25),
  max_budget_usd: z.number().nonnegative().default(0.5),
  max_runtime_seconds: z.number().int().positive().default(180),
  circuit_breaker: circuitBreakerSchema.optional(),
});

const modelSchema = z.object({
  default: z.string().optional(),
  triage: z.string().nullable().optional(),
  deep: z.string().nullable().optional(),
});

const toolSchema = z.object({
  server: z.string(),
  allow: z.array(z.string()).default([]),
  scope: z.record(z.string(), z.unknown()).optional(),
});

const hooksSchema = z.object({
  pre_tool_use: z.array(z.string()).optional(),
  post_tool_use: z.array(z.string()).optional(),
  can_use_tool: z.array(z.string()).optional(),
});

const approvalRulesSchema = z.object({
  always_require_approval: z.array(z.string()).optional(),
  approval_blast_radius: z.record(z.string(), z.string()).optional(),
});

// LLM backing opt-in (see lib/agents/llm.ts). The flag alone does nothing —
// ANTHROPIC_API_KEY must also be present in the supervisor env at runtime.
const llmSchema = z.object({
  enabled: z.boolean().default(false),
});

export const agentConfigSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  vertical_id: z.string().default("accounting"),
  enabled: z.boolean().default(true),
  schedule: scheduleSchema,
  model: modelSchema.optional(),
  llm: llmSchema.optional(),
  limits: limitsSchema,
  tools: z.array(toolSchema).default([]),
  hooks: hooksSchema.optional(),
  approval_rules: approvalRulesSchema.optional(),
});

export type AgentConfig = z.infer<typeof agentConfigSchema>;

export async function loadAgentConfig(file: string): Promise<AgentConfig> {
  const raw = await fs.readFile(file, "utf8");
  const parsed = parseYaml(raw);
  const result = agentConfigSchema.safeParse(parsed);
  if (!result.success) {
    throw new Error(`Invalid agent config "${file}": ${result.error.message}`);
  }
  return result.data;
}

export async function loadAgentConfigs(dir: string): Promise<AgentConfig[]> {
  const abs = path.resolve(dir);
  const entries = await fs.readdir(abs);
  const files = entries.filter((name) => name.endsWith(".yaml") || name.endsWith(".yml")).sort();
  const configs: AgentConfig[] = [];
  for (const file of files) {
    configs.push(await loadAgentConfig(path.join(abs, file)));
  }
  return configs;
}

/**
 * Allowlist check for the `can_use_tool` hook. Tool names are `<server>.<action>`
 * (e.g. "noop.log", "telegram.send_message"). When `toolArgs` are supplied the
 * check is argument-aware (Phase 1):
 *   - `http_fetch`: the allow entries are `"<VERB> <url-glob>"` (e.g.
 *     "GET https://pat-c2acct-live.vercel.app/*"); the candidate `<method> <url>`
 *     must match one of them. This is what keeps QA read-only on production.
 *   - `neon`: when `tools[].scope.tables` is declared and the call names a
 *     `table`, that table must be in scope.
 * Without args, it falls back to server + action membership (e.g. "noop.log").
 */
export function isToolAllowed(config: AgentConfig, toolName: string, toolArgs?: unknown): boolean {
  const separator = toolName.indexOf(".");
  const server = separator === -1 ? toolName : toolName.slice(0, separator);
  const action = separator === -1 ? "" : toolName.slice(separator + 1);
  const entry = config.tools.find((tool) => tool.server === server);
  if (!entry) {
    return false;
  }
  if (entry.allow.includes("*")) {
    return true;
  }

  const args = (toolArgs ?? {}) as Record<string, unknown>;

  if (server === "http_fetch") {
    const method = String(args.method ?? "GET").toUpperCase();
    const url = typeof args.url === "string" ? args.url : "";
    if (!url) {
      return false;
    }
    const candidate = `${method} ${url}`;
    return entry.allow.some((pattern) => globToRegExp(pattern).test(candidate));
  }

  if (server === "shell") {
    // The allow entries are exact commands (e.g. "dig +short NS patalign.com").
    // The call's `command` must match one of them — deny-by-default keeps the
    // Cloudflare watcher to dig-only and rejects anything else (allowlist_strict).
    const command = typeof args.command === "string" ? args.command.trim() : "";
    if (!command) {
      return false;
    }
    return entry.allow.some((pattern) => globToRegExp(pattern.trim()).test(command));
  }

  if (server === "neon" && args.table !== undefined) {
    const tables = entry.scope?.tables;
    if (Array.isArray(tables) && !tables.map(String).includes(String(args.table))) {
      return false;
    }
  }

  if (action === "") {
    return entry.allow.length > 0;
  }
  return entry.allow.includes(action);
}

export interface ApprovalRule {
  required: boolean;
  blastRadius: string;
  /** The matched rule key (e.g. "gmail.draft" or "neon.write:User"). */
  ruleKey: string;
}

/**
 * Resolve whether a tool call needs operator approval. Matches `always_require_approval`
 * against the plain tool name AND, when the call names a `table`, the table-qualified
 * key `${toolName}:${table}` — so a rule like "neon.write:User" gates a
 * `neon.write` call with `{ table: "User" }`.
 */
export function resolveApprovalRule(config: AgentConfig, toolName: string, toolArgs?: unknown): ApprovalRule {
  const rules = config.approval_rules;
  const list = rules?.always_require_approval ?? [];
  const args = (toolArgs ?? {}) as Record<string, unknown>;
  const tableKey = typeof args.table === "string" ? `${toolName}:${args.table}` : null;

  const ruleKey = list.includes(toolName) ? toolName : tableKey && list.includes(tableKey) ? tableKey : null;
  if (!ruleKey) {
    return { required: false, blastRadius: "low", ruleKey: toolName };
  }
  const blastRadius =
    rules?.approval_blast_radius?.[ruleKey] ?? rules?.approval_blast_radius?.[toolName] ?? "medium";
  return { required: true, blastRadius, ruleKey };
}

/** Compile a glob (only `*` is special) into an anchored RegExp. */
function globToRegExp(glob: string): RegExp {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`);
}
