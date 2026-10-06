import contentDates from "@/lib/generated/contentDates.json";

/**
 * pattern box A (R60, R-R): the "Updated <Month> <year>" line of a content surface
 * is computed from the content file's last commit (scripts/release/content-dates.mjs
 * writes lib/generated/contentDates.json at build), never typed as a literal.
 * Every formatted date is clamped to `now`, so a computed date can never read as
 * the future (the clock test runs it at 2025-09-01 and 2027-09-01).
 */
export type ContentDateFile = "lib/trustContent.ts" | "lib/methodology.ts";

const DATES = contentDates as Record<string, string>;

/** ISO date of the last commit touching the content file (the committed json value). */
export function contentDateIso(file: ContentDateFile): string {
  const iso = DATES[file];
  if (!iso || Number.isNaN(Date.parse(iso))) {
    throw new Error(`lib/generated/contentDates.json has no date for ${file}; run node scripts/release/content-dates.mjs`);
  }
  return iso;
}

export function isIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}/.test(value) && !Number.isNaN(Date.parse(value));
}

/** "<Month> <year>" for a date, clamped so it is never after `now`. */
export function updatedMonthYear(date: Date | string, now: Date = new Date()): string {
  const parsed = date instanceof Date ? date : new Date(date);
  const shown = Number.isNaN(parsed.getTime()) || parsed.getTime() > now.getTime() ? now : parsed;
  return shown.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}

/** The quiet page line: "Updated <Month> <year>", never after `now`. */
export function formatUpdatedLabel(date: Date | string, now: Date = new Date()): string {
  return `Updated ${updatedMonthYear(date, now)}`;
}
