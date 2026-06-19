import { describe, expect, it } from "vitest";
import {
  dedupeKey,
  exceedsFrequencyCap,
  isKindOptedOut,
  isWithinQuietHours,
  localMinutesOfDay,
  reachedMaxSends,
} from "@/lib/notifications/cadence";

describe("cadence — quiet hours", () => {
  it("same-day window (13:00–17:00) is quiet only inside the window", () => {
    expect(isWithinQuietHours(12 * 60, 13 * 60, 17 * 60)).toBe(false);
    expect(isWithinQuietHours(13 * 60, 13 * 60, 17 * 60)).toBe(true); // inclusive start
    expect(isWithinQuietHours(16 * 60 + 59, 13 * 60, 17 * 60)).toBe(true);
    expect(isWithinQuietHours(17 * 60, 13 * 60, 17 * 60)).toBe(false); // exclusive end
  });

  it("overnight window (22:00–08:00) wraps midnight", () => {
    expect(isWithinQuietHours(23 * 60, 22 * 60, 8 * 60)).toBe(true);
    expect(isWithinQuietHours(2 * 60, 22 * 60, 8 * 60)).toBe(true);
    expect(isWithinQuietHours(12 * 60, 22 * 60, 8 * 60)).toBe(false);
    expect(isWithinQuietHours(8 * 60, 22 * 60, 8 * 60)).toBe(false); // exclusive end
  });

  it("unset or zero-length windows are never quiet", () => {
    expect(isWithinQuietHours(600, null, 480)).toBe(false);
    expect(isWithinQuietHours(600, 480, null)).toBe(false);
    expect(isWithinQuietHours(600, 600, 600)).toBe(false);
  });
});

describe("cadence — localMinutesOfDay", () => {
  it("computes minutes-from-midnight in a timezone", () => {
    const instant = new Date("2026-06-18T13:37:00Z");
    expect(localMinutesOfDay(instant, "UTC")).toBe(13 * 60 + 37);
    // June → EDT (UTC-4) → 09:37 local
    expect(localMinutesOfDay(instant, "America/New_York")).toBe(9 * 60 + 37);
  });
});

describe("cadence — opt-outs, caps, dedupe", () => {
  it("isKindOptedOut only on explicit true", () => {
    expect(isKindOptedOut({ FOO: true }, "FOO")).toBe(true);
    expect(isKindOptedOut({ FOO: false }, "FOO")).toBe(false);
    expect(isKindOptedOut({}, "FOO")).toBe(false);
    expect(isKindOptedOut(null, "FOO")).toBe(false);
  });

  it("frequency cap and max-sends are disabled when limit <= 0", () => {
    expect(exceedsFrequencyCap(99, 0)).toBe(false);
    expect(exceedsFrequencyCap(2, 3)).toBe(false);
    expect(exceedsFrequencyCap(3, 3)).toBe(true);
    expect(reachedMaxSends(99, 0)).toBe(false);
    expect(reachedMaxSends(2, 3)).toBe(false);
    expect(reachedMaxSends(3, 3)).toBe(true);
  });

  it("dedupeKey is stable and null-safe", () => {
    expect(dedupeKey("u1", "Company", "c1", "NUDGE")).toBe("u1::Company::c1::NUDGE");
    expect(dedupeKey("u1", null, null, "NUDGE")).toBe("u1::::::NUDGE");
  });
});
