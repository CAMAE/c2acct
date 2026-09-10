import { existsSync, readFileSync, readdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Link inventory guard (Mythos method 2026-09-10 §7; wait-state box item 2).
 *
 * For every route × identity crawled by scripts/dev/click-inventory.mts, the
 * FLAG-ON build's set of controls (role, name, href) must be a superset of the
 * FLAG-OFF build's set, minus the entries in ops/qa/link-removals.json — each
 * of which carries the route, the control, the ledger line with Cam's ruling
 * and the ruling date. A door that vanishes when the flags flip fails here
 * unless its removal was ruled.
 *
 * Inputs: the crawl output (default ~/work/click-inventory; override with
 * CLICK_INVENTORY_DIR). B = HEAD flag-off, C = HEAD flag-on (D adds the board
 * flag and is checked the same way). Dynamic labels are normalised the same way
 * for both sides: digits, dates and relative times collapse to placeholders.
 * The suite reports SKIP with the reason when the crawl output is absent.
 */
const INVENTORY = process.env.CLICK_INVENTORY_DIR ?? path.join(os.homedir(), "work", "click-inventory");
const REMOVALS_FILE = path.join(process.cwd(), "ops", "qa", "link-removals.json");
const IDENTITIES = ["public", "firm-pro", "firm-elite", "vendor-pro", "vendor-elite", "consultant", "admin"];
const PAIRS: Array<[string, string]> = [
  ["B", "C"],
  ["B", "D"],
];

type Removal = { route: string; control: string; ledgerLine: string; rulingDate: string };

function normalizeLabel(name: string): string {
  return name
    .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, "<time>")
    .replace(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.? \d{1,2}(?:, \d{4})?\b/gi, "<date>")
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, "<date>")
    .replace(/\b(?:in |about )?\d+\s*(?:s|m|h|d|w|mo|y|min|mins|hours?|days?|weeks?|months?|years?)(?: ago)?\b/gi, "<rel>")
    .replace(/\d[\d,.]*%?/g, "#")
    .replace(/\s+/g, " ")
    .trim()
    // The crawl stores tabbable names truncated (120–160 chars) and ARIA names in
    // full; key on the first 100 chars so one door is one entry.
    .slice(0, 100);
}

function normalizeHref(href: string | null | undefined): string | null {
  if (!href) return null;
  return href.replace(/\d[\d,.]*/g, "#");
}

/** (role, name, href) from the ARIA snapshot of main + shell, plus the tabbable list. */
function controlsOf(record: {
  aria?: { main?: string | null; shell?: string | null };
  tabbable?: Array<{ role?: string; name?: string; href?: string | null }>;
}): Set<string> {
  const out = new Set<string>();
  for (const yaml of [record.aria?.main ?? "", record.aria?.shell ?? ""]) {
    const lines = yaml.split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const m = /^\s*- (link|button|tab|menuitem|checkbox|radio|combobox|textbox|switch|slider|searchbox) "([^"]*)"/.exec(lines[i]);
      if (!m) continue;
      const url = i + 1 < lines.length ? /^\s*- \/url: (.*)$/.exec(lines[i + 1])?.[1]?.trim() ?? null : null;
      out.add(JSON.stringify([m[1], normalizeLabel(m[2]), normalizeHref(url)]));
    }
  }
  for (const t of record.tabbable ?? []) {
    if (!t.role || !t.name) continue;
    out.add(JSON.stringify([t.role, normalizeLabel(t.name), normalizeHref(t.href)]));
  }
  return out;
}

function readRecords(build: string, identity: string): Map<string, { route: string; controls: Set<string> }> {
  const dir = path.join(INVENTORY, build, identity);
  const out = new Map<string, { route: string; controls: Set<string> }>();
  if (!existsSync(dir)) return out;
  for (const file of readdirSync(dir)) {
    if (!file.endsWith(".json") || file.startsWith("_")) continue;
    const record = JSON.parse(readFileSync(path.join(dir, file), "utf8"));
    out.set(file, { route: record.route, controls: controlsOf(record) });
  }
  return out;
}

function describeControl(key: string): string {
  const [role, name, href] = JSON.parse(key) as [string, string, string | null];
  return `${role} "${name}"${href ? ` → ${href}` : ""}`;
}

const available = PAIRS.every(([off, on]) => existsSync(path.join(INVENTORY, off, "_summary.json")) && existsSync(path.join(INVENTORY, on, "_summary.json")));

describe("link inventory: flag-on controls ⊇ flag-off controls per route × identity", () => {
  it("ops/qa/link-removals.json exists and every entry carries route, control, ledgerLine and rulingDate", () => {
    const removals = JSON.parse(readFileSync(REMOVALS_FILE, "utf8")) as Removal[];
    expect(Array.isArray(removals)).toBe(true);
    for (const entry of removals) {
      expect(typeof entry.route).toBe("string");
      expect(typeof entry.control).toBe("string");
      expect(entry.ledgerLine.length).toBeGreaterThan(10);
      expect(entry.rulingDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it.skipIf(!available)(`crawl output present at ${INVENTORY}`, () => {
    expect(available).toBe(true);
  });

  for (const [off, on] of PAIRS) {
    it.skipIf(!available)(`${off} (flag-off) → ${on} (flag-on): no control disappears without a ruling`, () => {
      const removals = JSON.parse(readFileSync(REMOVALS_FILE, "utf8")) as Removal[];
      const allowed = new Set(removals.map((r) => `${r.route}|${r.control}`));
      // Grouped by (identity, control): one line per lost door with the routes it
      // vanished from, so a shell-wide rename reads as one line, not one per page.
      const missingBy = new Map<string, string[]>();
      let pairs = 0;
      let occurrences = 0;
      for (const identity of IDENTITIES) {
        const left = readRecords(off, identity);
        const right = readRecords(on, identity);
        for (const [file, l] of left) {
          const r = right.get(file);
          if (!r) continue;
          pairs += 1;
          for (const key of l.controls) {
            if (r.controls.has(key)) continue;
            const label = describeControl(key);
            if (allowed.has(`${l.route}|${label}`)) continue;
            occurrences += 1;
            const groupKey = `${identity} · ${label}`;
            missingBy.set(groupKey, [...(missingBy.get(groupKey) ?? []), l.route]);
          }
        }
      }
      expect(pairs).toBeGreaterThan(0);
      const failures = [...missingBy.entries()]
        .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
        .map(([group, routes]) => `${group} — missing on ${routes.length} route(s): ${routes.slice(0, 3).join(", ")}${routes.length > 3 ? ", …" : ""}`);
      expect(
        failures,
        `${missingBy.size} control(s) (${occurrences} route occurrences) present in ${off} but absent in ${on} with no ruling in ops/qa/link-removals.json:\n  ${failures.join("\n  ")}`
      ).toEqual([]);
    });
  }
});
