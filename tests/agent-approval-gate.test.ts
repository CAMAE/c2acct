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

  it("does NOT require approval for reads", async () => {
    const config = await configPromise;
    expect(resolveApprovalRule(config, "neon.read", { table: "PilotCohortMember" }).required).toBe(false);
    expect(resolveApprovalRule(config, "telegram.send_message", {}).required).toBe(false);
  });

  it("does not gate a neon write to an unlisted table", async () => {
    const config = await configPromise;
    // Only User / PilotCohortMember writes are gated; a different table is not in
    // the approval rules (allowlist scope is the separate guard that blocks it).
    expect(resolveApprovalRule(config, "neon.write", { table: "Badge" }).required).toBe(false);
  });
});
