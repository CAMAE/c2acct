import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, readdirSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Link inventory guard v2 (production-baseline box, 2026-09-11).
 *
 * The floor is ops/qa/baseline-inventory.json: every control (role, name,
 * href, region) production served, per route × identity, captured from the
 * production commit run with production's flag values. This test crawls the
 * standalone it is pointed at (LINK_INVENTORY_BASE_URL, with the flag set the
 * caller chose, LINK_INVENTORY_LABEL naming it) using scripts/qa/click-inventory.mts
 * on the manifest seeds, and requires every baseline control to survive unless
 * ops/qa/link-removals.json carries Cam's ruling for it.
 *
 * No skip: without a server to crawl the test FAILS. Run it through
 * `pnpm guard:doors` (starts the standalone twice — flags off, flags as
 * Preview — and runs this file against each), or point it at a server:
 *   LINK_INVENTORY_BASE_URL=http://127.0.0.1:3031 LINK_INVENTORY_LABEL=flags-off pnpm vitest run tests/link-inventory.contract.test.ts
 */
const ROOT = process.cwd();
const BASELINE_FILE = path.join(ROOT, "ops", "qa", "baseline-inventory.json");
const REMOVALS_FILE = path.join(ROOT, "ops", "qa", "link-removals.json");
const BASE_URL = process.env.LINK_INVENTORY_BASE_URL ?? "";
const LABEL = process.env.LINK_INVENTORY_LABEL ?? "unlabelled";
const IDENTITIES = process.env.LINK_INVENTORY_IDENTITIES ?? "public,firm-pro,firm-elite,vendor-pro,vendor-elite,consultant,admin";

type Removal = { route: string; control: string; ledgerLine: string; rulingDate: string };
type Baseline = { routes: Record<string, Record<string, { controls: string[][] }>> };

function normalizeLabel(name: string): string {
  return name
    .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, "<time>")
    .replace(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.? \d{1,2}(?:, \d{4})?\b/gi, "<date>")
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, "<date>")
    .replace(/\b(?:in |about )?\d+\s*(?:s|m|h|d|w|mo|y|min|mins|hours?|days?|weeks?|months?|years?)(?: ago)?\b/gi, "<rel>")
    .replace(/\d[\d,.]*%?/g, "#")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}
function normalizeHref(href: string | null | undefined): string | null {
  if (!href) return null;
  return href.replace(/demo-[a-z0-9-]+/g, "demo-…").replace(/perf-scale-[a-z0-9-]+/g, "perf-scale-…").replace(/\d[\d,.]*/g, "#");
}
function normalizeRoute(route: string): string {
  return route.replace(/demo-[a-z0-9-]+/g, "demo-…").replace(/perf-scale-[a-z0-9-]+/g, "perf-scale-…");
}
function controlsOf(record: { aria?: { main?: string | null; shell?: string | null }; tabbable?: Array<{ role?: string; name?: string; href?: string | null; region?: string }> }): Set<string> {
  const out = new Set<string>();
  for (const region of ["main", "shell"] as const) {
    const lines = (record.aria?.[region] ?? "").split("\n");
    for (let i = 0; i < lines.length; i += 1) {
      const m = /^\s*- (link|button|tab|menuitem|checkbox|radio|combobox|textbox|switch|slider|searchbox) "([^"]*)"/.exec(lines[i]);
      if (!m) continue;
      const url = i + 1 < lines.length ? /^\s*- \/url: (.*)$/.exec(lines[i + 1])?.[1]?.trim() ?? null : null;
      out.add(JSON.stringify([m[1], normalizeLabel(m[2]), normalizeHref(url), region]));
    }
  }
  for (const t of record.tabbable ?? []) {
    if (!t.role || !t.name) continue;
    out.add(JSON.stringify([t.role, normalizeLabel(t.name), normalizeHref(t.href), t.region ?? "shell"]));
  }
  return out;
}
function describeControl(key: string): string {
  const [role, name, href, region] = JSON.parse(key) as [string, string, string | null, string];
  return `${role} "${name}"${href ? ` → ${href}` : ""} [${region}]`;
}

describe(`link inventory guard v2 (${LABEL})`, () => {
  it("baseline and removals files are well-formed", () => {
    const baseline = JSON.parse(readFileSync(BASELINE_FILE, "utf8")) as Baseline & { flags: Record<string, string>; build: { commit: string } };
    expect(baseline.build.commit).toBe("0157d40f");
    expect(Object.keys(baseline.routes).length).toBeGreaterThan(100);
    const removals = JSON.parse(readFileSync(REMOVALS_FILE, "utf8")) as Removal[];
    for (const entry of removals) {
      expect(typeof entry.route).toBe("string");
      expect(typeof entry.control).toBe("string");
      expect(entry.ledgerLine.length).toBeGreaterThan(10);
      expect(entry.rulingDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("a server to crawl is configured (LINK_INVENTORY_BASE_URL)", () => {
    expect(BASE_URL, "LINK_INVENTORY_BASE_URL is not set — the guard crawls a running standalone; use pnpm guard:doors").toMatch(/^https?:\/\//);
  });

  it(`every production control survives on the crawled build (${LABEL}) unless ruled in ops/qa/link-removals.json`, { timeout: 30 * 60_000 }, () => {
    expect(BASE_URL).toMatch(/^https?:\/\//);
    const baseline = JSON.parse(readFileSync(BASELINE_FILE, "utf8")) as Baseline;
    const removals = JSON.parse(readFileSync(REMOVALS_FILE, "utf8")) as Removal[];
    // A ruling names the route as its template ("/engagements/[id]/score") or its
    // normalized instance, and may list several controls separated by " / ".
    const isRuled = (route: string, template: string | null | undefined, name: string, label: string) =>
      removals.some((r) => (r.route === route || (template && r.route === template)) && (r.control === label || r.control.split(" / ").map((c) => c.trim()).includes(name)));
    const out = mkdtempSync(path.join(os.tmpdir(), "link-inventory-"));
    const tools = process.env.LINK_INVENTORY_TOOLS ?? ROOT; // tabbable + axe-core are devDependencies
    execFileSync("node", ["--import", "tsx", "scripts/qa/click-inventory.mts"], {
      cwd: ROOT,
      env: { ...process.env, BASE: BASE_URL, BUILD: "current", BUILD_DIR: ROOT, OUT: out, TOOLS: tools, IDENTITIES, MAX_DEPTH: "0", BUILD_FLAGS: LABEL },
      stdio: "pipe",
      timeout: 25 * 60_000,
    });
    // crawled records → per (normalized route, identity) control sets
    const current = new Map<string, Set<string>>();
    for (const identity of IDENTITIES.split(",")) {
      const dir = path.join(out, "current", identity);
      if (!existsSync(dir)) continue;
      for (const file of readdirSync(dir)) {
        if (!file.endsWith(".json") || file.startsWith("_")) continue;
        const record = JSON.parse(readFileSync(path.join(dir, file), "utf8"));
        current.set(`${normalizeRoute(record.route)}|${identity}`, controlsOf(record));
      }
    }
    expect(current.size, "the crawl produced no records").toBeGreaterThan(50);
    const missingBy = new Map<string, string[]>();
    let compared = 0;
    for (const [route, byIdentity] of Object.entries(baseline.routes)) {
      for (const [identity, entry] of Object.entries(byIdentity)) {
        const cur = current.get(`${route}|${identity}`);
        if (!cur) continue;
        compared += 1;
        for (const c of entry.controls) {
          const key = JSON.stringify(c);
          if (cur.has(key)) continue;
          const label = describeControl(key);
          if (isRuled(route, (entry as { template?: string | null }).template, c[1], label.replace(/ \[(main|shell)\]$/, ""))) continue;
          const group = `${route} · ${identity}`;
          missingBy.set(group, [...(missingBy.get(group) ?? []), label]);
        }
      }
    }
    expect(compared, "no baseline route × identity pair was reachable in the crawl").toBeGreaterThan(50);
    const lines = [...missingBy.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([group, labels]) => `${group}\n    ${labels.join("\n    ")}`);
    expect(
      lines,
      `${missingBy.size} route × identity pair(s) lost ${[...missingBy.values()].reduce((n, l) => n + l.length, 0)} production control(s) on the ${LABEL} build (${compared} pairs compared) with no ruling in ops/qa/link-removals.json:\n  ${lines.join("\n  ")}`
    ).toEqual([]);
  });
});
