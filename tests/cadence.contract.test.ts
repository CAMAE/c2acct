import { describe, expect, it } from "vitest";
import {
  CADENCE_DEFAULTS,
  DEFAULT_PULSE_ROTATION,
  nextCensusDueMs,
  nextPulseDueMs,
  resolveCadence,
  type EffectiveCadence,
} from "@/lib/cadence";
import { FIRM_PILLARS } from "@/lib/firmPillars";

/**
 * 16d — the cadence reader is the ONE resolver (anti-A3). This pins the default
 * fallbacks (absence of a row = system defaults), the field-by-field overrides,
 * the pillar-order rotation default, and the next-due math.
 */
describe("resolveCadence (16d)", () => {
  it("null config resolves to system defaults", () => {
    const c = resolveCadence(null, null);
    expect(c.censusIntervalMonths).toBe(CADENCE_DEFAULTS.censusIntervalMonths);
    expect(c.pulseIntervalMonths).toBe(CADENCE_DEFAULTS.pulseIntervalMonths);
    expect(c.pulseRotation).toEqual([...DEFAULT_PULSE_ROTATION]);
    expect(c.pulseRotation).toEqual([...FIRM_PILLARS]);
    expect(c.source).toBe("default");
    expect(c.censusAnchorMonth).toBeNull();
    expect(c.setByUserId).toBeNull();
  });

  it("census anchor defaults to the month of the last census", () => {
    const c = resolveCadence(null, 7);
    expect(c.censusAnchorMonth).toBe(7);
  });

  it("configured fields override, unset fields still default (partial config)", () => {
    const c = resolveCadence(
      {
        censusIntervalMonths: 6,
        censusAnchorMonth: 3,
        pulseIntervalMonths: null,
        pulseRotation: null,
        setBy: "user-9",
      },
      11
    );
    expect(c.censusIntervalMonths).toBe(6);
    expect(c.censusAnchorMonth).toBe(3);
    expect(c.pulseIntervalMonths).toBe(CADENCE_DEFAULTS.pulseIntervalMonths); // unset → default
    expect(c.pulseRotation).toEqual([...FIRM_PILLARS]); // unset → pillar order
    expect(c.setByUserId).toBe("user-9");
    expect(c.source).toBe("configured");
  });

  it("a valid custom pulse rotation is honored; garbage falls back to pillar order", () => {
    const custom = ["Governance", "Strategy"];
    expect(resolveCadence({ censusIntervalMonths: null, censusAnchorMonth: null, pulseIntervalMonths: null, pulseRotation: custom, setBy: null }, null).pulseRotation).toEqual(custom);
    expect(resolveCadence({ censusIntervalMonths: null, censusAnchorMonth: null, pulseIntervalMonths: null, pulseRotation: [1, 2, 3], setBy: null }, null).pulseRotation).toEqual([...FIRM_PILLARS]);
    expect(resolveCadence({ censusIntervalMonths: null, censusAnchorMonth: null, pulseIntervalMonths: null, pulseRotation: [], setBy: null }, null).pulseRotation).toEqual([...FIRM_PILLARS]);
  });
});

describe("next-due math", () => {
  const cadence: EffectiveCadence = {
    censusIntervalMonths: 12,
    censusAnchorMonth: 1,
    pulseIntervalMonths: 3,
    pulseRotation: [...FIRM_PILLARS],
    setByUserId: null,
    source: "default",
  };

  it("census due one interval after the last census", () => {
    const last = Date.parse("2026-01-15T00:00:00.000Z");
    expect(nextCensusDueMs(last, cadence)).toBe(Date.parse("2027-01-15T00:00:00.000Z"));
    expect(nextCensusDueMs(null, cadence)).toBeNull();
  });

  it("pulse due one interval after the last pulse", () => {
    const last = Date.parse("2026-04-01T00:00:00.000Z");
    expect(nextPulseDueMs(last, cadence)).toBe(Date.parse("2026-07-01T00:00:00.000Z"));
    expect(nextPulseDueMs(null, cadence)).toBeNull();
  });
});
