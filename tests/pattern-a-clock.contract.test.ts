import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { monthYear } from "@/app/components/shell/PageHead";
import { contentDateIso, formatUpdatedLabel, updatedMonthYear } from "@/lib/contentDates";
import { TRUST_SURFACE_LAST_UPDATED, TRUST_SURFACES } from "@/lib/trustContent";

/**
 * pattern box A (R60, R-R): dates are computed or read from git, and a computed
 * date never reads as the future. The clock test runs the formatter at
 * 2025-09-01 and 2027-09-01 (and at now minus / plus 400 days) and checks every
 * produced month is at or before `now`.
 */
const ROOT = path.resolve(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");
const CLOCKS = [new Date("2025-09-01T00:00:00Z"), new Date("2027-09-01T00:00:00Z"), new Date(Date.now() - 400 * 86_400_000), new Date(Date.now() + 400 * 86_400_000)];

function monthIndex(label: string): number {
  const [month, year] = label.replace(/^Updated /, "").split(" ");
  return Number(year) * 12 + new Date(`${month} 1, 2000`).getMonth();
}

describe("clock test — computed dates never read as the future", () => {
  const sources = [TRUST_SURFACE_LAST_UPDATED, contentDateIso("lib/methodology.ts"), "2026-09-28T18:49:04-05:00", "2031-01-01T00:00:00Z", "1999-12-31T00:00:00Z"];
  for (const now of CLOCKS) {
    it(`at now = ${now.toISOString().slice(0, 10)} every label is at or before now`, () => {
      const nowIndex = now.getUTCFullYear() * 12 + now.getUTCMonth();
      for (const source of sources) {
        const label = formatUpdatedLabel(source, now);
        expect(label).toMatch(/^Updated [A-Z][a-z]+ \d{4}$/);
        expect(monthIndex(label), `${source} at ${now.toISOString()}`).toBeLessThanOrEqual(nowIndex);
        expect(monthYear(source, now)).toBe(updatedMonthYear(source, now));
      }
    });
  }

  it("a date before now keeps its own month; a date after now clamps to now", () => {
    const now = new Date("2027-09-01T00:00:00Z");
    expect(formatUpdatedLabel("2026-09-28T18:49:04-05:00", now)).toBe("Updated September 2026");
    expect(formatUpdatedLabel("2031-01-01T00:00:00Z", now)).toBe("Updated September 2027");
    expect(formatUpdatedLabel("not a date", now)).toBe("Updated September 2027");
  });

  it("a dated changelog entry keeps its own month and year (history, not a computed date)", () => {
    expect(monthYear("July 10, 2026")).toBe("July 2026");
    expect(read("lib/methodology.ts")).toContain('date: "July 17, 2026"');
  });
});

describe("content dates come from git", () => {
  it("lib/generated/contentDates.json carries both content files as ISO dates at or before now", () => {
    const dates = JSON.parse(read("lib/generated/contentDates.json")) as Record<string, string>;
    for (const file of ["lib/trustContent.ts", "lib/methodology.ts"]) {
      expect(dates[file]).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(Date.parse(dates[file])).toBeLessThanOrEqual(Date.now());
    }
    expect(TRUST_SURFACE_LAST_UPDATED).toBe(dates["lib/trustContent.ts"]);
  });

  it("no trust surface carries a literal date; every lastUpdated is a computed ISO value", () => {
    const literal = /"(January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}"/;
    expect(read("lib/trustContent.ts")).not.toMatch(literal);
    for (const surface of Object.values(TRUST_SURFACES) as Array<{ lastUpdated: string }>) {
      expect(surface.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    }
  });

  it("both builds write the json: bake-release (cloud) and build-lock (local)", () => {
    expect(read("scripts/release/bake-release.mjs")).toContain("writeContentDates(ROOT);");
    expect(read("scripts/release/build-lock.mjs")).toContain('["node", ["scripts/release/content-dates.mjs"]]');
  });
});
