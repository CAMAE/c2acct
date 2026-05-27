import { describe, expect, it } from "vitest";
import { cronMatches } from "@/lib/agents/cron";

// Local-time dates (the matcher reads local fields, matching launchd behavior).
const may27_0900 = new Date(2026, 4, 27, 9, 0, 0); // Wed 2026-05-27 09:00
const may27_0930 = new Date(2026, 4, 27, 9, 30, 0);
const may27_0800 = new Date(2026, 4, 27, 8, 0, 0);
const may27_1000 = new Date(2026, 4, 27, 10, 0, 0);

describe("cronMatches", () => {
  it("matches top-of-hour for QA `0 * * * *`", () => {
    expect(cronMatches("0 * * * *", may27_0900)).toBe(true);
    expect(cronMatches("0 * * * *", may27_0800)).toBe(true);
    expect(cronMatches("0 * * * *", may27_0930)).toBe(false);
  });

  it("matches daily 8am for Pilot Ops `0 8 * * *`", () => {
    expect(cronMatches("0 8 * * *", may27_0800)).toBe(true);
    expect(cronMatches("0 8 * * *", may27_0900)).toBe(false);
  });

  it("matches every-two-hours for Cloudflare `0 */2 * * *`", () => {
    expect(cronMatches("0 */2 * * *", may27_0800)).toBe(true); // 8 is even
    expect(cronMatches("0 */2 * * *", may27_1000)).toBe(true); // 10 is even
    expect(cronMatches("0 */2 * * *", may27_0900)).toBe(false); // 9 is odd
  });

  it("supports lists and ranges", () => {
    expect(cronMatches("0 8,9 * * *", may27_0900)).toBe(true);
    expect(cronMatches("0 8-10 * * *", may27_1000)).toBe(true);
    expect(cronMatches("0 8-10 * * *", new Date(2026, 4, 27, 11, 0, 0))).toBe(false);
  });

  it("rejects malformed expressions", () => {
    expect(cronMatches("0 *", may27_0900)).toBe(false);
    expect(cronMatches("", may27_0900)).toBe(false);
  });
});
