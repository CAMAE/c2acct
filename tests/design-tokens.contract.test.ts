import { readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Facelift Part 1 (B1): the type scale, radii, hairline, shadow and container
 * are tokens in app/globals.css; the classes the app already uses map onto them.
 * The ratchet: raw font-size / border-radius / box-shadow literals in app/
 * (outside globals.css) may only go DOWN. The ceilings below are the counts at
 * the commit that introduced the tokens — lower a ceiling when you remove
 * literals; never raise one.
 */
const ROOT = process.cwd();
const css = readFileSync(path.join(ROOT, "app/globals.css"), "utf8");

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(tsx|ts)$/.test(full)) out.push(full);
  }
  return out;
}
const sources = walk(path.join(ROOT, "app")).map((file) => readFileSync(file, "utf8")).join("\n");
const count = (pattern: RegExp) => (sources.match(pattern) ?? []).length;

const CEILINGS = {
  fontSizePxClass: { pattern: /text-\[[0-9.]+px\]/g, ceiling: 111 },
  fontSizeInlineLiteral: { pattern: /fontSize:\s*["'`0-9]/g, ceiling: 9 },
  fontSizeCssProp: { pattern: /font-size:/g, ceiling: 2 },
  borderRadiusPxClass: { pattern: /rounded-\[[0-9]+px\]/g, ceiling: 223 },
  boxShadowInlineLiteral: { pattern: /boxShadow:\s*"[0-9]/g, ceiling: 0 },
  boxShadowClass: { pattern: /shadow-\[/g, ceiling: 8 },
} as const;

describe("design tokens (B1)", () => {
  it("globals.css defines the six-step scale, radii, hairline, shadow, container and .pat-mono", () => {
    for (const token of [
      "--fs-display: 48px",
      "--fs-h1: 32px",
      "--fs-h2: 24px",
      "--fs-h3: 18px",
      "--fs-body: 16px",
      "--fs-meta: 13px",
      "--fw-heading: 600",
      "--fw-display: 700",
      "--radius-card: 12px",
      "--radius-control: 6px",
      "--border-hairline: 1px solid rgba(12, 33, 66, 0.12)",
      "--shadow-card: 0 1px 2px rgba(12, 33, 66, 0.04)",
      "--container: 1200px",
    ]) {
      expect(css, token).toContain(token);
    }
    expect(css).toMatch(/\.pat-mono \{\s*font-family: ui-monospace[^}]*font-size: var\(--fs-meta\)/);
  });

  it("pat-card, panels, label and headings map onto the tokens", () => {
    expect(css).toMatch(/\.pat-card \{\s*border: var\(--border-hairline\);\s*border-radius: var\(--radius-card\);[^}]*box-shadow: var\(--shadow-card\);/);
    expect(css).toMatch(/\.pat-subpanel \{\s*border: var\(--border-hairline\);\s*border-radius: var\(--radius-card\);/);
    expect(css).toMatch(/\.pat-soft-panel \{\s*border: var\(--border-hairline\);\s*border-radius: var\(--radius-card\);/);
    expect(css).toMatch(/\.pat-label \{\s*font-size: var\(--fs-meta\);/);
    expect(css).toMatch(/\.pat-card h1\.text-4xl,\s*\.pat-card h2\.text-4xl \{\s*font-size: var\(--fs-h1\);\s*font-weight: var\(--fw-heading\);/);
    expect(css).toMatch(/\.pat-card h2\.text-3xl \{\s*font-size: var\(--fs-h2\);/);
    expect(css).toMatch(/\.pat-card h3\.text-2xl \{\s*font-size: var\(--fs-h3\);/);
    expect(css).toMatch(/\.pat-textarea \{[^}]*border-radius: var\(--radius-control\);/);
  });

  it("the 24px/64px blur shadow is gone from app/ and lib/", () => {
    const lib = walk(path.join(ROOT, "lib")).map((file) => readFileSync(file, "utf8")).join("\n");
    expect(sources + lib + css).not.toContain("24px 64px");
  });

  it("raw literals in app/ never exceed the ratchet ceilings", () => {
    for (const [name, { pattern, ceiling }] of Object.entries(CEILINGS)) {
      const actual = count(pattern);
      expect(actual, `${name}: ${actual} > ceiling ${ceiling} — use the tokens; lower the ceiling when you remove literals`).toBeLessThanOrEqual(ceiling);
    }
  });
});
