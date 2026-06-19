import { describe, expect, it } from "vitest";
import {
  DEFAULT_MAX_SENDS,
  evaluateNudge,
  shouldEscalateToConsultant,
  type TriggerInput,
} from "@/lib/notifications/triggers";

function input(overrides: Partial<TriggerInput> = {}): TriggerInput {
  return {
    completionPercent: 40,
    daysSinceActivity: 0,
    quarterTargetPercent: null,
    daysToDeadline: null,
    priorSends: 0,
    ...overrides,
  };
}

describe("evaluateNudge", () => {
  it("never fires for a completed target", () => {
    expect(evaluateNudge(input({ completionPercent: 100, daysSinceActivity: 30 }))).toEqual({
      fire: false,
      reason: "none",
    });
  });

  it("never fires once the max-sends cap is reached", () => {
    expect(
      evaluateNudge(input({ daysSinceActivity: 30, priorSends: DEFAULT_MAX_SENDS }))
    ).toEqual({ fire: false, reason: "none" });
  });

  it("fires a deadline reminder when near the due date and behind target", () => {
    expect(
      evaluateNudge(input({ completionPercent: 40, quarterTargetPercent: 80, daysToDeadline: 5 }))
    ).toEqual({ fire: true, reason: "deadline" });
  });

  it("does not fire deadline when the target is already met", () => {
    expect(
      evaluateNudge(input({ completionPercent: 90, quarterTargetPercent: 80, daysToDeadline: 5, daysSinceActivity: 0 }))
    ).toEqual({ fire: false, reason: "none" });
  });

  it("falls through to inactivity when no deadline pressure", () => {
    expect(evaluateNudge(input({ daysSinceActivity: 10 }))).toEqual({
      fire: true,
      reason: "inactivity",
    });
  });

  it("deadline takes priority over inactivity", () => {
    expect(
      evaluateNudge(input({ completionPercent: 30, quarterTargetPercent: 75, daysToDeadline: 3, daysSinceActivity: 30 }))
    ).toEqual({ fire: true, reason: "deadline" });
  });

  it("stays quiet for an active, in-progress target with no deadline", () => {
    expect(evaluateNudge(input({ completionPercent: 50, daysSinceActivity: 1 }))).toEqual({
      fire: false,
      reason: "none",
    });
  });

  it("ignores a past-due (negative) deadline window", () => {
    expect(
      evaluateNudge(input({ completionPercent: 30, quarterTargetPercent: 80, daysToDeadline: -2, daysSinceActivity: 1 }))
    ).toEqual({ fire: false, reason: "none" });
  });
});

describe("shouldEscalateToConsultant", () => {
  it("escalates at or beyond the threshold", () => {
    expect(shouldEscalateToConsultant(3)).toBe(true);
    expect(shouldEscalateToConsultant(4)).toBe(true);
  });
  it("does not escalate below the threshold", () => {
    expect(shouldEscalateToConsultant(2)).toBe(false);
    expect(shouldEscalateToConsultant(0)).toBe(false);
  });
});
