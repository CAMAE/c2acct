import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/** box-c (R65, item 9): the consequence clause renders under the option label on the picks panel and the module page; byte-identical where a set has none. */
const ROOT = path.resolve(__dirname, "..");

describe("consequence clauses (box-c item 9)", () => {
  it("the aggregate rows' top option carries the clause, null where the set has none", () => {
    const source = readFileSync(path.join(ROOT, "lib/assessment/followUpEvidence.ts"), "utf8");
    expect((source.match(/consequence: string \| null; count: number \} \| null;/g) ?? []).length).toBe(1); // one row type, shared by the firm and vendor aggregates
    expect((source.match(/consequence: option\.consequence \?\? null, count \}/g) ?? []).length).toBe(2);
  });
  it("both renderers print the clause as a muted second line, and the sitting view passes it through only when present", () => {
    const panel = readFileSync(path.join(ROOT, "app/components/assessment/FollowUpAggregatePanel.tsx"), "utf8");
    expect(panel).toMatch(/row\.topOption\?\.consequence \? \(/);
    const page = readFileSync(path.join(ROOT, "app/(app)/firm/modules/[templateId]/page.tsx"), "utf8");
    expect(page).toMatch(/choice\.consequence \? \(/);
    const portal = readFileSync(path.join(ROOT, "lib/modules/portal.ts"), "utf8");
    expect(portal).toMatch(/consequence\?: string/);
    expect(portal).toMatch(/typeof choice\.consequence === "string"/);
  });
});
