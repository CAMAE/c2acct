import { describe, expect, it } from "vitest";
import { parseApprovalDecision } from "@/ops/telegram-bot/approvals";

describe("parseApprovalDecision", () => {
  it("parses a plain approve", () => {
    expect(parseApprovalDecision("approve")).toEqual({ decision: "approve" });
    expect(parseApprovalDecision("yes, lgtm")).toEqual({ decision: "approve" });
  });

  it("parses a plain deny", () => {
    expect(parseApprovalDecision("deny")).toEqual({ decision: "deny" });
    expect(parseApprovalDecision("no, reject this")).toEqual({ decision: "deny" });
  });

  it("parses an edit with a field change", () => {
    expect(parseApprovalDecision("approve but change subject to: TEST EDIT")).toEqual({
      decision: "edit",
      editedArgs: { subject: "TEST EDIT" },
    });
    expect(parseApprovalDecision("approve but change recipient to: noreply@patalign.com")).toEqual({
      decision: "edit",
      editedArgs: { recipient: "noreply@patalign.com" },
    });
  });

  it("fails safe to deny on ambiguous text", () => {
    expect(parseApprovalDecision("hmm not sure")).toEqual({ decision: "deny" });
  });
});
