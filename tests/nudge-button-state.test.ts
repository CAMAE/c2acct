import { describe, expect, it } from "vitest";
import { nudgeButtonText, nudgeStatusFromResponse } from "@/lib/notifications/nudgeButtonState";

describe("nudge button state follows the draft route's answer (R42)", () => {
  it("a created draft reads as drafted", () => {
    expect(nudgeStatusFromResponse(true, { ok: true, draftId: "d1", created: true, status: "PENDING" })).toBe("drafted");
  });
  it("an already-pending draft reads as queued, not as a new draft", () => {
    expect(nudgeStatusFromResponse(true, { ok: true, draftId: "d1", created: false, status: "PENDING" })).toBe("queued");
  });
  it("a non-2xx or unreadable answer reads as error", () => {
    expect(nudgeStatusFromResponse(false, { ok: false, error: "forbidden" })).toBe("error");
    expect(nudgeStatusFromResponse(false, null)).toBe("error");
  });
  it("a 2xx without a created flag still reads as drafted (older route shape)", () => {
    expect(nudgeStatusFromResponse(true, { ok: true })).toBe("drafted");
    expect(nudgeStatusFromResponse(true, null)).toBe("drafted");
  });
  it("labels are distinct per state and the idle label is the caller's", () => {
    const texts = (["idle", "drafting", "drafted", "queued", "error"] as const).map((s) => nudgeButtonText(s, "Request refresh"));
    expect(new Set(texts).size).toBe(5);
    expect(nudgeButtonText("idle", "Request refresh")).toBe("Request refresh");
    expect(nudgeButtonText("drafted", "Request refresh")).toBe("Drafted — review in queue ✓");
    expect(nudgeButtonText("queued", "Request refresh")).toBe("Already in your queue ✓");
  });
});
