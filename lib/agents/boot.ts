import { isValidCronExpression } from "./cron";
import { getHandler } from "./registry";
import { resolveApprovalRule } from "./config";
import type { AgentConfig } from "./config";

/**
 * Boot validation (S8) — fail fast, at start, on the whole fleet.
 *
 * Every check here was previously deferred to run time, which meant a
 * misconfigured agent produced one failed run per cadence, forever, and the
 * evidence was scattered across the audit log instead of shown once at start.
 * The worst case was a missing handler: `runAgent` opened an AgentRun, then
 * threw `no_handler` — so a typo in a registry key looked like an agent that
 * runs and fails hourly rather than an agent that was never wired up.
 *
 * Errors abort the supervisor. Warnings are printed and do not.
 */

export type BootIssueLevel = "error" | "warning";

export interface BootIssue {
  level: BootIssueLevel;
  agentKey: string | null;
  code: string;
  message: string;
}

export interface BootReport {
  issues: BootIssue[];
  errors: BootIssue[];
  warnings: BootIssue[];
  ok: boolean;
}

/**
 * Validate the loaded fleet. `configs` should be ALL loaded configs; only the
 * enabled ones are held to the handler/schedule requirements, because a
 * disabled agent is allowed to be incompletely wired.
 */
export function validateBoot(configs: AgentConfig[]): BootReport {
  const issues: BootIssue[] = [];
  const add = (level: BootIssueLevel, agentKey: string | null, code: string, message: string) =>
    issues.push({ level, agentKey, code, message });

  // --- duplicate keys ------------------------------------------------------
  const seen = new Set<string>();
  for (const config of configs) {
    if (seen.has(config.key)) {
      add("error", config.key, "duplicate_key", `Two configs declare key "${config.key}".`);
    }
    seen.add(config.key);
  }

  for (const config of configs) {
    if (!config.enabled) {
      // Disabled agents are inert. runAgent refuses to open a run for one, so
      // the only thing worth saying is that it will not be scheduled.
      add(
        "warning",
        config.key,
        "disabled",
        `Agent "${config.key}" is disabled; it will not be scheduled and manual triggers will be refused.`
      );
      continue;
    }

    // --- handler must exist ------------------------------------------------
    if (!getHandler(config.key)) {
      add(
        "error",
        config.key,
        "no_handler",
        `No handler registered for enabled agent "${config.key}". Import scripts/agents/${config.key}.ts in register-agents.ts.`
      );
    }

    // --- schedule must be coherent ----------------------------------------
    const { schedule } = config;
    if (schedule.type === "interval" && !schedule.every_seconds) {
      add(
        "error",
        config.key,
        "interval_without_period",
        `Agent "${config.key}" has schedule.type "interval" but no every_seconds; it would never fire.`
      );
    }
    if (schedule.type === "cron") {
      if (!schedule.expression) {
        add(
          "error",
          config.key,
          "cron_without_expression",
          `Agent "${config.key}" has schedule.type "cron" but no expression.`
        );
      } else if (!isValidCronExpression(schedule.expression)) {
        add(
          "error",
          config.key,
          "cron_unparseable",
          `Agent "${config.key}" has an unparseable cron expression "${schedule.expression}".`
        );
      }
    }

    // --- limits must bound something --------------------------------------
    if (config.limits.max_runtime_seconds <= 0) {
      add("error", config.key, "bad_runtime_cap", `Agent "${config.key}" has a non-positive max_runtime_seconds.`);
    }
    if (config.limits.max_budget_usd <= 0) {
      add(
        "warning",
        config.key,
        "zero_budget",
        `Agent "${config.key}" has max_budget_usd ${config.limits.max_budget_usd}; any model call will trip the cap.`
      );
    }

    // --- approval classification completeness (S7) -------------------------
    // Deny-by-default means an unclassified tool is GATED. That is safe, but it
    // is better found at boot than discovered when a nightly run pauses for a
    // human at 3am.
    for (const toolName of declaredToolNames(config)) {
      const rule = resolveApprovalRule(config, toolName);
      const gated = config.approval_rules?.always_require_approval ?? [];
      if (rule.required && !gated.includes(toolName)) {
        add(
          "warning",
          config.key,
          "unclassified_tool",
          `Tool "${toolName}" is in neither approval list; it will require operator approval (deny-by-default). Classify it in never_require_approval if it is safe to run unattended.`
        );
      }
    }
  }

  const errors = issues.filter((issue) => issue.level === "error");
  const warnings = issues.filter((issue) => issue.level === "warning");
  return { issues, errors, warnings, ok: errors.length === 0 };
}

/** `<server>.<action>` names implied by a config's tools block. */
export function declaredToolNames(config: AgentConfig): string[] {
  const names: string[] = [];
  for (const tool of config.tools) {
    for (const action of tool.allow) {
      if (action.trim() === "*") {
        continue; // a wildcard names no specific action
      }
      // http_fetch / shell entries are argument patterns ("GET https://…"),
      // not action names; their action is implied by the call site.
      if (action.includes(" ") || action.includes("://")) {
        continue;
      }
      names.push(`${tool.server}.${action}`);
    }
  }
  return [...new Set(names)];
}

/** Human-readable one-line-per-issue rendering for the supervisor log. */
export function formatBootReport(report: BootReport): string {
  if (report.issues.length === 0) {
    return "[boot] validation passed with no issues.";
  }
  return report.issues
    .map((issue) => `[boot] ${issue.level.toUpperCase()} ${issue.agentKey ?? "-"}: ${issue.message}`)
    .join("\n");
}
