import path from "node:path";
import { describe, expect, it } from "vitest";
import { isToolAllowed, loadAgentConfig, resolveApprovalRule, stripQuery } from "@/lib/agents/config";
import { parseYaml, stringifyYaml } from "@/lib/agents/yaml";
import { cronMatches, isValidCronExpression, localHourExists } from "@/lib/agents/cron";
import { HEARTBEAT_FILE, REPO_ROOT } from "@/lib/agents/heartbeat";
import { filterTaskEnv, ALLOWED_TASK_ENV_KEYS } from "@/lib/agents/triggerQueue";
import { declaredToolNames, validateBoot } from "@/lib/agents/boot";
import type { AgentConfig } from "@/lib/agents/config";

/**
 * Deny-by-default gating, boot validation, and the assorted footguns (S7/S8).
 */

function config(overrides: Partial<AgentConfig> = {}): AgentConfig {
  return {
    key: "t",
    name: "t",
    vertical_id: "accounting",
    enabled: true,
    schedule: { type: "manual", jitter_seconds: 0, run_on_start: false },
    limits: { max_turns: 5, max_budget_usd: 1, max_runtime_seconds: 60 },
    tools: [],
    ...overrides,
  } as AgentConfig;
}

// --- allowlist: "*" no longer surrenders the argument walls -------------------

describe('allow: ["*"] does not bypass argument checks', () => {
  it("keeps the neon table scope under a wildcard", () => {
    const cfg = config({ tools: [{ server: "neon", allow: ["*"], scope: { tables: ["AgentRun"] } }] });
    expect(isToolAllowed(cfg, "neon.read", { table: "AgentRun" })).toBe(true);
    // The wildcard widens ACTIONS, not tables. Previously "*" returned true
    // immediately and this call was allowed.
    expect(isToolAllowed(cfg, "neon.read", { table: "User" })).toBe(false);
  });

  it("will not let a wildcard authorize an arbitrary shell command", () => {
    const cfg = config({ tools: [{ server: "shell", allow: ["*"] }] });
    // A bare "*" is not a command pattern; nothing satisfies the command wall.
    expect(isToolAllowed(cfg, "shell.exec", { command: "rm -rf /" })).toBe(false);
  });

  it("will not let a wildcard authorize an arbitrary URL", () => {
    const cfg = config({ tools: [{ server: "http_fetch", allow: ["*"] }] });
    expect(isToolAllowed(cfg, "http_fetch.get", { method: "GET", url: "https://evil.example/x" })).toBe(false);
  });

  it("still widens plain action membership", () => {
    const cfg = config({ tools: [{ server: "vercel", allow: ["*"] }] });
    expect(isToolAllowed(cfg, "vercel.anything", {})).toBe(true);
  });
});

// --- dotted-action fallthrough closed -----------------------------------------

describe("dotted-action fallthrough", () => {
  it("denies a bare server name with no action", () => {
    const cfg = config({ tools: [{ server: "neon", allow: ["read"] }] });
    // Previously this fell through to `allow.length > 0` and was ALLOWED,
    // because some action was permitted.
    expect(isToolAllowed(cfg, "neon", {})).toBe(false);
    expect(isToolAllowed(cfg, "neon.read", {})).toBe(true);
    expect(isToolAllowed(cfg, "neon.write", {})).toBe(false);
  });
});

// --- URL globs match path only -------------------------------------------------

describe("URL globs match path only", () => {
  it("strips the query string and fragment before matching", () => {
    expect(stripQuery("https://x.com/a?b=c")).toBe("https://x.com/a");
    expect(stripQuery("https://x.com/a#frag")).toBe("https://x.com/a");
    expect(stripQuery("https://x.com/a")).toBe("https://x.com/a");
  });

  it("matches an allowed path regardless of query", () => {
    const cfg = config({ tools: [{ server: "http_fetch", allow: ["GET https://ok.example/api"] }] });
    expect(
      isToolAllowed(cfg, "http_fetch.get", { method: "GET", url: "https://ok.example/api?trace=1" })
    ).toBe(true);
  });

  it("a query cannot satisfy a path glob", () => {
    const cfg = config({ tools: [{ server: "http_fetch", allow: ["GET https://ok.example/public/*"] }] });
    // The path is /private; only the QUERY mentions /public/. With the query
    // included in the candidate this matched.
    expect(
      isToolAllowed(cfg, "http_fetch.get", {
        method: "GET",
        url: "https://ok.example/private?next=/public/x",
      })
    ).toBe(false);
  });

  it("still enforces the verb and host", () => {
    const cfg = config({ tools: [{ server: "http_fetch", allow: ["GET https://ok.example/*"] }] });
    expect(isToolAllowed(cfg, "http_fetch.post", { method: "POST", url: "https://ok.example/a" })).toBe(false);
    expect(isToolAllowed(cfg, "http_fetch.get", { method: "GET", url: "https://evil.example/a" })).toBe(false);
  });
});

// --- unknown-tool-requires-approval -------------------------------------------

describe("unknown-tool-requires-approval", () => {
  it("gates a tool that appears in neither approval list", () => {
    const cfg = config({ approval_rules: { never_require_approval: ["safe.tool"] } });
    const rule = resolveApprovalRule(cfg, "brand.new_tool", {});
    expect(rule.required).toBe(true);
    expect(rule.blastRadius).toBe("unknown");
  });

  it("gates a config with no approval_rules block at all", () => {
    expect(resolveApprovalRule(config(), "anything.at_all", {}).required).toBe(true);
  });

  it("honours an explicit safe classification", () => {
    const cfg = config({ approval_rules: { never_require_approval: ["safe.tool"] } });
    expect(resolveApprovalRule(cfg, "safe.tool", {}).required).toBe(false);
  });

  it("always_require_approval wins over never_require_approval", () => {
    const cfg = config({
      approval_rules: {
        always_require_approval: ["neon.write:User"],
        never_require_approval: ["neon.write", "neon.write:User"],
      },
    });
    // The table-qualified gate must not be overridden by a broader safe listing.
    expect(resolveApprovalRule(cfg, "neon.write", { table: "User" }).required).toBe(true);
  });

  it("the table-qualified rule wins over a blanket rule for the same tool", () => {
    const cfg = config({
      approval_rules: {
        always_require_approval: ["neon.write", "neon.write:PilotCohortMember"],
        approval_blast_radius: { "neon.write": "high", "neon.write:PilotCohortMember": "medium" },
      },
    });
    // More specific owns the outcome; otherwise adding a blanket rule silently
    // rewrites the blast radius of every table-qualified rule beneath it.
    expect(resolveApprovalRule(cfg, "neon.write", { table: "PilotCohortMember" })).toMatchObject({
      required: true,
      ruleKey: "neon.write:PilotCohortMember",
      blastRadius: "medium",
    });
    expect(resolveApprovalRule(cfg, "neon.write", { table: "Other" })).toMatchObject({
      required: true,
      ruleKey: "neon.write",
      blastRadius: "high",
    });
  });

  it("every shipped agent config still loads and classifies its own tools", async () => {
    for (const key of ["qa-smoke", "pilot-ops", "cloudflare-watcher", "internal-knowledge"]) {
      const cfg = await loadAgentConfig(path.resolve(`agents/${key}.yaml`));
      const unclassified = declaredToolNames(cfg).filter((tool) => {
        const gated = cfg.approval_rules?.always_require_approval ?? [];
        return resolveApprovalRule(cfg, tool).required && !gated.includes(tool);
      });
      expect({ key, unclassified }).toEqual({ key, unclassified: [] });
    }
  });
});

// --- taskEnv allowlist at the queue layer -------------------------------------

describe("taskEnv key allowlist", () => {
  it("keeps allowlisted keys and drops everything else", () => {
    const { allowed, rejected } = filterTaskEnv({
      PAT_PILOT_TASK: "draft-invitation",
      DATABASE_URL: "postgres://evil",
      ANTHROPIC_API_KEY: "sk-ant-nope",
      NODE_OPTIONS: "--require /tmp/x.js",
      PATH: "/tmp",
    });
    expect(allowed).toEqual({ PAT_PILOT_TASK: "draft-invitation" });
    expect(rejected.sort()).toEqual(["ANTHROPIC_API_KEY", "DATABASE_URL", "NODE_OPTIONS", "PATH"]);
  });

  it("drops non-string values", () => {
    const { allowed, rejected } = filterTaskEnv({ PAT_PILOT_TASK: 42 });
    expect(allowed).toEqual({});
    expect(rejected).toEqual(["PAT_PILOT_TASK"]);
  });

  it("tolerates a null/!object taskEnv", () => {
    expect(filterTaskEnv(null)).toEqual({ allowed: {}, rejected: [] });
    expect(filterTaskEnv(["x"])).toEqual({ allowed: {}, rejected: [] });
  });

  it("does not allowlist any credential-bearing variable", () => {
    for (const key of ALLOWED_TASK_ENV_KEYS) {
      expect(key.startsWith("PAT_")).toBe(true);
      expect(/KEY|TOKEN|SECRET|URL|PATH|OPTIONS/i.test(key.replace(/^PAT_/, ""))).toBe(false);
    }
  });
});

// --- yaml ": " split bug -------------------------------------------------------

describe("yaml key separator is quote-aware", () => {
  it("does not split inside a quoted key", () => {
    // Previously: { '"a': 'b": v' }
    expect(parseYaml('"a: b": v\n')).toEqual({ "a: b": "v" });
  });

  it("does not split inside a quoted value", () => {
    // Previously: { 'msg:"a': 'b"' }. A colon with no following space is not a
    // mapping at all, so this now fails loudly instead of producing garbage.
    expect(() => parseYaml('msg:"a: b"\n')).toThrow(/no key separator/);
  });

  it("still parses ordinary values containing a colon-space", () => {
    expect(parseYaml("note: see this: that\n")).toEqual({ note: "see this: that" });
    expect(parseYaml("url: https://x.com/a\n")).toEqual({ url: "https://x.com/a" });
    expect(parseYaml("at: 12:30 UTC\n")).toEqual({ at: "12:30 UTC" });
  });

  it("still classifies sequence items correctly", () => {
    expect(parseYaml("allow:\n  - GET https://x.com/*\n  - dig +short NS a.com\n")).toEqual({
      allow: ["GET https://x.com/*", "dig +short NS a.com"],
    });
    expect(parseYaml("list:\n  - note: hello there\n")).toEqual({ list: [{ note: "hello there" }] });
  });
});

// --- configYaml really is YAML -------------------------------------------------

describe("configYaml round-trip", () => {
  it("emits YAML that parses back to the same config", async () => {
    for (const key of ["qa-smoke", "pilot-ops", "cloudflare-watcher", "hello-world", "ping-sweep"]) {
      const cfg = await loadAgentConfig(path.resolve(`agents/${key}.yaml`));
      const emitted = stringifyYaml(cfg as never);
      // The column is named configYaml; it must hold YAML, not JSON.
      expect(emitted.startsWith("{")).toBe(false);
      expect(parseYaml(emitted)).toEqual(cfg);
    }
  });

  it("quotes scalars that would otherwise parse back as another type", () => {
    const value = { a: "true", b: "12", c: "", d: "- x", e: "has: colon" };
    expect(parseYaml(stringifyYaml(value))).toEqual(value);
  });
});

// --- cron DST spring-forward ---------------------------------------------------

describe("cron DST hour is not dropped", () => {
  // 2026-03-08 in America/New_York: 01:59 EST jumps to 03:00 EDT. Hour 2 does
  // not exist. This test only asserts the gap behaviour when the host actually
  // has that gap, so it stays correct in a UTC CI container.
  const springForward = new Date(2026, 2, 8, 0, 0, 0, 0);
  const hasGap = !localHourExists(springForward, 2);

  it.runIf(hasGap)("fires a catch-up at the first real instant after the gap", () => {
    expect(cronMatches("0 2 * * *", new Date(2026, 2, 8, 3, 0, 0, 0))).toBe(true);
    // Only at that instant — not for the rest of the replacement hour.
    expect(cronMatches("0 2 * * *", new Date(2026, 2, 8, 3, 30, 0, 0))).toBe(false);
  });

  it.runIf(hasGap)("does not fire the catch-up on an ordinary day", () => {
    expect(cronMatches("0 2 * * *", new Date(2026, 2, 9, 3, 0, 0, 0))).toBe(false);
    expect(cronMatches("0 2 * * *", new Date(2026, 2, 9, 2, 0, 0, 0))).toBe(true);
  });

  it("validates expressions field by field", () => {
    expect(isValidCronExpression("0 14 * * 1")).toBe(true); // Mondays at 14:00
    expect(isValidCronExpression("0 0 1 * *")).toBe(true); // 1st of the month
    expect(isValidCronExpression("*/15 * * * *")).toBe(true);
    expect(isValidCronExpression("0 8 * * 7")).toBe(true); // 7 == Sunday
    expect(isValidCronExpression("not a cron")).toBe(false);
    expect(isValidCronExpression("0 99 * * *")).toBe(false); // hour out of range
    expect(isValidCronExpression("60 * * * *")).toBe(false); // minute out of range
    expect(isValidCronExpression("0 8 * *")).toBe(false); // only four fields
  });

  it("leaves unaffected expressions alone", () => {
    expect(cronMatches("0 * * * *", new Date(2026, 2, 8, 3, 0, 0, 0))).toBe(true);
    expect(cronMatches("0 8 * * *", new Date(2026, 2, 8, 8, 0, 0, 0))).toBe(true);
    expect(cronMatches("0 8 * * *", new Date(2026, 2, 8, 9, 0, 0, 0))).toBe(false);
  });
});

// --- heartbeat path is not cwd-relative ---------------------------------------

describe("heartbeat file path", () => {
  it("is absolute and anchored to the repo, not the working directory", () => {
    expect(path.isAbsolute(HEARTBEAT_FILE)).toBe(true);
    expect(HEARTBEAT_FILE.startsWith(REPO_ROOT)).toBe(true);
    expect(HEARTBEAT_FILE.endsWith(path.join("artifacts", "agents", "supervisor-heartbeat.json"))).toBe(true);
  });
});

// --- boot validation -----------------------------------------------------------

describe("boot validation fails fast", () => {
  it("errors when an enabled agent has no registered handler", () => {
    const report = validateBoot([config({ key: "never-registered" })]);
    expect(report.ok).toBe(false);
    expect(report.errors.map((issue) => issue.code)).toContain("no_handler");
  });

  it("does not require a handler for a disabled agent", () => {
    const report = validateBoot([config({ key: "off", enabled: false })]);
    expect(report.errors).toHaveLength(0);
    expect(report.warnings.map((issue) => issue.code)).toContain("disabled");
  });

  it("errors on an incoherent schedule", () => {
    const interval = validateBoot([
      config({ key: "a", enabled: false, schedule: { type: "interval", jitter_seconds: 0, run_on_start: false } }),
    ]);
    // Disabled agents are exempt, so enable it to see the check bite.
    const enabled = validateBoot([
      config({ key: "a", schedule: { type: "interval", jitter_seconds: 0, run_on_start: false } }),
    ]);
    expect(interval.errors.map((issue) => issue.code)).not.toContain("interval_without_period");
    expect(enabled.errors.map((issue) => issue.code)).toContain("interval_without_period");
  });

  it("errors on an unparseable cron expression", () => {
    const report = validateBoot([
      config({ key: "a", schedule: { type: "cron", expression: "not a cron", jitter_seconds: 0, run_on_start: false } }),
    ]);
    expect(report.errors.map((issue) => issue.code)).toContain("cron_unparseable");
  });

  it("accepts a day-of-week expression", () => {
    // Regression: validating by simulating one day rejected "0 14 * * 1"
    // (Mondays) purely because the probe day was a Thursday. Fields are
    // independent, so each is checked against its own range instead.
    const report = validateBoot([
      config({
        key: "a",
        enabled: false,
        schedule: { type: "cron", expression: "0 14 * * 1", jitter_seconds: 0, run_on_start: false },
      }),
    ]);
    expect(report.errors).toHaveLength(0);
  });

  it("errors on duplicate keys", () => {
    const report = validateBoot([config({ key: "dup", enabled: false }), config({ key: "dup", enabled: false })]);
    expect(report.errors.map((issue) => issue.code)).toContain("duplicate_key");
  });

  it("warns about a tool nobody classified", () => {
    const report = validateBoot([
      config({ key: "a", enabled: false, tools: [{ server: "gmail", allow: ["send"] }] }),
    ]);
    // Disabled agents skip the tool audit; enabled ones surface it at boot
    // rather than at 3am when the run pauses for a human.
    const enabled = validateBoot([config({ key: "a", tools: [{ server: "gmail", allow: ["send"] }] })]);
    expect(report.warnings.map((issue) => issue.code)).not.toContain("unclassified_tool");
    expect(enabled.warnings.map((issue) => issue.code)).toContain("unclassified_tool");
  });
});
