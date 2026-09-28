import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { OUTPUT_DISCLAIMER_TEXT } from "@/app/components/trust/OutputDisclaimer";

/**
 * Output disclaimer copy lock (box 3f item K, 2026-09-28). The in-product line is
 * "Not professional advice. Methodology" with Methodology as the link to /methodology.
 * Removing the disclaimer, its link, or the phrase is forbidden; the mount points are
 * enumerated in tests/liability-surface.contract.test.ts.
 */

const component = fs.readFileSync(
  path.join(process.cwd(), "app/components/trust/OutputDisclaimer.tsx"),
  "utf8",
);

describe("output disclaimer copy", () => {
  it("reads exactly 'Not professional advice.'", () => {
    expect(OUTPUT_DISCLAIMER_TEXT).toBe("Not professional advice.");
    expect(OUTPUT_DISCLAIMER_TEXT).not.toMatch(/[\u2014\u2013]/);
  });

  it("links the word Methodology to /methodology as one short line", () => {
    expect(component).toContain('href="/methodology"');
    expect(component).toMatch(/>\s*Methodology\s*<\/Link>/);
    expect(component).toContain('{OUTPUT_DISCLAIMER_TEXT}{" "}');
    expect(component).toContain('data-testid="output-disclaimer"');
    expect(component).toContain('role="note"');
  });
});
