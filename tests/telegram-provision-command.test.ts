import { describe, expect, it } from "vitest";
import { parseProvisionCommand } from "@/ops/telegram-bot/commands";

describe("parseProvisionCommand", () => {
  it("parses kind, email, and a multi-word org name", () => {
    expect(parseProvisionCommand("firm jane@acmecpa.com Acme CPA Group")).toEqual({
      ok: true,
      orgKind: "firm",
      ownerEmail: "jane@acmecpa.com",
      orgName: "Acme CPA Group",
      ownerName: undefined,
    });
  });

  it("parses an optional owner display name after the pipe", () => {
    expect(parseProvisionCommand("vendor ops@bridgepath.example Bridgepath Suite | Jane Smith")).toEqual({
      ok: true,
      orgKind: "vendor",
      ownerEmail: "ops@bridgepath.example",
      orgName: "Bridgepath Suite",
      ownerName: "Jane Smith",
    });
  });

  it("normalizes kind and email casing", () => {
    const parsed = parseProvisionCommand("FIRM Jane@AcmeCPA.com Acme CPA Group");
    expect(parsed.ok).toBe(true);
    expect(parsed.orgKind).toBe("firm");
    expect(parsed.ownerEmail).toBe("jane@acmecpa.com");
  });

  it("rejects unknown org kinds with usage help", () => {
    const parsed = parseProvisionCommand("consultant jane@acmecpa.com Acme CPA Group");
    expect(parsed.ok).toBe(false);
    expect(parsed.error).toContain("firm");
    expect(parsed.error).toContain("Usage: /provision");
  });

  it("rejects a missing org name", () => {
    const parsed = parseProvisionCommand("firm jane@acmecpa.com");
    expect(parsed.ok).toBe(false);
    expect(parsed.error).toContain("Organization name");
  });

  it("rejects malformed email", () => {
    const parsed = parseProvisionCommand("firm not-an-email Acme CPA Group");
    expect(parsed.ok).toBe(false);
    expect(parsed.error).toContain("email");
  });

  it("returns usage for empty args", () => {
    const parsed = parseProvisionCommand("   ");
    expect(parsed.ok).toBe(false);
    expect(parsed.error).toContain("Usage: /provision");
  });
});
