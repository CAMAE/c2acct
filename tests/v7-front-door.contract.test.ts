import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Block 19 — V7 front door. Pins: (1) dark behind PAT_ENABLE_NEW_FRONT_DOOR (the
 * current page is the untouched default); (2) copy locked to the mockup; (3) the
 * radar is data-free — no fabricated numbers/percentages anywhere; (4) door cards
 * preselect the sign-in role.
 */

const ROOT = path.resolve(__dirname, "..");
const src = readFileSync(path.join(ROOT, "app/components/frontdoor/V7FrontDoor.tsx"), "utf8");
const pageSrc = readFileSync(path.join(ROOT, "app/page.tsx"), "utf8");

describe("V7 front door", () => {
  it("is dark behind the flag — page returns V7 only when enabled, default untouched", () => {
    expect(pageSrc).toMatch(/if \(isNewFrontDoorEnabled\(\)\)[\s\S]{0,80}return <V7FrontDoor/);
  });

  it("copy is locked to the mockup (~40 words)", () => {
    for (const phrase of [
      "Performance Alignment Technology",
      "Product selection, without the sales pitch.",
      "Real assessments. Evidence both sides can trust.",
      "Enter PAT",
      "Meet PAT",
      "Alignment radar",
      "Five pillars",
      "Score your stack.",
      "Earn the evidence.",
      "Every number shows its work.",
      "a Patalign™ product",
    ]) {
      expect(src, `missing locked copy: ${phrase}`).toContain(phrase);
    }
  });

  it("door cards route to sign-in with the role preselected", () => {
    expect(src).toContain("/sign-in?view=firm");
    expect(src).toContain("/sign-in?view=vendor");
  });

  it("footer keeps product parity — 'Build proof' → /release", () => {
    expect(src).toMatch(/href="\/release"[^>]*>\s*Build proof/);
  });

  it("renders full-bleed — hides the app shell chrome so it matches the standalone mockup", () => {
    // The root layout wraps every page in AppHeader + app <footer> +
    // pat-shell-main; the front door must suppress that shell (it has its own
    // nav + footer) or it double-stacks. Pin the escape so a refactor can't
    // silently reintroduce the double header/footer.
    expect(src).toMatch(/body\.pat-shell > header[^{]*\{[^}]*display:\s*none/);
    expect(src).toContain("body.pat-shell > footer");
    // main.pat-shell-main is `flex flex-1`; the escape MUST restore block flow or
    // the V7 root collapses to content width (~796px) pinned left in the flex row.
    expect(src).toMatch(/main\.pat-shell-main\{display:\s*block/);
  });

  it("the radar is data-free — no fabricated scores/percentages on the front door", () => {
    // No VISIBLE percentage (a fabricated score); SVG gradient geometry like
    // cx="50%" lives in attributes, not rendered text, so it's excluded.
    expect(src).not.toMatch(/>\s*\d+%/);
    expect(src).not.toMatch(/\d+\s*%\s*</);
    // The five pillars render as NAMES, not numbers.
    for (const pillar of ["Strategy", "Operations", "Automation", "Integration", "Governance"]) {
      expect(src).toContain(pillar);
    }
    // No score-like <text> nodes (a digit immediately inside an SVG text element).
    expect(src).not.toMatch(/<text[^>]*>\s*\d/);
  });
});
