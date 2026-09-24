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

// A ruling names exact control labels/names, or (box 2b, Cam 9/14 "all as recommended" — the
// admin briefing product ordering ruling of 9/9) a `controlPrefix`: every control on that route
// whose name starts with the prefix is ruled. Prefixes are for data-ordered lists only.
type Removal = { route: string; control: string; controlPrefix?: string; ledgerLine: string; rulingDate: string };
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
// Box 2 (2026-09-13), Cam's rulings applied as NORMALIZATION rather than allowlist entries:
// a ruled rename is the same door under a new name, so both sides are canonicalized before
// comparison and the door must still be there. R7: the vendor workspace card "BattleCard …"
// is "Product Fit Card …". Consultant workspace: the "Nudge queue" button is "Nudges".
const RENAMES: Array<[RegExp, string]> = [
  // R17 (box 2d, 2026-09-25): flag-on, "Consultant" reads "Guide" everywhere a user reads
  // it (routes unchanged). Canonicalize the flag-on words back to production's.
  [/^Guide$/, "Consultant"],
  [/^Guides$/, "Consultants"],
  [/^Guides Guide roster\b/, "Consultants Consultant roster"],
  [/^Add guide$/, "Add consultant"],
  [/^Remove guide access$/, "Remove consultant access"],
  [/^Guide name$/, "Consultant name"],
  [/^guide@company\.com$/, "consultant@company.com"],
  [/^Guide portal\b/, "Consultant portal"],
  [/^Guide pilot user$/, "Consultant pilot user"],
  [/^Open guide management$/, "Open consultant management"],
  [/^Guide review$/, "Consultant review"],
  [/ · Guide$/, " · Consultant"],
  [/^PAT for guides and ecosystem owners/, "PAT for consultants and ecosystem owners"],
  [/^BattleCard\b/, "Product Fit Card"],
  [/^Nudge queue$/, "Nudges"],
  // Box 2b (Cam 9/14 "all as recommended"): the admin membership plan select lost its FREE
  // option by ruling (6d090155, AUDIT-OMNIBUS-A-001: FREE is unassignable forward) — same
  // control, shorter option list. Vendor alignment insight card wording (A6).
  [/^FREE PRO ELITE$/, "PRO ELITE"],
  // R24 (Cam 9/14): "Alignment Sandbox" / "Alignment Board" read "Tech Stack Sandbox".
  [/^Alignment Sandbox\b/, "Tech Stack Sandbox"],
  [/^Open Alignment Board\b/, "Open Tech Stack Sandbox"],
  [/^Alignment Board · read-only$/, "Tech Stack Sandbox · read-only"],
  // A6: "# pts spread across modules" → "# pt spread across modules" (unit agrees with the
  // rounded number; V3 box 6). The unit shifts the 100-char cap, so both sides collapse to
  // the shared prefix.
  [/^Uneven maturity and module variance # pts? spread across modules Uneven maturity and module variance.*$/, "Uneven maturity and module variance # pt spread across modules"],
  // Depth box (2026-09-09): the freshness panel's "Draft a reminder" reads "Request refresh".
  [/Draft a reminder$/, "Request refresh"],
  // 6d090155 (FREE retired) + pilot cohort seed: pilot rows read "Membership PRO / ACTIVE".
  [/ · Membership FREE \/ ACTIVE /, " · Membership PRO / ACTIVE "],
  // The consultant board's back link names whichever firm the normalized demo-… route resolves to.
  [/^← Back to .+ brief$/, "← Back to <firm> brief"],
  // A10 (trust cards): the eyebrow/summary voice rewrite (95901dcf, 6c2360c6) renamed the
  // four cards; box 2b composes the cards themselves back into the V7 surface.
  [/^PRIVACY POLICY DRAFT Privacy This draft describes the data PAT expects to process during review and $/, "PRIVACY POLICY Privacy What PAT processes and why. It is not a final legal policy until approved by "],
  [/^Privacy policy draft Privacy This draft describes the data PAT expects to process during review and $/, "Privacy policy Privacy What PAT processes and why. It is not a final legal policy until approved by "],
  [/^TERMS OF SERVICE DRAFT Terms These draft terms set expectations for review access and early launch u$/, "TERMS OF SERVICE Terms Terms for PAT use. They do not replace signed commercial terms or legal revie"],
  [/^Terms of service draft Terms These draft terms set expectations for review access and early launch u$/, "Terms of service Terms Terms for PAT use. They do not replace signed commercial terms or legal revie"],
  [/^SUPPORT AND CONTACT Support Support expectations are intentionally scoped for local review and early$/, "SUPPORT AND CONTACT Support How to reach PAT support. Always-on public support is not claimed here. "],
  [/^Support and contact Support Support expectations are intentionally scoped for local review and early$/, "Support and contact Support How to reach PAT support. Always-on public support is not claimed here. "],
  [/^BILLING POLICY DRAFT Billing policy This draft explains how billing should behave when provider conf$/, "BILLING POLICY Billing policy How PAT billing behaves when a payment provider is configured — and ho"],
  [/^Billing policy draft Billing policy This draft explains how billing should behave when provider conf$/, "Billing policy Billing policy How PAT billing behaves when a payment provider is configured — and ho"],
];
function canonicalKey(key: string): string {
  const [role, name, href, region] = JSON.parse(key) as [string, string, string | null, string];
  let label = name;
  for (const [from, to] of RENAMES) label = label.replace(from, to);
  // Labels are capped at 100 chars on both sides; re-cap after the renames at 96 so a rename
  // that shortens or lengthens a name by a few characters cannot shift the cap and split an
  // otherwise identical control into two keys.
  return JSON.stringify([role, label.slice(0, 96), href, region]);
}
// The local-review / provisioned sign-in form and the sign-in view tabs are the crawl's
// VEHICLE (PAT_ENABLE_LOCAL_REVIEW_AUTH=1 is set for the crawl only, never in production's
// table), so for the signed-out identity they are not production doors and are not compared.
const VEHICLE_NAMES = new Set([
  "Continue with local review",
  "Continue with provisioned account",
  "Continue with GitHub",
  "Local review password",
  "Provisioned pilot email",
  "Provisioned pilot password",
]);
const VEHICLE_TAB_NAMES = new Set(["Vendor", "Firm", "Consultant", "Admin", "Help", "Meet PAT", "Individual", "Invitee"]);
// Box 2b: the same form on the /sign-in/* sub-pages is the vehicle for every identity (a
// signed-in crawl identity that lands on /sign-in/firm sees the form it signed in with), and
// the sub-pages' "Open sign-in hub" / "Back to sign-in hub" links belong to that form.
const VEHICLE_HUB_NAMES = new Set(["Open sign-in hub", "Back to sign-in hub"]);
function isVehicle(identity: string, key: string, route = ""): boolean {
  const [role, name, href, region] = JSON.parse(key) as [string, string, string | null, string];
  if (region !== "main") return false;
  const onSignInRoute = route.startsWith("/sign-in");
  if (identity !== "public" && !onSignInRoute) return false;
  if (VEHICLE_NAMES.has(name)) return true;
  if (onSignInRoute && VEHICLE_HUB_NAMES.has(name)) return true;
  return role === "link" && !!href && (href.startsWith("/sign-in?view=") || href === "/sign-in") && VEHICLE_TAB_NAMES.has(name);
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

  it(`every production control survives on the crawled build (${LABEL}) unless ruled in ops/qa/link-removals.json`, { timeout: 70 * 60_000 }, () => {
    expect(BASE_URL).toMatch(/^https?:\/\//);
    const baseline = JSON.parse(readFileSync(BASELINE_FILE, "utf8")) as Baseline;
    const removals = JSON.parse(readFileSync(REMOVALS_FILE, "utf8")) as Removal[];
    // A ruling names the route as its template ("/engagements/[id]/score") or its
    // normalized instance, and may list several controls separated by " / ".
    const isRuled = (route: string, template: string | null | undefined, name: string, label: string) =>
      removals.some((r) => (r.route === route || (template && r.route === template)) && ((r.controlPrefix !== undefined && name.startsWith(r.controlPrefix)) || r.control === label || r.control.split(" / ").map((c) => c.trim()).includes(name.trim())));
    const out = mkdtempSync(path.join(os.tmpdir(), "link-inventory-"));
    const tools = process.env.LINK_INVENTORY_TOOLS ?? ROOT; // tabbable + axe-core are devDependencies
    execFileSync("node", ["--import", "tsx", "scripts/qa/click-inventory.mts"], {
      cwd: ROOT,
      env: { ...process.env, BASE: BASE_URL, BUILD: "current", BUILD_DIR: ROOT, OUT: out, TOOLS: tools, IDENTITIES, MAX_DEPTH: "0", BUILD_FLAGS: LABEL },
      stdio: "pipe",
      timeout: 65 * 60_000, // box 2b: the crawler retries slow/blank pages, so a set can pass 25 min
    });
    // crawled records → per (normalized route, identity) control sets
    const current = new Map<string, Set<string>>();
    for (const identity of IDENTITIES.split(",")) {
      const dir = path.join(out, "current", identity);
      if (!existsSync(dir)) continue;
      for (const file of readdirSync(dir)) {
        if (!file.endsWith(".json") || file.startsWith("_")) continue;
        const record = JSON.parse(readFileSync(path.join(dir, file), "utf8"));
        // Box 2b: several crawled instances can normalize to one baseline route (demo-… ids);
        // a control present on ANY instance counts, so a single slow or failed instance does
        // not erase the controls the others recorded.
        const routeKey = `${normalizeRoute(record.route)}|${identity}`;
        const merged = current.get(routeKey) ?? new Set<string>();
        for (const key of [...controlsOf(record)].map(canonicalKey)) merged.add(key);
        current.set(routeKey, merged);
      }
    }
    expect(current.size, "the crawl produced no records").toBeGreaterThan(50);
    // Box 2b: the shell (header, nav menu, language menu, notifications, footer) is ONE
    // component rendered on every page; the crawl opens its menus per page within a budget,
    // so a slow page can record the shell without its menu contents. A shell control counts
    // as present for an identity when any page of that identity's crawl recorded it.
    const shellUnion = new Map<string, Set<string>>();
    for (const [routeKey, keys] of current) {
      const identity = routeKey.slice(routeKey.lastIndexOf("|") + 1);
      const union = shellUnion.get(identity) ?? new Set<string>();
      for (const key of keys) if (key.endsWith('"shell"]')) union.add(key);
      shellUnion.set(identity, union);
    }
    const missingBy = new Map<string, string[]>();
    let compared = 0;
    for (const [route, byIdentity] of Object.entries(baseline.routes)) {
      for (const [identity, entry] of Object.entries(byIdentity)) {
        const cur = current.get(`${route}|${identity}`);
        if (!cur) continue;
        compared += 1;
        for (const c of entry.controls) {
          const key = canonicalKey(JSON.stringify(c));
          if (cur.has(key)) continue;
          if (c[3] === "shell" && shellUnion.get(identity)?.has(key)) continue;
          if (isVehicle(identity, key, route)) continue;
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
