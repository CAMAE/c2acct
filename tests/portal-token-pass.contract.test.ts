import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Facelift Part 2 (1.1–1.4): the B1 tokens reach the signed-in surfaces
 * through one CSS layer scoped to attributes that exist ONLY when
 * PAT_ENABLE_NEW_FRONT_DOOR=1. Flag-off: no attribute, no rule, rendered
 * output byte-identical (diffed at box close). Mirrors
 * tests/trust-surfaces-v7.contract.test.ts — one block per route group.
 */
const ROOT = process.cwd();
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");
const css = read("app/globals.css");
const LAYER_START = "Facelift Part 2 — portal token pass";
const layer = css.slice(css.lastIndexOf("/*", css.indexOf(LAYER_START)));

const GROUPS = {
  firm: { layout: "app/(app)/firm/layout.tsx", flagOff: "return <>{children}</>;" },
  vendor: { layout: "app/(app)/vendor/layout.tsx", flagOff: "return <>{children}</>;" },
  consultants: { layout: "app/(app)/consultants/layout.tsx", flagOff: '<div className="space-y-8" {...v7Portal}>' },
  admin: { layout: "app/(app)/admin/layout.tsx", flagOff: '<div className="space-y-8" {...v7Portal}>' },
} as const;

describe("portal token pass — the layer", () => {
  it("exists once in globals.css and every rule is scoped to a flag-on attribute", () => {
    expect(css.indexOf(LAYER_START)).toBeGreaterThan(-1);
    expect(css.indexOf(LAYER_START)).toBe(css.lastIndexOf(LAYER_START));
    // Every selector list (text before "{" at rule depth) must start with one
    // of the two attributes; @media wrappers are allowed.
    const selectors = layer
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("}")
      .map((block) => block.split("{")[0]?.trim() ?? "")
      .filter((selector) => selector && !selector.startsWith("@media"));
    expect(selectors.length).toBeGreaterThan(10);
    for (const selectorList of selectors) {
      for (const selector of selectorList.split(",")) {
        expect(selector.trim(), selector).toMatch(/^\[data-v7-(portal|shell)\]/);
      }
    }
  });

  it("maps to the B1 tokens: type steps, radii, shadow, container, mono numerals", () => {
    for (const token of ["--fs-h1", "--fs-h2", "--fs-h3", "--fs-body", "--fs-meta", "--fw-heading", "--radius-card", "--radius-control", "--shadow-card", "--container"]) {
      expect(layer, token).toContain(`var(${token})`);
    }
    expect(layer).toMatch(/font-variant-numeric: tabular-nums/);
    // Pills and the mode toggle keep their full radius.
    expect(layer).toMatch(/\[data-v7-portal\] \.rounded-full,[\s\S]*?border-radius: 9999px/);
  });

  it("adds no min-width, no copy, and no colour outside the register", () => {
    expect(layer).not.toMatch(/min-width\s*:/);
    expect(layer).not.toMatch(/content\s*:\s*["']/);
    // Colour only via register tokens (var(--shell-*)) or the three hexes.
    const colours = layer.match(/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)/g) ?? [];
    for (const colour of colours) {
      expect(["#063674", "#202020", "#5c6c80"], colour).toContain(colour.toLowerCase());
    }
    expect(layer).toMatch(/border-color: var\(--shell-border\)/);
  });

  it("AppShell spreads data-v7-shell onto main and footer only when the flag is on", () => {
    const shell = read("app/components/shell/AppShell.tsx");
    expect(shell).toContain('import { isNewFrontDoorEnabled } from "@/lib/frontDoor";');
    expect(shell).toContain('const v7Shell = isNewFrontDoorEnabled() ? { "data-v7-shell": "" } : {};');
    expect(shell).toContain('<main className="pat-shell-main flex flex-1" {...v7Shell}>');
    expect(shell).toMatch(/<footer className="[^"]*" \{\.\.\.v7Shell\}>/);
    expect(shell).not.toMatch(/data-v7-shell=/); // never a literal attribute
  });
});

describe.each(Object.entries(GROUPS))("portal token pass — /%s group", (group, { layout, flagOff }) => {
  const source = read(layout);

  it("scopes the group flag-on and returns the pre-existing markup flag-off", () => {
    expect(source).toContain('import { isNewFrontDoorEnabled } from "@/lib/frontDoor";');
    expect(source).toMatch(new RegExp(`data-v7-portal(="${group}"|": "${group}")`));
    expect(source).toContain(flagOff);
  });

  it("the flag-on wrapper is display:contents or an attribute spread — never new layout", () => {
    if (flagOff.includes("{...v7Portal}")) {
      expect(source).toContain(`const v7Portal = isNewFrontDoorEnabled() ? { "data-v7-portal": "${group}" } : {};`);
    } else {
      expect(source).toMatch(new RegExp(`if \\(isNewFrontDoorEnabled\\(\\)\\) \\{[\\s\\S]*?<div data-v7-portal="${group}" className="contents">`));
    }
  });
});
