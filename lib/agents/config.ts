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

// Only `default` exists, because only `default` does anything: it is recorded on
// AgentStep.modelUsed. The former `triage` / `deep` fields declared a routing
// tier that no code ever read — the admin console even displayed `triage`,
// implying a routing decision the runtime never made. Removed rather than
// faked; reintroduce them together with an actual router.
const modelSchema = z.object({
  default: z.string().optional(),
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
  /**
   * Tools explicitly classified as safe to run unattended. Required under
   * deny-by-default gating (S7): a tool that appears in NEITHER list is treated
   * as unclassified and gated, so forgetting to classify fails safe.
   */
  never_require_approval: z.array(z.string()).optional(),
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

  // A tool name must carry an explicit action. Previously a bare server name
  // ("neon") fell through to `entry.allow.length > 0` and was allowed because
  // SOME action was permitted — an allowlist that answered a question it was
  // never asked (S7).
  if (action === "") {
    return false;
  }

  const args = (toolArgs ?? {}) as Record<string, unknown>;

  // `allow: ["*"]` widens which ACTIONS may be called. It does NOT satisfy an
  // argument wall: the URL, command, and table scopes below all ignore a bare
  // "*" entry. Previously "*" returned true immediately, so one wildcard
  // silently turned a read-only agent into an unrestricted one (S7).
  const wildcard = entry.allow.includes("*");
  const concrete = entry.allow.filter((pattern) => pattern.trim() !== "*");

  if (server === "http_fetch") {
    const method = String(args.method ?? "GET").toUpperCase();
    const url = typeof args.url === "string" ? args.url : "";
    if (!url) {
      return false;
    }
    // Match on scheme://host/path only. Query and fragment are stripped from
    // BOTH sides, so a pattern ending in `/*` cannot be satisfied by
    // attacker-controlled query content and `?` never smuggles a different
    // effective target past a glob written for the path.
    const candidate = `${method} ${stripQuery(url)}`;
    return concrete.some((pattern) => globToRegExp(stripQueryFromPattern(pattern)).test(candidate));
  }

  if (server === "shell") {
    // The allow entries are exact commands (e.g. "dig +short NS patalign.com").
    // The call's `command` must match one of them — deny-by-default keeps the
    // Cloudflare watcher to dig-only and rejects anything else (allowlist_strict).
    const command = typeof args.command === "string" ? args.command.trim() : "";
    if (!command) {
      return false;
    }
    return concrete.some((pattern) => globToRegExp(pattern.trim()).test(command));
  }

  if (server === "neon" && args.table !== undefined) {
    const tables = entry.scope?.tables;
    if (Array.isArray(tables) && !tables.map(String).includes(String(args.table))) {
      return false;
    }
  }

  return wildcard || entry.allow.includes(action);
}

/** Drop the query string and fragment from a URL for allowlist matching. */
export function stripQuery(url: string): string {
  const cut = Math.min(
    ...[url.indexOf("?"), url.indexOf("#")].filter((index) => index !== -1).concat([url.length])
  );
  return url.slice(0, cut);
}

/** Allow entries are authored as "<VERB> <url-glob>"; normalize the URL half. */
function stripQueryFromPattern(pattern: string): string {
  const space = pattern.indexOf(" ");
  if (space === -1) {
    return stripQuery(pattern);
  }
  return `${pattern.slice(0, space)} ${stripQuery(pattern.slice(space + 1))}`;
}

export interface ApprovalRule {
  required: boolean;
  blastRadius: string;
  /** The matched rule key (e.g. "gmail.draft" or "neon.write:User"). */
  ruleKey: string;
}

/**
 * Resolve whether a tool call needs operator approval.
 *
 * DENY BY DEFAULT (S7). Precedence: `always_require_approval` →
 * `never_require_approval` → gated. Both lists match the plain tool name AND,
 * when the call names a `table`, the table-qualified key `${toolName}:${table}`
 * — so a rule like "neon.write:User" gates a `neon.write` call with
 * `{ table: "User" }`. A tool in neither list is UNCLASSIFIED and is gated.
 */
export function resolveApprovalRule(config: AgentConfig, toolName: string, toolArgs?: unknown): ApprovalRule {
  const rules = config.approval_rules;
  const gated = rules?.always_require_approval ?? [];
  const ungated = rules?.never_require_approval ?? [];
  const args = (toolArgs ?? {}) as Record<string, unknown>;
  const tableKey = typeof args.table === "string" ? `${toolName}:${args.table}` : null;

  // 1. Explicitly gated wins. The table-qualified key is checked FIRST so the
  //    more specific rule owns the outcome — "neon.write:PilotCohortMember"
  //    keeps its own blast radius even when a blanket "neon.write" rule also
  //    exists, rather than the general rule shadowing the specific one.
  const gatedKey = tableKey && gated.includes(tableKey) ? tableKey : gated.includes(toolName) ? toolName : null;
  if (gatedKey) {
    const blastRadius =
      rules?.approval_blast_radius?.[gatedKey] ?? rules?.approval_blast_radius?.[toolName] ?? "medium";
    return { required: true, blastRadius, ruleKey: gatedKey };
  }

  // 2. Explicitly classified as safe to run unattended (specific key first, for
  //    the same reason).
  const ungatedKey = tableKey && ungated.includes(tableKey)
    ? tableKey
    : ungated.includes(toolName)
      ? toolName
      : null;
  if (ungatedKey) {
    return { required: false, blastRadius: "low", ruleKey: ungatedKey };
  }

  // 3. Unclassified → GATED (S7, inverted default).
  //
  // The old default was `required: false`: anything an author forgot to list ran
  // unattended. That makes forgetting silent and unbounded — a new tool, a
  // renamed tool, or a typo in a rule key all resolved to "no approval needed".
  // Deny-by-default makes the same mistakes noisy and safe instead: the run
  // pauses for a human, who can then classify the tool properly.
  return {
    required: true,
    blastRadius: rules?.approval_blast_radius?.[toolName] ?? "unknown",
    ruleKey: toolName,
  };
}

/** Compile a glob (only `*` is special) into an anchored RegExp. */
function globToRegExp(glob: string): RegExp {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`);
}
