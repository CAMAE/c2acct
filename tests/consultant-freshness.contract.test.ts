import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  getConsultantFreshnessBoard,
  quarterCutoff,
  type FreshnessBoardClient,
} from "@/lib/consultantFreshness";

/**
 * 16e — the consultant freshness board (P2-1). Pins: (1) it resolves freshness +
 * cadence through the ONE canonical reader each (anti-A3, source-scan below);
 * (2) firms dedup across ecosystems; (3) status classification off the cadence
 * next-due vs the quarter cutoff; (4) summary counts; (5) governance — never
 * assumes staleness from missing data.
 */

const ROOT = path.resolve(__dirname, "..");
const DAY = 86_400_000;

// now = 2026-07-17 (Q3 → cutoff Sep 30, 2026).
const NOW = new Date("2026-07-17T12:00:00.000Z");

function makeClient(
  snaps: Record<string, Date | null>,
  configs: Record<string, Partial<{ censusIntervalMonths: number }>> = {}
): FreshnessBoardClient {
  return {
    firmMaturitySnapshot: {
      groupBy: async ({ where }) =>
        where.companyId.in.map((companyId) => ({
          companyId,
          _max: { computedAt: snaps[companyId] ?? null },
        })),
    },
    cadenceConfig: {
      findMany: async ({ where }) =>
        where.companyId.in
          .filter((id) => configs[id])
          .map((companyId) => ({
            companyId,
            censusIntervalMonths: configs[companyId].censusIntervalMonths ?? null,
            censusAnchorMonth: null,
            pulseIntervalMonths: null,
            pulseRotation: null,
            setBy: null,
          })),
    },
  };
}

function access(ecosystems: Array<{ ecosystemName: string; vendorCompanyName: string | null; firmCompanies: { id: string; name: string }[] }>) {
  return {
    ecosystems: ecosystems.map((e, i) => ({
      assignmentId: `a${i}`,
      ecosystemId: `e${i}`,
      ecosystemName: e.ecosystemName,
      vendorCompanyId: null,
      vendorCompanyName: e.vendorCompanyName,
      firmCompanies: e.firmCompanies,
    })),
  };
}

describe("quarterCutoff", () => {
  it("returns the last instant of the calendar quarter", () => {
    expect(quarterCutoff(new Date("2026-07-17T00:00:00Z")).toISOString()).toBe("2026-09-30T23:59:59.999Z");
    expect(quarterCutoff(new Date("2026-01-05T00:00:00Z")).toISOString()).toBe("2026-03-31T23:59:59.999Z");
    expect(quarterCutoff(new Date("2026-12-31T00:00:00Z")).toISOString()).toBe("2026-12-31T23:59:59.999Z");
  });
});

describe("getConsultantFreshnessBoard (16e)", () => {
  it("dedups a firm reached through multiple ecosystems, collecting contexts", async () => {
    const board = await getConsultantFreshnessBoard(
      access([
        { ecosystemName: "Eco A", vendorCompanyName: "Meridian", firmCompanies: [{ id: "f1", name: "Firm One" }] },
        { ecosystemName: "Eco B", vendorCompanyName: "Northstar", firmCompanies: [{ id: "f1", name: "Firm One" }] },
      ]),
      NOW,
      makeClient({ f1: new Date(NOW.getTime() - 10 * DAY) })
    );
    expect(board.firms).toHaveLength(1);
    expect(board.firms[0].ecosystems).toEqual(["Meridian", "Northstar"]);
    expect(board.summary.total).toBe(1);
  });

  it("classifies never / overdue / due-soon / on-track off cadence vs the quarter cutoff", async () => {
    const board = await getConsultantFreshnessBoard(
      access([
        {
          ecosystemName: "Eco",
          vendorCompanyName: "V",
          firmCompanies: [
            { id: "never", name: "Never" },
            { id: "overdue", name: "Overdue" }, // census 13mo ago, +12mo default → due 1mo ago
            { id: "due-soon", name: "Due Soon" }, // census ~11.5mo ago → due ~2 weeks out (< Sep 30)
            { id: "ontrack", name: "On Track" }, // census 1mo ago → due ~11mo out (> Sep 30)
          ],
        },
      ]),
      NOW,
      makeClient({
        never: null,
        overdue: new Date(Date.UTC(2025, 5, 17)), // 2025-06-17 → +12mo = 2026-06-17 (past)
        "due-soon": new Date(Date.UTC(2025, 8, 20)), // 2025-09-20 → +12mo = 2026-09-20 (≤ cutoff)
        ontrack: new Date(Date.UTC(2026, 5, 17)), // 2026-06-17 → +12mo = 2027-06-17 (> cutoff)
      })
    );
    const byId = Object.fromEntries(board.firms.map((f) => [f.companyId, f.status]));
    expect(byId.never).toBe("never");
    expect(byId.overdue).toBe("overdue");
    expect(byId["due-soon"]).toBe("due-soon");
    expect(byId.ontrack).toBe("on-track");

    expect(board.summary).toMatchObject({ total: 4, never: 1, overdue: 1, dueSoon: 1, onTrack: 1, needsAttention: 3 });
    // Never + overdue sort ahead of on-track.
    expect(board.firms[0].status).toBe("never");
  });

  it("never assumes staleness from missing evidence (freshness null, status never)", async () => {
    const board = await getConsultantFreshnessBoard(
      access([{ ecosystemName: "Eco", vendorCompanyName: "V", firmCompanies: [{ id: "f", name: "F" }] }]),
      NOW,
      makeClient({ f: null })
    );
    expect(board.firms[0].freshness).toBeNull();
    expect(board.firms[0].status).toBe("never");
    expect(board.firms[0].nextCensusDueIso).toBeNull();
  });

  it("honors a configured shorter census interval when classifying", async () => {
    // 5 months old; default 12mo → on-track, but a 3mo interval → overdue.
    const lastCensus = new Date(NOW.getTime() - 150 * DAY);
    const withDefault = await getConsultantFreshnessBoard(
      access([{ ecosystemName: "E", vendorCompanyName: "V", firmCompanies: [{ id: "f", name: "F" }] }]),
      NOW,
      makeClient({ f: lastCensus })
    );
    expect(withDefault.firms[0].status).toBe("on-track");

    const withShort = await getConsultantFreshnessBoard(
      access([{ ecosystemName: "E", vendorCompanyName: "V", firmCompanies: [{ id: "f", name: "F" }] }]),
      NOW,
      makeClient({ f: lastCensus }, { f: { censusIntervalMonths: 3 } })
    );
    expect(withShort.firms[0].status).toBe("overdue");
    expect(withShort.firms[0].cadenceSource).toBe("configured");
  });

  it("empty consultant (no ecosystems) yields an empty board, not an error", async () => {
    const board = await getConsultantFreshnessBoard(access([]), NOW, makeClient({}));
    expect(board.firms).toEqual([]);
    expect(board.summary.total).toBe(0);
  });
});

describe("anti-A3 — board reads the canonical freshness + cadence libs", () => {
  it("lib/consultantFreshness.ts imports both shared readers, no local re-derivation", () => {
    const text = readFileSync(path.join(ROOT, "lib/consultantFreshness.ts"), "utf8");
    expect(text).toMatch(/from "@\/lib\/freshness"/);
    expect(text).toMatch(/from "@\/lib\/cadence"/);
    // No hardcoded freshness day thresholds re-implemented here.
    expect(text).not.toMatch(/\b365\b/);
    expect(text).not.toMatch(/\b90\b/);
  });
});
