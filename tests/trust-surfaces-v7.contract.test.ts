import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { getTrustSurface, TRUST_FOOTER_LINKS } from "@/lib/trustContent";

/**
 * Facelift Part 1 (B3): every trust surface has a flag-on re-lay behind
 * PAT_ENABLE_NEW_FRONT_DOOR and keeps its flag-off TrustSurfacePage branch
 * untouched (rendered diff at commit time). Wording is the content model's own.
 */
const ROOT = process.cwd();
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");
const PAGES = {
  trust: "app/(public)/trust/page.tsx",
  support: "app/(public)/support/page.tsx",
  security: "app/(public)/security/page.tsx",
  methodology: "app/(public)/methodology/page.tsx",
  governance: "app/(public)/trust/pat/page.tsx",
  release: "app/(public)/release/page.tsx",
  privacy: "app/(public)/privacy/page.tsx",
  terms: "app/(public)/terms/page.tsx",
  billing: "app/(public)/billing-policy/page.tsx",
} as const;
const component = read("app/components/trust/TrustSurfaceV7.tsx");

describe("B3 — every trust surface is re-laid flag-on and unchanged flag-off", () => {
  it.each(Object.entries(PAGES))("%s: flag-on branch renders TrustSurfaceV7; flag-off branch keeps TrustSurfacePage", (_name, rel) => {
    const source = read(rel);
    expect(source).toContain('from "@/lib/frontDoor"');
    expect(source).toMatch(/if \(isNewFrontDoorEnabled\(\)\) \{[\s\S]*?<TrustSurfaceV7/);
    expect(source).toMatch(/<TrustSurfacePage surface=/);
  });

  it("the V7 frame: token container, right-rail TOC, numbered sections, native FAQ, disclosure, mono chips", () => {
    expect(component).toContain('className="pat-container px-6 pb-20 pt-12"');
    expect(component).toMatch(/aria-label="On this page"[^>]*className="order-first lg:order-none lg:sticky/);
    expect(component).toMatch(/<details key=\{item\.question\}[\s\S]*?<summary/);
    expect(component).not.toMatch(/useState|onClick|"use client"/);
    expect(component).toContain('data-testid="trust-disclosure"');
    expect(component).toMatch(/chip\.mono \? "pat-mono"/);
    // No copy of its own beyond labels for the frame.
    expect(component).not.toMatch(/PAT does not claim|support@/);
  });

  it("/trust: H1 per the ruling, compact link list (the trust set minus itself), disclosure + FAQ", () => {
    const source = read(PAGES.trust);
    expect(source).toContain('title="How PAT earns trust"');
    expect(source).toContain('links={TRUST_FOOTER_LINKS.filter((link) => link.href !== "/trust")}');
    expect(source).toContain('disclosureTitle="No unsupported claims"');
    // Finish box 4.3: no FAQ copy exists, so the page passes no faqItems and the
    // accordion is not rendered (TrustSurfaceV7 renders it only with items).
    expect(source).not.toMatch(/\bfaq\b/);
    expect(component).toMatch(/\{faqItems\.length > 0 \? \(/);
    expect(component).not.toMatch(/faq\?: boolean/);
    expect(getTrustSurface("trust").sections.some((section) => section.title === "No unsupported claims")).toBe(true);
    expect(TRUST_FOOTER_LINKS.filter((link) => link.href !== "/trust")).toHaveLength(8);
  });

  it("/support: contact block first with the address the product already configures; no local-review wording", () => {
    const source = read(PAGES.support);
    expect(source).toContain('const SUPPORT_EMAIL = "support@patalign.com";');
    expect(read("app/components/pat/PatTopBar.tsx")).toContain("support@patalign.com"); // the pre-existing configured address
    expect(source).toMatch(/lead=\{\s*<section[\s\S]*?data-testid="support-contact"/);
    const copy = JSON.stringify(getTrustSurface("support"));
    expect(copy.toLowerCase()).not.toContain("local review");
    expect(source.toLowerCase()).not.toContain("local review");
    expect(getTrustSurface("support").sections.map((section) => section.title)).toEqual(["What to include", "If something fails", "Billing support"]);
  });

  it("/security: sections kept, subprocessors in mono, no status link invented", () => {
    const source = read(PAGES.security);
    expect(source).toContain('monoBulletTitles={["Subprocessors"]}');
    expect(source).not.toMatch(/status\.[a-z]+\.[a-z]+|statuspage/i);
  });

  it("/methodology + governance: TOC, numbered, version/date chips in mono; wording is the lib's", () => {
    const methodology = read(PAGES.methodology);
    expect(methodology).toMatch(/chips=\{\[\{ label: `v\$\{METHODOLOGY_VERSION\}`, mono: true \}/);
    expect(methodology).toContain("sections={METHODOLOGY_SECTIONS.map((section) => ({");
    expect(methodology).toMatch(/\btoc\b[\s\S]{0,40}\bnumbered\b/);
    const governance = read(PAGES.governance);
    expect(governance).toMatch(/\btoc\b[\s\S]{0,40}\bnumbered\b/);
    expect(governance).toContain("Last updated ${surface.lastUpdated}");
    for (const source of [methodology, governance]) {
      // No new prose in the flag-on branch: nothing that looks like a sentence literal.
      const branch = source.slice(source.indexOf("if (isNewFrontDoorEnabled())"), source.indexOf("return (", source.indexOf("if (isNewFrontDoorEnabled())") + 30));
      expect(branch).not.toMatch(/"[A-Z][a-z]+ [a-z]+ [a-z]+ [a-z]+/);
    }
  });

  it("/release: mono table of releaseId / commit / build time / auth mode + the one paragraph", () => {
    const source = read(PAGES.release);
    expect(source).toContain('const RELEASE_TABLE_FIELDS = ["releaseId", "commitSha", "buildTimestamp", "authMode"] as const;');
    expect(source).toMatch(/<table className="pat-mono w-full text-left">/);
    expect(source).toContain("data-release-fingerprint={fingerprint.releaseId}");
  });

  it("/privacy /terms /billing-policy: TOC + Last updated chip only", () => {
    for (const rel of [PAGES.privacy, PAGES.terms, PAGES.billing]) {
      const source = read(rel);
      expect(source).toMatch(/<TrustSurfaceV7 surface=\{surface\} chips=\{\[\{ label: `Last updated \$\{surface\.lastUpdated\}`, mono: true \}\]\} toc \/>/);
    }
  });
});
