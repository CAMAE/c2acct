import { describe, expect, it } from "vitest";
import {
  AUTO_KIND,
  ESCALATION_KIND,
  planPings,
  wholeDaysBetween,
  type PingTarget,
} from "@/lib/notifications/planPings";

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 5, 18, 12, 0, 0); // fixed reference instant

function target(overrides: Partial<PingTarget> = {}): PingTarget {
  return {
    companyId: "firm1",
    audience: "firm",
    completionPercent: 40,
    lastActivityMs: NOW, // active by default
    quarterTargetPercent: null,
    quarterDueMs: null,
    priorSends: 0,
    ignoredCount: 0,
    recipientUserIds: ["u1", "u2"],
    consultantUserId: "consultant1",
    ...overrides,
  };
}

describe("wholeDaysBetween", () => {
  it("floors to whole days regardless of intraday time", () => {
    expect(wholeDaysBetween(NOW, NOW)).toBe(0);
    expect(wholeDaysBetween(NOW - 23 * 60 * 60 * 1000, NOW)).toBe(0); // <24h
    expect(wholeDaysBetween(NOW - 10 * DAY, NOW)).toBe(10);
  });
});

describe("planPings", () => {
  it("fires an inactivity reminder to every recipient when stale", () => {
    const plan = planPings([target({ lastActivityMs: NOW - 10 * DAY })], NOW);
    expect(plan.fired).toBe(1);
    const reminders = plan.notifications.filter((n) => n.kind === AUTO_KIND.firm);
    expect(reminders.map((n) => n.recipientUserId)).toEqual(["u1", "u2"]);
    expect(reminders[0].reason).toBe("inactivity");
  });

  it("does not fire for an active, in-progress target", () => {
    const plan = planPings([target({ lastActivityMs: NOW - 1 * DAY })], NOW);
    expect(plan.fired).toBe(0);
    expect(plan.notifications.filter((n) => n.kind !== ESCALATION_KIND)).toHaveLength(0);
  });

  it("fires a deadline reminder when near the quarter due date and behind target", () => {
    const plan = planPings(
      [target({ completionPercent: 30, quarterTargetPercent: 80, quarterDueMs: NOW + 5 * DAY })],
      NOW
    );
    const reminders = plan.notifications.filter((n) => n.kind === AUTO_KIND.firm);
    expect(reminders).toHaveLength(2);
    expect(reminders[0].reason).toBe("deadline");
  });

  it("escalates to the consultant after the ignored threshold", () => {
    const plan = planPings([target({ ignoredCount: 3 })], NOW);
    const esc = plan.notifications.filter((n) => n.kind === ESCALATION_KIND);
    expect(plan.escalated).toBe(1);
    expect(esc).toHaveLength(1);
    expect(esc[0].recipientUserId).toBe("consultant1");
    expect(esc[0].audience).toBe("consultant");
  });

  it("does not escalate without a managing consultant", () => {
    const plan = planPings([target({ ignoredCount: 5, consultantUserId: null })], NOW);
    expect(plan.escalated).toBe(0);
  });

  it("counts evaluated targets and uses vendor cta/kind for vendors", () => {
    const plan = planPings(
      [target({ audience: "vendor", companyId: "vendor1", lastActivityMs: NOW - 9 * DAY, recipientUserIds: ["v1"] })],
      NOW
    );
    expect(plan.evaluated).toBe(1);
    const reminder = plan.notifications.find((n) => n.kind === AUTO_KIND.vendor);
    expect(reminder?.ctaHref).toBe("/vendor/product-assessment");
  });
});
