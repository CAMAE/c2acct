import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadAgentConfig, resolveApprovalRule } from "@/lib/agents/config";

// Pilot Ops gating: gmail.draft and Neon writes to User / PilotCohortMember
// require approval (the predicate canUseTool's sibling check enforces); reads do
// not. This is the "writes require approval" hard rule, table-qualified.
describe("pilot-ops approval gating", () => {
  const configPromise = loadAgentConfig(path.resolve("agents/pilot-ops.yaml"));

  it("requires approval for gmail.draft", async () => {
    const config = await configPromise;
    const rule = resolveApprovalRule(config, "gmail.draft", { to: "x@example.com" });
    expect(rule.required).toBe(true);
    expect(rule.blastRadius).toBe("medium");
  });

  it("requires approval for table-qualified neon writes", async () => {
    const config = await configPromise;
    expect(resolveApprovalRule(config, "neon.write", { table: "User" })).toMatchObject({
      required: true,
      ruleKey: "neon.write:User",
      blastRadius: "high",
    });
    expect(resolveApprovalRule(config, "neon.write", { table: "PilotCohortMember" })).toMatchObject({
      required: true,
      ruleKey: "neon.write:PilotCohortMember",
    });
  });

  it("does NOT require approval for tools classified as safe", async () => {
    const config = await configPromise;
    // Under deny-by-default (S7) these are ungated because pilot-ops.yaml lists
    // them in never_require_approval — not because "unlisted" used to mean safe.
    expect(resolveApprovalRule(config, "neon.read", { table: "PilotCohortMember" }).required).toBe(false);
    expect(resolveApprovalRule(config, "telegram.send_message", {}).required).toBe(false);
  });

  it("gates a neon write to a table nobody classified", async () => {
    const config = await configPromise;
    // Badge has no table-qualified rule. The OLD behaviour let it through
    // ungated; now the blanket "neon.write" gate catches it, so an unlisted
    // write pauses for an operator instead of running unattended — and it
    // carries that rule's explicit high blast radius, not "unknown".
    const rule = resolveApprovalRule(config, "neon.write", { table: "Badge" });
    expect(rule.required).toBe(true);
    expect(rule.ruleKey).toBe("neon.write");
    expect(rule.blastRadius).toBe("high");
  });

  it("gates a tool that appears in neither list", async () => {
    const config = await configPromise;
    // unknown-tool-requires-approval: the deny-by-default contract itself.
    const rule = resolveApprovalRule(config, "gmail.send_as_user", { to: "x@example.com" });
    expect(rule.required).toBe(true);
    expect(rule.ruleKey).toBe("gmail.send_as_user");
    expect(rule.blastRadius).toBe("unknown");
  });
});
