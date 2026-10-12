import { describe, expect, it } from "vitest";
import { MIN_CONTRIBUTORS } from "@/lib/assessmentCore";
import { firmCohortKeyForBoundary, getFirmCohortFirmCount, getFirmPeerReadings, vendorCohortKeyForBoundary } from "@/lib/benchmarks";
import { loadVerticalPack } from "@/lib/verticals/loader";
import {
  benchmarkCohortKeyWithBand,
  rollUpSizeBand,
  sizeBandForCount,
  sizeBandForSignupOption,
  sizeCountFromSignupOption,
} from "@/lib/verticals/sizeBands";

/**
 * legal-load (R64, delta 4): size bands are a cohort dimension the readers accept,
 * published by vertical alone until a band has MIN_CONTRIBUTORS firms. Schema only:
 * the pack declares the bands, the mapping and the key exist, no compute writes a
 * band cohort yet and no Prisma column was added.
 */

describe("the pack's bands map a size to a band", () => {
  it("a count lands in the band whose range holds it; the open top band has no ceiling", async () => {
    const bands = (await loadVerticalPack("legal")).sizeBands!;
    expect(sizeBandForCount(bands, 1)?.key).toBe("solo-small");
    expect(sizeBandForCount(bands, 5)?.key).toBe("solo-small");
    expect(sizeBandForCount(bands, 6)?.key).toBe("small");
    expect(sizeBandForCount(bands, 20)?.key).toBe("small");
    expect(sizeBandForCount(bands, 21)?.key).toBe("midsize");
    expect(sizeBandForCount(bands, 100)?.key).toBe("midsize");
    expect(sizeBandForCount(bands, 101)?.key).toBe("large-regional");
    expect(sizeBandForCount(bands, 500)?.key).toBe("large-regional");
    expect(sizeBandForCount(bands, 501)?.key).toBe("large");
    expect(sizeBandForCount(bands, 4000)?.key).toBe("large");
    expect(sizeBandForCount(bands, 0)).toBeNull();
    expect(sizeBandForCount(undefined, 10)).toBeNull();
    expect(sizeBandForCount((await loadVerticalPack("accounting")).sizeBands, 10)).toBeNull();
  });

  it("the signup wizard's size option places a firm by its lower bound", async () => {
    const bands = (await loadVerticalPack("legal")).sizeBands!;
    expect(sizeCountFromSignupOption("Just me")).toBe(1);
    expect(sizeCountFromSignupOption("2–4")).toBe(2);
    expect(sizeCountFromSignupOption("11–20")).toBe(11);
    expect(sizeCountFromSignupOption("21+")).toBe(21);
    expect(sizeCountFromSignupOption("200+")).toBe(200);
    expect(sizeCountFromSignupOption("")).toBeNull();
    expect(sizeCountFromSignupOption("a few")).toBeNull();
    expect(sizeBandForSignupOption(bands, "Just me")?.key).toBe("solo-small");
    expect(sizeBandForSignupOption(bands, "5–10")?.key).toBe("solo-small");
    expect(sizeBandForSignupOption(bands, "11–20")?.key).toBe("small");
    expect(sizeBandForSignupOption(bands, "21+")?.key).toBe("midsize");
    expect(sizeBandForSignupOption(bands, null)).toBeNull();
  });
});

describe("the cohort key carries the band as its own segment, and every existing key is unchanged", () => {
  it("no band: today's literal keys; a band: appended after the vertical", () => {
    expect(benchmarkCohortKeyWithBand("firm:real", "accounting", null)).toBe("firm:real");
    expect(benchmarkCohortKeyWithBand("firm:real", "legal", null)).toBe("firm:real:legal");
    expect(benchmarkCohortKeyWithBand("firm:real", "legal", "small")).toBe("firm:real:legal:band:small");
    expect(benchmarkCohortKeyWithBand("firm:demo", "accounting", "mid")).toBe("firm:demo:band:mid");
    expect(benchmarkCohortKeyWithBand("firm:real", "legal", "  ")).toBe("firm:real:legal");
    expect(firmCohortKeyForBoundary("PRODUCTION" as never)).toBe("firm:real");
    expect(firmCohortKeyForBoundary("PRODUCTION" as never, "legal")).toBe("firm:real:legal");
    expect(firmCohortKeyForBoundary("PRODUCTION" as never, "legal", "midsize")).toBe("firm:real:legal:band:midsize");
    expect(vendorCohortKeyForBoundary("DEMO" as never, "legal")).toBe("vendor:demo:legal");
  });

  it("the firm readers accept the band and ask the cohort table for the banded row", async () => {
    const asked: string[] = [];
    const client = {
      benchmarkCohort: { findUnique: async ({ where }: { where: { key: string } }) => (asked.push(where.key), null) },
      benchmarkRun: { findMany: async () => [] },
      companyBenchmark: { findMany: async () => [] },
    } as never;
    await getFirmPeerReadings(client, "co", "PRODUCTION" as never, "legal", "small");
    await getFirmCohortFirmCount(client, "PRODUCTION" as never, "legal", "small");
    await getFirmPeerReadings(client, "co", "PRODUCTION" as never);
    expect(asked).toEqual(["firm:real:legal:band:small", "firm:real:legal:band:small", "firm:real"]);
  });
});

describe("the roll-up rule: a band publishes on its own only at the contributor floor", () => {
  it("under the floor the reader publishes by vertical; at the floor the band stands", () => {
    expect(rollUpSizeBand({ sizeBand: "small", firmsInBand: MIN_CONTRIBUTORS - 1 })).toEqual({ publishBand: null, level: "vertical", firmsInBand: 4, floor: 5 });
    expect(rollUpSizeBand({ sizeBand: "small", firmsInBand: MIN_CONTRIBUTORS })).toEqual({ publishBand: "small", level: "band", firmsInBand: 5, floor: 5 });
    expect(rollUpSizeBand({ sizeBand: null, firmsInBand: 50 }).level).toBe("vertical");
    expect(rollUpSizeBand({ sizeBand: "large", firmsInBand: 0 }).publishBand).toBeNull();
    expect(MIN_CONTRIBUTORS).toBe(5);
  });
});
