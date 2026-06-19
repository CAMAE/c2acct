import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Store gating + recipient-scoping unit test. Mocks the prisma boundary (no DB),
 * using vi.hoisted so the mock object exists when vi.mock's hoisted factory runs.
 */

const { db } = vi.hoisted(() => ({
  db: {
    notificationPreference: { findUnique: vi.fn() },
    notification: { findFirst: vi.fn(), create: vi.fn(), updateMany: vi.fn(), count: vi.fn() },
    nudgeEvent: { create: vi.fn() },
  },
}));

vi.mock("@/lib/prisma", () => ({ default: db }));

import { createNotification, markRead } from "@/lib/notifications/store";

const baseInput = {
  recipientUserId: "u1",
  audience: "firm",
  kind: "CONSULTANT_FIRM_NUDGE",
  title: "Finish your modules",
  body: "Two left.",
  sourceType: "Company",
  sourceId: "c1",
  actorUserId: "consultant1",
};

beforeEach(() => {
  vi.clearAllMocks();
  db.notificationPreference.findUnique.mockResolvedValue(null);
  db.notification.findFirst.mockResolvedValue(null);
  db.notification.create.mockResolvedValue({ id: "n1" });
  db.notification.updateMany.mockResolvedValue({ count: 1 });
});

describe("createNotification — preference gate", () => {
  it("suppresses when the user disabled in-app notifications", async () => {
    db.notificationPreference.findUnique.mockResolvedValue({ inAppEnabled: false, kindOptOuts: {} });
    const res = await createNotification(baseInput);
    expect(res).toEqual({ created: false, reason: "in_app_disabled" });
    expect(db.notification.create).not.toHaveBeenCalled();
  });

  it("suppresses when the user opted out of this kind", async () => {
    db.notificationPreference.findUnique.mockResolvedValue({
      inAppEnabled: true,
      kindOptOuts: { CONSULTANT_FIRM_NUDGE: true },
    });
    const res = await createNotification(baseInput);
    expect(res).toEqual({ created: false, reason: "kind_opted_out" });
    expect(db.notification.create).not.toHaveBeenCalled();
  });
});

describe("createNotification — dedupe + happy path", () => {
  it("does not create a duplicate of a live (unread) notification", async () => {
    db.notification.findFirst.mockResolvedValue({ id: "existing" });
    const res = await createNotification(baseInput);
    expect(res.created).toBe(false);
    expect(db.notification.create).not.toHaveBeenCalled();
  });

  it("creates when allowed and not duplicated", async () => {
    const res = await createNotification(baseInput);
    expect(res).toEqual({ created: true, notification: { id: "n1" } });
    expect(db.notification.create).toHaveBeenCalledTimes(1);
  });
});

describe("markRead — recipient scoping", () => {
  it("only marks the caller's own notification", async () => {
    const count = await markRead("u1", "n1");
    expect(count).toBe(1);
    expect(db.notification.updateMany).toHaveBeenCalledWith({
      where: { id: "n1", recipientUserId: "u1", readAt: null },
      data: { readAt: expect.any(Date) },
    });
  });
});
