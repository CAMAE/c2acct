import { describe, expect, it } from "vitest";
import { storedCutoffPhrase } from "@/lib/assessmentCore";
import { getBenchmarkArtifactMeta } from "@/lib/benchmarkArtifact";

/**
 * box-c (R65, item 4): a cutoff still in the future reads "Interim · closes <date>",
 * never "Assessments completed by <date>", from the one helper every benchmark
 * surface renders. Clock test at the day before, the day of, and the day after.
 */
const CUTOFF = new Date("2026-12-31T23:59:59.999Z");
const LABEL = "Dec 31, 2026";

describe("future-cutoff wording (box-c item 4)", () => {
  it("the day before: interim", () => {
    expect(storedCutoffPhrase(LABEL, CUTOFF, new Date("2026-12-30T12:00:00.000Z"))).toBe("Interim · closes Dec 31, 2026");
  });
  it("the day of, before the cut closes: interim", () => {
    expect(storedCutoffPhrase(LABEL, CUTOFF.toISOString(), new Date("2026-12-31T12:00:00.000Z"))).toBe("Interim · closes Dec 31, 2026");
  });
  it("the day after: completed", () => {
    expect(storedCutoffPhrase(LABEL, CUTOFF, new Date("2027-01-01T00:00:00.000Z"))).toBe("Assessments completed by Dec 31, 2026");
  });
  it("no instant known: the stored-cut wording, unchanged; no label: not recorded", () => {
    expect(storedCutoffPhrase(LABEL)).toBe("Assessments completed by Dec 31, 2026");
    expect(storedCutoffPhrase(null, CUTOFF)).toBe("Not recorded on this run");
  });
  it("the next-cutoff sentence on the benchmark page reads interim while the quarter is open", () => {
    const artifact = getBenchmarkArtifactMeta(new Date("2026-10-13T00:00:00.000Z"));
    expect(artifact.cutoffSentence).toMatch(/^Interim · closes Dec 31, 2026 for the Q4 2026 benchmark\.$/);
  });
});
