import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { isAskPatDoorEntryEnabled } from "@/lib/frontDoor";
import { TRUST_FOOTER_LINKS } from "@/lib/trustContent";

/**
 * Block 19 — V7 front door. Block 21a STEP 2b DEDUPE split it in two:
 *   - V7FrontDoor.tsx is now just the front-door CONTENT (hero → doors → radar →
 *     cohort → trust band). It carries NO nav/footer/escape/wrapper of its own.
 *   - V7PublicShell.tsx owns the shared public SHELL (V7 nav + EN/FR/ES selector +
 *     product footer), rendered ONCE by the (public) route-group layout.
 * Pins: (1) dark behind PAT_ENABLE_NEW_FRONT_DOOR; (2) copy locked to the mockup;
 * (3) the radar is data-free; (4) door cards preselect the sign-in role; (5) the
 * content no longer double-renders the shell chrome.
 */

const ROOT = path.resolve(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");
const src = read("app/components/frontdoor/V7FrontDoor.tsx"); // content only
const shell = read("app/components/frontdoor/V7PublicShell.tsx"); // shared public shell
const pageSrc = read("app/(public)/page.tsx");
const publicLayout = read("app/(public)/layout.tsx");

describe("V7 front door — dark behind the flag", () => {
  it("page returns the V7 content only when enabled; the default page is untouched", () => {
    expect(pageSrc).toMatch(/if \(isNewFrontDoorEnabled\(\)\)[\s\S]{0,80}return <V7FrontDoor/);
  });

  it("the (public) group layout wraps the V7 content in V7PublicShell only when enabled", () => {
    expect(publicLayout).toMatch(/isNewFrontDoorEnabled\(\)[\s\S]{0,120}<V7PublicShell>/);
    expect(publicLayout).toMatch(/<AppShell>\{children\}<\/AppShell>/); // flag-off path
  });
});

describe("V7 front door — content (V7FrontDoor)", () => {
  it("copy is locked to the mockup", () => {
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
      "Cohort standing",
      "Peer view",
      "Peers",
      "Top decile",
      "You",
    ]) {
      expect(src, `missing locked copy: ${phrase}`).toContain(phrase);
    }
  });

  it("content order: hero → band (doors) → radar → cohort (doors above the charts)", () => {
    const iHero = src.indexOf("Product selection, without the sales pitch.");
    const iDoors = src.indexOf('data-testid="v7-door-firm"');
    const iRadar = src.indexOf("Alignment radar");
    const iCohort = src.indexOf("Cohort standing");
    const iTrust = src.lastIndexOf("Cohort standing"); // the door ends on the cohort panel (accordion removed, depth box 0.2)
    expect(iHero).toBeGreaterThan(-1);
    expect(iDoors).toBeGreaterThan(iHero);
    expect(iRadar).toBeGreaterThan(iDoors);
    expect(iCohort).toBeGreaterThan(iRadar);
    expect(iTrust).toBeGreaterThanOrEqual(iCohort);
  });

  it("DEDUPE — content carries NO shell chrome of its own (nav/footer/escape/wrapper)", () => {
    // The shell (nav + footer + the pat-label scope) lives in V7PublicShell; the
    // content must not reintroduce a second nav/footer or a full-bleed escape, or it
    // double-stacks under the (public) group layout.
    expect(src).not.toContain("<nav");
    expect(src).not.toContain("<footer");
    expect(src).not.toContain("body.pat-shell"); // no full-bleed escape
    expect(src).not.toContain('data-testid="v7-front-door"'); // wrapper div is gone
    // No self-owned min-h-screen wrapper (the shell provides it). Allow the word in
    // comments but not in JSX className.
    expect(src).not.toMatch(/className="[^"]*min-h-screen/);
  });

  it("V3 hero CTA band — one band at the container width, three cells, no circle-arrow icons", () => {
    const srcPxBefore = 6; // text-[Npx] utilities left in V7FrontDoor (hero, radar, cohort) — the band adds none
    // One band replaces the Enter/Meet cta-card row and the Firms/Vendors door row.
    expect(src).toMatch(/data-testid="v7-hero-band"/);
    expect(src).toMatch(/rounded-\[28px\][^"]*md:grid-cols-\[1\.2fr_1fr_1fr\]/);
    expect(src).not.toContain("ArrowGlyph"); // the circle-arrow chips are gone
    // Cell 1: tinted, eyebrow, filled Enter PAT pill (white label, 46px) + ghost Meet PAT pill.
    expect(src).toMatch(/pat-hover-card[^"]*bg-\[#f4f7fb\]/);
    expect(src).toContain("Start here");
    expect(src).toMatch(/href="\/sign-in"[\s\S]{0,240}v7-band-pill[^"]*rounded-full bg-\[var\(--brand-c2-blue\)\][^"]*text-white[\s\S]{0,160}data-testid="v7-cta-enter"/);
    expect(src).toMatch(/href="\/sign-in\?view=pat"[\s\S]{0,240}v7-band-pill[^"]*rounded-full border[\s\S]{0,360}data-testid="v7-cta-meet"/);
    expect((src.match(/text-\[\d+px\]/g) || []).length).toBe(srcPxBefore); // no new px utilities for the band
    // Cells 2/3: the whole cell is the link — eyebrow, line, inline arrow in blue.
    expect(src).toMatch(/<Link\s+href="\/sign-in\?view=firm"\s+className="pat-hover-card[\s\S]{0,500}Score your stack\.[\s\S]{0,240}text-\[var\(--brand-c2-blue\)\]/);
    expect(src).toMatch(/<Link\s+href="\/sign-in\?view=vendor"\s+className="pat-hover-card[\s\S]{0,500}Earn the evidence\./);
    // Hairline dividers: stacked at 390 (border-t), side by side from md (border-l).
    expect((src.match(/border-t border-\[var\(--shell-border\)\][^"]*md:border-l md:border-t-0/g) || []).length).toBe(2);
    // Hover: the ONE shared card hover (depth box 0.1) — border to blue, ≤2% tint, 150ms.
    const css = read("app/globals.css");
    expect(css).toMatch(/\.v7-band-pill \{\s*height: 46px;\s*font-size: 16px;/);
    expect(css).toMatch(/\.v7-band-arrow \{\s*font-size: 28px;/);
    expect(css.indexOf(".pat-hover-card {")).toBeLessThan(css.indexOf("Facelift Part 2 — portal token pass"));
    expect((src.match(/className="pat-hover-card /g) || []).length).toBe(3); // start cell + two door cells
    expect(src).not.toContain("v7-band-cell");
  });

  it("hero CTAs route correctly", () => {
    expect(src).toMatch(/href="\/sign-in"[\s\S]{0,400}data-testid="v7-cta-enter"/);
    expect(src).toContain('href="/sign-in?view=pat"'); // Meet PAT
  });

  it("cohort you-dots are semantic (green above / amber within / red below)", () => {
    expect(src).toContain("#16a34a"); // up = green
    expect(src).toContain("#d97e22"); // mid = amber
    expect(src).toContain("#c4442e"); // dn = red
    expect(src).toMatch(/tone: "(up|mid|dn)"/);
  });

  it("cohort rows share ONE px centreline — no rem-scaled spacing under html{font-size:11.5px}", () => {
    // 2026-09-04 fix: track/band/tick/dot all centre at y=7px of a 14px row. Measured
    // before (1440px): dot 0.78px under the track, 2.2px under the band, 2.75px under
    // the tick, because h-3/top-0.5/h-2/h-4/w-0.5 are rem-based and rem is 11.5px here.
    const row = src.slice(src.indexOf('data-testid="v7-cohort-row"'), src.indexOf("semantic \"you\" dot") + 400);
    expect(src).toMatch(/className="relative h-\[14px\]" data-testid="v7-cohort-row"/);
    expect(row).toContain("top-[6px] h-[2px]"); // track  → centre 7
    expect(row).toContain("top-[3px] h-[8px]"); // band   → centre 7
    expect(row).toContain("top-[-1px] h-[16px] w-[2px] -translate-x-1/2"); // tick → centre 7
    expect(row).toContain("top-0 h-[14px] w-[14px] -translate-x-1/2"); // dot → centre 7
    expect(row).not.toMatch(/\b(h-3|top-0\.5|h-2|h-4|w-0\.5|-translate-x-1\.5)\b/);
  });

  it("radar carries the five per-pillar value sentences (locked verbatim)", () => {
    for (const rest of [
      "whether your technology plans point where your practice is actually heading.",
      "the daily workflow discipline that separates smooth closes from late nights.",
      "where software genuinely saves hours, and where it only promises to.",
      "whether your systems share data cleanly or make your team re-key it.",
      "the controls and vendor oversight your clients assume you already have.",
    ]) {
      expect(src, `missing pillar sentence: ${rest}`).toContain(rest);
    }
  });

  it("radar carries the dashed peer overlay + You/Peers legend (shape-only)", () => {
    expect(src).toMatch(/stroke="#8ba1bd"[^>]*strokeDasharray="6 5"/);
    expect(src).toMatch(/border-dashed border-\[#8ba1bd\]/);
    expect(src).toContain("You");
    expect(src).toContain("Peers");
    expect(src).not.toMatch(/stroke="#8ba1bd"[^>]*>\s*\d/);
  });

  it("the cohort panel shares the radar's card-header grammar", () => {
    expect(src).toMatch(/pat-label">Cohort standing/);
    expect(src).toMatch(/Peer view/);
  });

  it("depth box 0.2 — the door carries no trust accordion; the nine trust links live in the shell footer", () => {
    expect(src).not.toContain("Every number shows its work.");
    expect(src).not.toContain("v7-trust-accordion");
    expect(src).not.toContain("How PAT earns trust");
    expect(src).not.toContain("TRUST_FOOTER_LINKS");
    expect(src).not.toContain('"use client"');
    expect(src).not.toMatch(/onClick|useState/);
    expect(TRUST_FOOTER_LINKS.map((l) => l.label)).toEqual([
      "Trust", "Privacy", "Terms", "Security", "Support", "Billing policy", "Methodology", "How Pat is governed", "Build proof",
    ]);
  });

  it('"Methodology" appears exactly twice on the door: the shell nav + the accordion list', () => {
    // Content: no literal Methodology link of its own (the word reaches the door only
    // through TRUST_FOOTER_LINKS). Shell: the nav link stays, the footer repeat is gone.
    expect(src).not.toMatch(/>\s*Methodology\s*</);
    expect(src).not.toContain('href="/methodology"');
    expect((shell.match(/>Methodology</g) || []).length).toBe(1);
    expect(shell).toMatch(/<nav[\s\S]*<Link href="\/methodology">Methodology<\/Link>[\s\S]*<\/nav>/);
    expect(shell).not.toMatch(/<footer[\s\S]*href="\/methodology"[\s\S]*<\/footer>/);
  });

  it("door cards route to sign-in with the role preselected", () => {
    expect(src).toContain("/sign-in?view=firm");
    expect(src).toContain("/sign-in?view=vendor");
  });

  it("the radar is data-free — no fabricated scores/percentages on the front door", () => {
    expect(src).not.toMatch(/>\s*\d+%/);
    expect(src).not.toMatch(/\d+\s*%\s*</);
    for (const pillar of ["Strategy", "Operations", "Automation", "Integration", "Governance"]) {
      expect(src).toContain(pillar);
    }
    expect(src).not.toMatch(/<text[^>]*>\s*\d/);
  });
});

describe("V7 front door — Ask Pat entry (gated on the public tier)", () => {
  const base = { NODE_ENV: "test" } as NodeJS.ProcessEnv;

  it("hidden when PAT_ENABLE_PUBLIC_TIER is off (/ask is a 404 — a link would be dead)", () => {
    expect(isAskPatDoorEntryEnabled({ ...base })).toBe(false);
    expect(isAskPatDoorEntryEnabled({ ...base, PAT_ENABLE_PUBLIC_TIER: "0", PAT_PUBLIC_IP_HASH_SALT: "s" })).toBe(false);
    expect(isAskPatDoorEntryEnabled({ ...base, PAT_ENABLE_PUBLIC_TIER: "true", PAT_PUBLIC_IP_HASH_SALT: "s" })).toBe(false);
  });

  it("hidden when the flag is on but the IP-hash salt is missing (/ask still 404s)", () => {
    expect(isAskPatDoorEntryEnabled({ ...base, PAT_ENABLE_PUBLIC_TIER: "1" })).toBe(false);
    expect(isAskPatDoorEntryEnabled({ ...base, PAT_ENABLE_PUBLIC_TIER: "1", PAT_PUBLIC_IP_HASH_SALT: "  " })).toBe(false);
  });

  it("shown only when the tier is fully available — the same check /ask renders on", () => {
    expect(isAskPatDoorEntryEnabled({ ...base, PAT_ENABLE_PUBLIC_TIER: "1", PAT_PUBLIC_IP_HASH_SALT: "salt" })).toBe(true);
  });

  it("the door's /ask link is inside the gate and nowhere else", () => {
    expect(src).toContain("const askPatEntry = isAskPatDoorEntryEnabled();");
    expect(src).toMatch(/\{askPatEntry \? \([\s\S]{0,80}<Link href="\/ask"[^>]*data-testid="v7-cta-ask"/);
    expect((src.match(/href="\/ask"/g) || []).length).toBe(1);
    expect(src).toContain("Ask Pat");
    // The gate reuses the /ask page's own availability function (no second opinion).
    expect(read("lib/frontDoor.ts")).toMatch(/return publicTierAvailability\(env\)\.available;/);
    expect(read("app/(public)/ask/page.tsx")).toContain("publicTierAvailability().available");
  });

  it("hero CTA band stacks at 390 (single column below md) instead of overflowing", () => {
    expect(src).toMatch(/className="grid overflow-hidden rounded-\[28px\][^"]*md:grid-cols-\[1\.2fr_1fr_1fr\]"/);
    expect(src).not.toMatch(/data-testid="v7-hero-band"[^>]*grid-cols-3/);
  });
});

describe("V7 public shell (V7PublicShell)", () => {
  it("owns the single shared nav — logo, Methodology, Trust, EN/FR/ES selector, Sign in", () => {
    expect(shell).toContain("<nav");
    expect(shell).toContain("<LanguageSelector");
    expect(shell).toContain('src="/PAT.png"');
    expect(shell).toMatch(/<Link href="\/methodology">Methodology<\/Link>/);
    expect(shell).toMatch(/<Link href="\/trust">Trust<\/Link>/);
    expect(shell).toContain('href="/sign-in"');
  });

  it("owns the product footer — the AppShell's nine-link row (TRUST_FOOTER_LINKS) + attribution", () => {
    expect(shell).toContain("<footer");
    expect(shell).toMatch(/<footer[\s\S]*\{TRUST_FOOTER_LINKS\.map\(\(link\) => \([\s\S]*?<Link key=\{link\.href\} href=\{link\.href\}/);
    expect(read("app/components/shell/AppShell.tsx")).toContain("TRUST_FOOTER_LINKS.map((link) =>");
    expect(shell).toContain("a Patalign™ product");
  });

  it("is a direct block child of body — the STEP-1 full-bleed escape is retired", () => {
    // With the root layout reduced to html/body, there is no app header/footer to
    // hide, so the body.pat-shell > header|footer|main escape is gone. Only the V7
    // pat-label size scope remains.
    expect(shell).not.toContain("body.pat-shell > header");
    expect(shell).not.toContain("body.pat-shell > footer");
    expect(shell).not.toContain("main.pat-shell-main");
    expect(shell).toMatch(/data-testid="v7-public-shell"[\s\S]*?\.pat-label\{font-size:12px\}/);
  });
});
