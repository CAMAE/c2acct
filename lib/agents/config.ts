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

export const agentConfigSchema = z.object({
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().optional(),
  vertical_id: z.string().default("accounting"),
  enabled: z.boolean().default(true),
  schedule: scheduleSchema,
  model: modelSchema.optional(),
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
 * (e.g. "noop.log", "telegram.send_message"). Phase 0 matches on server + action
 * membership; per-tool argument matching (HTTP verb/URL globs, table scopes) is
 * layered on in Phase 1 alongside the real MCP tool wiring.
 */
export function isToolAllowed(config: AgentConfig, toolName: string): boolean {
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
  if (action === "") {
    return entry.allow.length > 0;
  }
  return entry.allow.includes(action);
}
