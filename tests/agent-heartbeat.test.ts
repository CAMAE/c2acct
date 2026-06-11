import { describe, expect, it } from "vitest";
import { formatSilenceDuration, HeartbeatMonitor } from "@/lib/agents/heartbeat";

const MIN = 60_000;
const THRESHOLD = 15 * MIN;
const REALERT = 60 * MIN;

describe("HeartbeatMonitor", () => {
  it("stays ok while polls keep succeeding", () => {
    const monitor = new HeartbeatMonitor(0, THRESHOLD, REALERT);
    for (let t = MIN; t <= 30 * MIN; t += MIN) {
      monitor.recordOk(t);
      expect(monitor.check(t)).toEqual({ kind: "ok" });
    }
  });

  it("gives a fresh process the full grace window before alerting", () => {
    const monitor = new HeartbeatMonitor(0, THRESHOLD, REALERT);
    expect(monitor.check(THRESHOLD)).toEqual({ kind: "ok" });
    expect(monitor.check(THRESHOLD + MIN).kind).toBe("alert");
  });

  it("alerts once when silence crosses the threshold, then suppresses until the re-alert interval", () => {
    const monitor = new HeartbeatMonitor(0, THRESHOLD, REALERT);
    monitor.recordOk(0);

    expect(monitor.check(16 * MIN)).toEqual({ kind: "alert", silentForMs: 16 * MIN });
    // Still silent, but inside the re-alert interval: suppressed.
    expect(monitor.check(30 * MIN)).toEqual({ kind: "ok" });
    // Past the re-alert interval: hourly reminder while the outage continues.
    expect(monitor.check(16 * MIN + REALERT)).toEqual({
      kind: "still-silent",
      silentForMs: 16 * MIN + REALERT,
    });
    expect(monitor.check(17 * MIN + REALERT)).toEqual({ kind: "ok" });
  });

  it("reports recovery (with outage length) once polls succeed again", () => {
    const monitor = new HeartbeatMonitor(0, THRESHOLD, REALERT);
    monitor.recordOk(0);
    expect(monitor.check(20 * MIN).kind).toBe("alert");

    monitor.recordOk(45 * MIN);
    expect(monitor.check(46 * MIN)).toEqual({ kind: "recovered", silentForMs: 45 * MIN });
    // Back to normal afterwards.
    expect(monitor.check(47 * MIN)).toEqual({ kind: "ok" });
  });

  it("would have caught the June 9 outage shape (17h of silent DB-auth failure)", () => {
    const monitor = new HeartbeatMonitor(0, THRESHOLD, REALERT);
    monitor.recordOk(0);

    let alerts = 0;
    for (let t = MIN; t <= 17 * 60 * MIN; t += MIN) {
      const verdict = monitor.check(t);
      if (verdict.kind === "alert" || verdict.kind === "still-silent") alerts += 1;
    }
    // First alert at ~16 min, then hourly reminders for the rest of the outage.
    expect(alerts).toBeGreaterThanOrEqual(17);
  });
});

describe("formatSilenceDuration", () => {
  it("formats minutes and hours", () => {
    expect(formatSilenceDuration(16 * MIN)).toBe("16 min");
    expect(formatSilenceDuration(17 * 60 * MIN)).toBe("17h 0m");
    expect(formatSilenceDuration(90 * MIN)).toBe("1h 30m");
  });
});
