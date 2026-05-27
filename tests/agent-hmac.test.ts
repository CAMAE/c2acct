import { beforeAll, describe, expect, it } from "vitest";
import { signApproval, verifyApproval } from "@/ops/telegram-bot/hmac";

describe("approval HMAC", () => {
  beforeAll(() => {
    process.env.AGENT_APPROVAL_HMAC_SECRET = "test-secret-do-not-use-in-prod";
  });

  const id = "cmtestapproval0001";
  const createdAt = 1_780_000_000_000;

  it("produces a 16-hex-char signature that round-trips", () => {
    const sig = signApproval(id, createdAt);
    expect(sig).toMatch(/^[0-9a-f]{16}$/);
    expect(verifyApproval(id, createdAt, sig)).toBe(true);
  });

  it("rejects a tampered signature", () => {
    const sig = signApproval(id, createdAt);
    const tampered = `${sig.slice(0, 15)}${sig[15] === "a" ? "b" : "a"}`;
    expect(verifyApproval(id, createdAt, tampered)).toBe(false);
  });

  it("rejects a signature for a different approval id or timestamp", () => {
    const sig = signApproval(id, createdAt);
    expect(verifyApproval("cmtestapproval0002", createdAt, sig)).toBe(false);
    expect(verifyApproval(id, createdAt + 1, sig)).toBe(false);
  });

  it("rejects empty or wrong-length input", () => {
    expect(verifyApproval(id, createdAt, "")).toBe(false);
    expect(verifyApproval(id, createdAt, "abc")).toBe(false);
  });
});
