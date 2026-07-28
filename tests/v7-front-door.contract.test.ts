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
      // V7 revision — cohort-standing panel adds exactly these locked strings.
      "Cohort standing",
      "Peer view",
      "Peers",
      "Top decile",
      "You",
      // V7 revision 2 — pillar sentence + semantic-dot key.
      "Every PAT score rolls up from five pillars: Strategy, Operations, Automation, Integration, and Governance.",
      "green above peers, amber within, red below",
      "Every number shows its work.",
      "a Patalign™ product",
    ]) {
      expect(src, `missing locked copy: ${phrase}`).toContain(phrase);
    }
  });

  it("section order: nav → hero → doors → radar → cohort → trust (doors above the charts)", () => {
    // Cam's V7 revision — the doors move UP so visitors reach them without
    // scrolling; the radar and the new cohort panel reward the scroll.
    const iHero = src.indexOf("Product selection, without the sales pitch.");
    const iDoors = src.indexOf('data-testid="v7-door-firm"');
    const iRadar = src.indexOf("Alignment radar");
    const iCohort = src.indexOf("Cohort standing");
    const iTrust = src.indexOf("Every number shows its work.");
    expect(iHero).toBeGreaterThan(-1);
    expect(iDoors).toBeGreaterThan(iHero);
    expect(iRadar).toBeGreaterThan(iDoors);
    expect(iCohort).toBeGreaterThan(iRadar);
    expect(iTrust).toBeGreaterThan(iCohort);
  });

  it("arrows are inline SVG glyphs (shared ArrowGlyph), not text glyphs", () => {
    // Single ArrowGlyph component — path defined ONCE, used 4× (2 hero cta-cards
    // at 19px + 2 doors at 22px). The off-center text glyph is gone.
    expect((src.match(/d="m13 6 6 6-6 6"/g) || []).length).toBe(1);
    expect((src.match(/<ArrowGlyph /g) || []).length).toBe(4);
    expect(src).toMatch(/<ArrowGlyph px=\{22\} \/>/); // doors
    expect(src).toMatch(/<ArrowGlyph px=\{19\} \/>/); // hero cta-cards
    expect(src).not.toMatch(/rounded-full[^>]*>\s*→\s*</); // no text-glyph chip
  });

  it("hero CTAs are compact cta-cards (pat-card family), routing correctly", () => {
    expect(src).toMatch(/pat-card[^>]*data-testid="v7-cta-enter"/);
    expect(src).toMatch(/pat-card[^>]*data-testid="v7-cta-meet"/);
    expect(src).toContain('href="/sign-in?view=pat"'); // Meet PAT
  });

  it("cohort you-dots are semantic (green above / amber within / red below)", () => {
    expect(src).toContain("#16a34a"); // up = green
    expect(src).toContain("#d97e22"); // mid = amber
    expect(src).toContain("#c4442e"); // dn = red
    expect(src).toMatch(/tone: "(up|mid|dn)"/);
    expect(src).toContain("green above peers, amber within, red below");
  });

  it("radar carries the dashed peer overlay + You/Peers legend (shape-only)", () => {
    // Peer overlay: a second polygon, dashed #8ba1bd, drawn under the solid navy
    // "you" shape — same convention as the consultant firm-brief radar.
    expect(src).toMatch(/stroke="#8ba1bd"[^>]*strokeDasharray="6 5"/);
    // Legend beneath the svg — solid "You" dot + dashed "Peers" line.
    expect(src).toMatch(/border-dashed border-\[#8ba1bd\]/);
    expect(src).toContain("You");
    expect(src).toContain("Peers");
    // Overlay stays shape-only — no fabricated number rides in on it.
    expect(src).not.toMatch(/stroke="#8ba1bd"[^>]*>\s*\d/);
  });

  it("the cohort panel shares the radar's card-header grammar", () => {
    // PAT mark · divider · label · chip — same header as the radar card.
    expect(src).toMatch(/pat-label">Cohort standing/);
    expect(src).toMatch(/Peer view/);
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
