import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  buildFirmPeerPosition,
  buildFirmTrajectory,
  firmEliteHubMetrics,
} from "@/lib/eliteInsightsV2";
import { computeFirmAlignmentIndex } from "@/lib/firmAlignmentSignal";
import type { FirmAlignmentSignal } from "@/lib/firmAlignmentSignal";

/**
 * Block 12f (P0) — number integrity across the ELITE layer. Every quantity PAT
 * presents as a module score, the alignment index, or a cohort count must come
 * from ONE shared reader on Pro panes, Elite panes, face cards, and prose. These
 * lock the equalities so a future edit (or a reseed) that reintroduces a parallel
 * reader fails the build.
 */

const ROOT = "/Users/camerongarrett/work/c2acct-live";
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");

const OP = "firm_alignment_operating_model_v1";
const GOV = "firm_alignment_governance_v1";

// A benchmark client whose STORED company scores are deliberately STALE/WRONG, so
// the test proves the Elite pane ignores them in favour of the live signal.
function mockBenchmarkClient() {
  return {
    benchmarkCohort: { findUnique: async () => ({ id: "cohort-1" }) },
    benchmarkRun: {
      findMany: async () => [
        { metricKey: "alignment_index", n: 999, mean: 65, stdev: 8, p10: 50, p25: 58, p50: 66, p75: 74, p90: 82 },
        { metricKey: OP, n: 999, mean: 60, stdev: 8, p10: 45, p25: 55, p50: 62, p75: 70, p90: 80 },
        { metricKey: GOV, n: 999, mean: 60, stdev: 8, p10: 45, p25: 55, p50: 62, p75: 70, p90: 80 },
      ],
    },
    companyBenchmark: {
      findMany: async (args: { distinct?: string[] }) => {
        if (args.distinct) {
          // distinct firms actually scored in the benchmark table = the honest N
          return [{ companyId: "a" }, { companyId: "b" }, { companyId: "c" }];
        }
        // this firm's STALE stored scores — must NOT surface as "you"
        return [
          { metricKey: "alignment_index", score: 99, percentile: 95 },
          { metricKey: OP, score: 40, percentile: 12 },
          { metricKey: GOV, score: 40, percentile: 12 },
        ];
      },
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

const liveSignal: FirmAlignmentSignal = {
  moduleScores: new Map([
    [OP, 81],
    [GOV, 74],
  ]),
  alignmentIndex: 68,
};

describe("Elite peer position reads the shared live signal, not stored benchmark scores", () => {
  it("module 'you' == live module score (not the stale CompanyBenchmark.score)", async () => {
    const peer = await buildFirmPeerPosition(mockBenchmarkClient(), "co", "DEMO" as never, liveSignal);
    const op = peer.rows.find((r) => r.key === OP);
    const gov = peer.rows.find((r) => r.key === GOV);
    expect(op?.score).toBe(81); // live, not the stored 40
    expect(gov?.score).toBe(74);
    // report card mirrors the same live values
    expect(peer.reportCard.find((r) => r.key === OP)?.you).toBe(81);
  });

  it("overall.score == the live alignment index (not the stored 99)", async () => {
    const peer = await buildFirmPeerPosition(mockBenchmarkClient(), "co", "DEMO" as never, liveSignal);
    expect(peer.overall?.score).toBe(68);
  });

  it("cohort N == distinct firms in the benchmark table (not BenchmarkRun.n)", async () => {
    const peer = await buildFirmPeerPosition(mockBenchmarkClient(), "co", "DEMO" as never, liveSignal);
    expect(peer.overall?.n).toBe(3); // distinct companyIds, not 999
  });

  it("recomputes the percentile from the live score against the benchmark distribution", async () => {
    const peer = await buildFirmPeerPosition(mockBenchmarkClient(), "co", "DEMO" as never, liveSignal);
    // live OP=81 sits above p90(80) → 90th percentile, not the stored 12
    expect(peer.rows.find((r) => r.key === OP)?.percentile).toBe(90);
  });
});

describe("Trajectory 'current' == the alignment index", () => {
  it("the newest history point is the live index, not the last maturity snapshot", async () => {
    const client = {
      firmMaturitySnapshot: {
        findMany: async () => [
          { score: 60, computedAt: new Date("2026-01-15") },
          { score: 81, computedAt: new Date("2026-07-01") },
        ],
      },
      firmMaturityMomentum: { findFirst: async () => null },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any;
    const traj = await buildFirmTrajectory(client, "co", { currentIndex: 68 });
    expect(traj.history.at(-1)?.score).toBe(68); // not 81
    // the hub face metric reads the same current index
    const metrics = firmEliteHubMetrics({
      peer: { available: false, overall: null, bestAction: null, rows: [], reportCard: [], emptyReason: null },
      gapPlan: { available: false, gaps: [], watchList: [], clearedCount: 0, totalCount: 0, emptyReason: null },
      trajectory: traj,
    });
    expect(metrics.firm_tier2_projection?.hero).toBe("68");
  });
});

describe("one shared alignment-index computation", () => {
  it("computeFirmAlignmentIndex rounds the mean of scored modules", () => {
    expect(computeFirmAlignmentIndex([81, 74, 53, 74, 60])).toBe(68);
    expect(computeFirmAlignmentIndex([81, null, 53])).toBe(67);
    expect(computeFirmAlignmentIndex([null, null])).toBeNull();
  });
});

describe("wiring: Pro + Elite surfaces read the shared signal / index", () => {
  it("firm insight body prose reads the report's firmAlignmentIndex (not the per-theme average)", () => {
    const src = read("lib/firmInsightEngine.ts");
    expect(src).toContain("report.firmAlignmentIndex");
    expect(src).toContain("Your firm scores ${indexScore}");
  });

  it("the firm index card + Elite builders are fed by getFirmAlignmentSignal", () => {
    const page = read("app/(app)/firm/insights/page.tsx");
    expect(page).toContain("getFirmAlignmentSignal");
    expect(page).toContain("alignmentSignal.alignmentIndex");
    const detail = read("app/(app)/firm/insights/[key]/page.tsx");
    expect(detail).toContain("getFirmAlignmentSignal");
    expect(detail).toContain("buildFirmPeerPosition(prisma, companyId, boundary, signal)");
  });
});
