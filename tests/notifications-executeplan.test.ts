import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PingPlan, PlannedNotification } from "@/lib/notifications/planPings";

/**
 * Executor test. Mocks the store boundary to prove the executor goes through
 * createNotification (so dedupe + preference gating apply), records an automated
 * NudgeEvent per planned send, and tallies created vs suppressed.
 */

vi.mock("@/lib/notifications/store", () => ({
  createNotification: vi.fn(),
  recordNudge: vi.fn(),
}));

import { executePingPlan } from "@/lib/notifications/executePlan";
import { createNotification, recordNudge } from "@/lib/notifications/store";

const create = vi.mocked(createNotification);
const record = vi.mocked(recordNudge);

function planned(over: Partial<PlannedNotification> = {}): PlannedNotification {
  return {
    recipientUserId: "u1",
    audience: "firm",
    kind: "AUTO_FIRM_REMINDER",
    reason: "inactivity",
    title: "t",
    body: "b",
    ctaLabel: null,
    ctaHref: null,
    sourceType: "Company",
    sourceId: "c1",
    ...over,
  };
}

function plan(notifications: PlannedNotification[]): PingPlan {
  return { notifications, evaluated: notifications.length, fired: notifications.length, escalated: 0 };
}

beforeEach(() => {
  vi.clearAllMocks();
  create.mockResolvedValue({ created: true, notification: { id: "n" } } as Awaited<ReturnType<typeof createNotification>>);
  record.mockResolvedValue(undefined);
});

describe("executePingPlan", () => {
  it("handles an empty plan without touching the store", async () => {
    const res = await executePingPlan(plan([]));
    expect(res).toEqual({ created: 0, suppressed: 0, total: 0 });
    expect(create).not.toHaveBeenCalled();
  });

  it("creates each planned notification through the store and records a nudge", async () => {
    const res = await executePingPlan(plan([planned(), planned({ recipientUserId: "u2" })]));
    expect(res).toEqual({ created: 2, suppressed: 0, total: 2 });
    expect(create).toHaveBeenCalledTimes(2);
    expect(record).toHaveBeenCalledTimes(2);
    // automated, not manual
    expect(record.mock.calls[0][0]).toMatchObject({ manual: false });
  });

  it("counts suppressed (deduped/opted-out) plans separately", async () => {
    create
      .mockResolvedValueOnce({ created: true, notification: { id: "n" } } as Awaited<ReturnType<typeof createNotification>>)
      .mockResolvedValueOnce({ created: false, reason: "duplicate" } as Awaited<ReturnType<typeof createNotification>>);
    const res = await executePingPlan(plan([planned(), planned({ recipientUserId: "u2" })]));
    expect(res).toEqual({ created: 1, suppressed: 1, total: 2 });
    // still records the attempt for both
    expect(record).toHaveBeenCalledTimes(2);
  });
});
