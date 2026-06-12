import { describe, expect, it, vi } from "vitest";
import {
  AGENT_NARRATIVES_FLAG_ENV,
  buildReportNarrative,
  computeReportDataFingerprint,
  findNarrativeGuardrailViolation,
  isAgentNarrativesEnabled,
  stableStringify,
} from "@/lib/reportNarrative";

const PAYLOAD = {
  picture: { firmCount: 7, vendorCount: 4, averageAlignmentIndex: 65 },
  firmLeague: [
    { companyName: "Demo — Harbor & Co CPAs", alignmentIndex: 74.5, scoredModuleCount: 4 },
    { companyName: "Demo — Meridian Accounting", alignmentIndex: 58, scoredModuleCount: 5 },
  ],
};

function testEnv(overrides: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  return { NODE_ENV: "test", ...overrides };
}

function deps(overrides: Partial<Parameters<typeof buildReportNarrative>[0]["deps"]> = {}) {
  return {
    generate: vi.fn(async () => "The 7 firms average 65."),
    loadCached: vi.fn(async () => null),
    saveCached: vi.fn(async () => undefined),
    log: vi.fn(),
    ...overrides,
  };
}

describe("agent narrative flag", () => {
  it("defaults OFF and only accepts '1' (same pattern as the other pilot flags)", () => {
    expect(isAgentNarrativesEnabled(testEnv())).toBe(false);
    expect(isAgentNarrativesEnabled(testEnv({ [AGENT_NARRATIVES_FLAG_ENV]: "true" }))).toBe(false);
    expect(isAgentNarrativesEnabled(testEnv({ [AGENT_NARRATIVES_FLAG_ENV]: "1" }))).toBe(true);
  });
});

describe("data fingerprint", () => {
  it("is stable across key order and changes when data changes", () => {
    const a = computeReportDataFingerprint({ x: 1, y: [{ b: 2, a: 3 }] });
    const b = computeReportDataFingerprint({ y: [{ a: 3, b: 2 }], x: 1 });
    const c = computeReportDataFingerprint({ x: 1, y: [{ b: 2, a: 4 }] });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(stableStringify({ b: 1, a: 2 })).toBe('{"a":2,"b":1}');
  });
});

describe("guardrails", () => {
  it("rejects insight-engine banned language", () => {
    for (const text of [
      "Compared to the industry average, firms are behind.",
      "This forecast suggests improvement.",
      "Firms sit at the 80th percentile.",
      "Peer firms typically score higher.",
      "Against this benchmark, scores look weak.",
      "Our projection for next quarter is strong.",
    ]) {
      expect(findNarrativeGuardrailViolation(text, PAYLOAD)).toMatch(/banned language/);
    }
  });

  it("rejects numbers that do not appear in the payload", () => {
    const violation = findNarrativeGuardrailViolation(
      "Across 7 firms the average is 65, up 12 points.",
      PAYLOAD
    );
    expect(violation).toMatch(/number not present.*"12"/);
  });

  it("accepts clean narratives whose numbers all come from the payload", () => {
    expect(
      findNarrativeGuardrailViolation(
        "All 7 firms hold a current average alignment index of 65. Harbor & Co leads at 74.5 with 4 of 5 modules scored, while Meridian sits at 58.",
        PAYLOAD
      )
    ).toBeNull();
  });

  it("treats array lengths as payload-derived numbers", () => {
    expect(findNarrativeGuardrailViolation("The 2 scored firms diverge.", PAYLOAD)).toBeNull();
  });
});

describe("buildReportNarrative degradation", () => {
  const base = {
    reportKey: "test-report",
    reportTitle: "Test report",
    payload: PAYLOAD,
  };

  it("returns null when the flag is off (even with key + working generator)", async () => {
    const d = deps();
    const narrative = await buildReportNarrative({
      ...base,
      env: testEnv({ ANTHROPIC_API_KEY: "sk-test" }),
      deps: d,
    });
    expect(narrative).toBeNull();
    expect(d.generate).not.toHaveBeenCalled();
  });

  it("returns null when the key is absent and no generator is injected", async () => {
    const narrative = await buildReportNarrative({
      ...base,
      env: testEnv({ [AGENT_NARRATIVES_FLAG_ENV]: "1" }),
      deps: { loadCached: vi.fn(async () => null), log: vi.fn() },
    });
    expect(narrative).toBeNull();
  });

  it("returns null and logs when generation throws (API failure / timeout)", async () => {
    const d = deps({ generate: vi.fn(async () => { throw new Error("408 timeout"); }) });
    const narrative = await buildReportNarrative({
      ...base,
      env: testEnv({ [AGENT_NARRATIVES_FLAG_ENV]: "1" }),
      deps: d,
    });
    expect(narrative).toBeNull();
    expect(d.log).toHaveBeenCalledWith(expect.stringContaining("generation failed"));
    expect(d.saveCached).not.toHaveBeenCalled();
  });

  it("returns null, logs, and does not cache when the guardrail rejects the response", async () => {
    const d = deps({
      generate: vi.fn(async () => "Firms beat the industry average benchmark."),
    });
    const narrative = await buildReportNarrative({
      ...base,
      env: testEnv({ [AGENT_NARRATIVES_FLAG_ENV]: "1" }),
      deps: d,
    });
    expect(narrative).toBeNull();
    expect(d.log).toHaveBeenCalledWith(expect.stringContaining("guardrail rejection"));
    expect(d.saveCached).not.toHaveBeenCalled();
  });

  it("returns null when the model invents a number", async () => {
    const d = deps({ generate: vi.fn(async () => "Scores rose 23 points across 7 firms.") });
    const narrative = await buildReportNarrative({
      ...base,
      env: testEnv({ [AGENT_NARRATIVES_FLAG_ENV]: "1" }),
      deps: d,
    });
    expect(narrative).toBeNull();
  });

  it("generates, guards, caches, and returns on the happy path", async () => {
    const d = deps();
    const narrative = await buildReportNarrative({
      ...base,
      env: testEnv({ [AGENT_NARRATIVES_FLAG_ENV]: "1" }),
      deps: d,
    });
    expect(narrative).toBe("The 7 firms average 65.");
    expect(d.saveCached).toHaveBeenCalledWith({
      reportKey: "test-report",
      dataFingerprint: computeReportDataFingerprint(PAYLOAD),
      narrative: "The 7 firms average 65.",
    });
  });

  it("serves the cache without calling the API when the fingerprint matches", async () => {
    const d = deps({
      loadCached: vi.fn(async () => ({
        dataFingerprint: computeReportDataFingerprint(PAYLOAD),
        narrative: "Cached narrative.",
      })),
    });
    const narrative = await buildReportNarrative({
      ...base,
      env: testEnv({ [AGENT_NARRATIVES_FLAG_ENV]: "1" }),
      deps: d,
    });
    expect(narrative).toBe("Cached narrative.");
    expect(d.generate).not.toHaveBeenCalled();
  });

  it("regenerates when the underlying data changed", async () => {
    const d = deps({
      loadCached: vi.fn(async () => ({ dataFingerprint: "stale", narrative: "Old." })),
    });
    const narrative = await buildReportNarrative({
      ...base,
      env: testEnv({ [AGENT_NARRATIVES_FLAG_ENV]: "1" }),
      deps: d,
    });
    expect(narrative).toBe("The 7 firms average 65.");
    expect(d.generate).toHaveBeenCalledTimes(1);
  });

  it("still degrades to null (not a throw) when even the cache read explodes", async () => {
    const d = deps({
      loadCached: vi.fn(async () => { throw new Error("relation does not exist"); }),
      generate: vi.fn(async () => { throw new Error("offline"); }),
    });
    await expect(
      buildReportNarrative({ ...base, env: testEnv({ [AGENT_NARRATIVES_FLAG_ENV]: "1" }), deps: d })
    ).resolves.toBeNull();
  });
});
