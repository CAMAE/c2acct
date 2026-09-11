/**
 * CLICK INVENTORY crawler — Mythos method 2026-09-10 (read-only proof; no app code).
 *   BASE=http://127.0.0.1:3021 BUILD=A BUILD_DIR=<repo dir> OUT=~/work/click-inventory IDENTITIES=public,firm-pro,... \
 *   node --import tsx scripts/dev/click-inventory.mts
 * v2 (2026-09-11): menus/disclosures are opened before snapshotting (opened_menus in the record).
 * Per route × identity: ARIA snapshot of <main> and of the shell, tabbable list (tabbable 6.5),
 * axe violations (link-name, button-name, aria-hidden-focus, nested-interactive), discovered hrefs.
 * Routes = union(app-paths-manifest, routes-manifest, app/ page.tsx walk, BFS hrefs to depth 6) + ?panel=/?mode= variants.
 */
import { chromium, type BrowserContext, type Page } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const BASE = process.env.BASE!;
const BUILD = process.env.BUILD!;
const BUILD_DIR = process.env.BUILD_DIR!;
const OUT = path.join(process.env.OUT ?? path.join(process.env.HOME!, "work", "click-inventory"), BUILD);
const TOOLS = process.env.TOOLS!;
const IDENTITIES = (process.env.IDENTITIES ?? "public,firm-pro,firm-elite,vendor-pro,vendor-elite,consultant,admin").split(",");
const MAX_DEPTH = Number(process.env.MAX_DEPTH ?? 6);
const MAX_PAGES = Number(process.env.MAX_PAGES ?? 600);
const PAGE_BUDGET_MS = Number(process.env.PAGE_BUDGET_MS ?? 90_000);
const RESUME = process.env.RESUME === "1";
const LOCAL_REVIEW_PASSWORD = process.env.PAT_LOCAL_REVIEW_PASSWORD ?? "pat-local-review";
const ELITE_PASSWORD = process.env.PAT_DEMO_ELITE_PASSWORD ?? "PatEliteDemo7x";
const BENCH_PASSWORD = process.env.PAT_DEMO_BENCH_PASSWORD ?? "Pat-Demo-Bench-Consultant-2026";
const TABBABLE_JS = readFileSync(path.join(TOOLS, "node_modules/tabbable/dist/index.umd.min.js"), "utf8");
const AXE_JS = readFileSync(path.join(TOOLS, "node_modules/axe-core/axe.min.js"), "utf8");

const FIXTURES: Record<string, string> = {
  "[companyId]": "demo-firm-company-demo-expand-firm-kirkland-reyes-llp-6-1",
  "[productId]": "demo-product-pat-demo-vendor-apstream-control",
  "[ecosystemId]": "demo-bench-ecosystem-sentinel",
  "[firmCompanyId]": "demo-firm-company-demo-bench-firm-calder-pierce-and-boon-0-1",
  "[metricKey]": "avg-alignment",
  "[key]": "firm_tier1_operating_baseline",
  "[insightKey]": "current-product-fit",
  "[templateId]": "no-approved-template",
  "[agentKey]": "pilot-ops",
  "[vendorId]": "demo-vendor-company-pat-demo-vendor",
  "[audience]": "firm",
  "[id]": "demo-engagement",
  "[slug]": "pat-for-firms",
};
const ROUTE_FIXTURES: Record<string, Record<string, string>> = {
  "/consultants/briefings/[companyId]": { "[companyId]": "demo-firm-company-demo-bench-firm-calder-pierce-and-boon-0-1" },
  "/consultants/briefings/[companyId]/products/[productId]": { "[companyId]": "demo-firm-company-demo-bench-firm-calder-pierce-and-boon-0-1", "[productId]": "demo-product-demo-bench-vendor-sentinel-demo-bench-product-sentinel-cas" },
  "/user/insights/[key]": { "[key]": "user_tier1_work_fit" },
  "/admin/briefings/[companyId]/products/[productId]": { "[productId]": "demo-product-demo-expand-vendor-meridian-demo-expand-product-meridian-audit" },
  "/vendor/alignment-insights/[key]": { "[key]": "benchmark-comparison" },
  "/survey/[key]": { "[key]": "firm_alignment_operating_model_v1" },
};
const PANELS: Record<string, string[]> = {
  "/user": ["workspace", "profile", "pat", "help"],
  "/firm": ["workspace", "admin", "pat", "help"],
  "/vendor": ["workspace", "admin", "pat", "help"],
  "/consultants": ["ecosystems", "nudges", "freshness", "pat", "help"],
  "/consultants/ecosystems/[ecosystemId]/firm/[firmCompanyId]": ["operating", "radar", "stack-fit", "roadmap", "follow-ups", "method", "pat", "help"],
  "/consultants/ecosystems/[ecosystemId]/vendor-brief": ["exec", "positioning", "product", "strengths", "roadmap", "method", "pat", "help"],
};
const MODES: Record<string, string[]> = {
  "/firm/membership/checkout": ["configured", "provider"],
  "/vendor/membership/checkout": ["configured", "provider"],
  "/user/membership/checkout": ["configured", "provider"],
};

function resolve(route: string): string {
  const overrides = ROUTE_FIXTURES[route] ?? {};
  return route.replace(/\[[^\]]+\]/g, (segment) => overrides[segment] ?? FIXTURES[segment] ?? segment);
}
function manifestRoutes(): { routes: Set<string>; sources: Record<string, string[]> } {
  const sources: Record<string, string[]> = { "app-paths-manifest": [], "routes-manifest": [], "app-walk": [] };
  const routes = new Set<string>();
  const norm = (p: string) => p.replace(/\/\([^)]+\)/g, "").replace(/\/page$/, "").replace(/\/route$/, "") || "/";
  const apm = path.join(BUILD_DIR, ".next/server/app-paths-manifest.json");
  if (existsSync(apm)) for (const key of Object.keys(JSON.parse(readFileSync(apm, "utf8")))) { if (key.endsWith("/page")) { const r = norm(key); sources["app-paths-manifest"].push(r); routes.add(r); } }
  const rm = path.join(BUILD_DIR, ".next/routes-manifest.json");
  if (existsSync(rm)) { const m = JSON.parse(readFileSync(rm, "utf8")); for (const list of [m.staticRoutes ?? [], m.dynamicRoutes ?? []]) for (const e of list) { const r = String(e.page); if (r.startsWith("/api") || r.startsWith("/_")) continue; sources["routes-manifest"].push(r); routes.add(r); } }
  const walk = (dir: string, prefix: string) => {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { const seg = entry.name.startsWith("(") ? "" : `/${entry.name}`; walk(full, prefix + seg); }
      else if (entry.name === "page.tsx") { const r = prefix === "" ? "/" : prefix; sources["app-walk"].push(r); routes.add(r); }
    }
  };
  walk(path.join(BUILD_DIR, "app"), "");
  return { routes, sources };
}

type Identity = string;
async function signIn(ctx: BrowserContext, identity: Identity): Promise<{ ok: boolean; account: string | null; note: string | null; landed: string | null }> {
  if (identity === "public") return { ok: true, account: null, note: null, landed: null };
  const page = await ctx.newPage();
  try {
    if (identity === "firm-elite" || identity === "vendor-elite" || identity === "consultant") {
      const email = identity === "consultant" ? "review.consultant+sentinel@pat.local" : identity === "firm-elite" ? "demo-firm-elite@pat.local" : "demo-vendor-elite@pat.local";
      const view = identity === "consultant" ? "consultant" : identity.split("-")[0];
      const password = identity === "consultant" ? BENCH_PASSWORD : ELITE_PASSWORD;
      await page.goto(`${BASE}/sign-in?view=${view}`, { waitUntil: "networkidle" });
      const form = page.locator('form:has(input[placeholder="Provisioned pilot email"])');
      await form.locator('input[placeholder="Provisioned pilot email"]').fill(email);
      await form.locator('input[placeholder="Provisioned pilot password"]').fill(password);
      await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/sign-in"), { timeout: 30_000 }), form.locator('button[type="submit"]').click()]);
      return { ok: true, account: email, note: null, landed: page.url().replace(BASE, "") };
    }
    const role = identity.replace(/-pro$/, "");
    const email = `review.${role}@pat.local`;
    await page.goto(`${BASE}/sign-in?view=${role}`, { waitUntil: "networkidle" });
    const form = page.locator(`form:has(input[name="email"][value="${email}"])`);
    await form.locator('input[name="password"]').fill(LOCAL_REVIEW_PASSWORD);
    await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/sign-in"), { timeout: 30_000 }), form.locator('button[type="submit"]').click()]);
    return { ok: true, account: email, note: null, landed: page.url().replace(BASE, "") };
  } catch (error) {
    return { ok: false, account: null, note: `sign-in failed: ${error instanceof Error ? error.message.split("\n")[0].slice(0, 100) : String(error)}`, landed: null };
  } finally { await page.close(); }
}

function fileFor(route: string) { return (route === "/" ? "home" : route.replace(/^\//, "")).replace(/[\/?=&\[\]]/g, "_") + ".json"; }
function stripMain(body: string): string {
  const lines = body.split("\n"); const out: string[] = []; let skipIndent: number | null = null;
  for (const line of lines) {
    const indent = line.match(/^\s*/)![0].length;
    if (skipIndent !== null) { if (line.trim() === "" || indent > skipIndent) continue; skipIndent = null; }
    if (/^\s*- main\b/.test(line)) { skipIndent = indent; continue; }
    out.push(line);
  }
  return out.join("\n");
}

async function inspect(page: Page, url: string) {
  const response = await page.goto(url, { waitUntil: "load", timeout: 60_000 }).catch(() => null);
  await page.waitForLoadState("networkidle", { timeout: 10_000 }).catch(() => {});
  await page.waitForTimeout(250);
  const finalUrl = page.url().replace(BASE, "");
  // Crawler v2 (production-baseline box, 2026-09-11): open every menu /
  // disclosure control before snapshotting so menu contents are in the record.
  // Only buttons that expand something in place — never links, never submit
  // buttons, never anything that signs out or navigates.
  const opened = await page.evaluate(() => {
    const clicked: string[] = [];
    const candidates = Array.from(document.querySelectorAll<HTMLElement>('button[aria-expanded="false"], button[aria-haspopup]:not([aria-expanded="true"]), summary'));
    for (const el of candidates) {
      const name = (el.getAttribute("aria-label") ?? el.textContent ?? "").trim();
      if (/sign ?out|log ?out|delete|remove|submit|send/i.test(name)) continue;
      if (el.closest("form") && el.getAttribute("type") === "submit") continue;
      el.click(); clicked.push(name.slice(0, 60));
    }
    return clicked;
  }).catch(() => [] as string[]);
  if (opened.length) await page.waitForTimeout(300);
  let ariaMain: string | null = null, ariaBody = "";
  const LIGHT = process.env.LIGHT === "1";
  if (!LIGHT) {
    try { ariaBody = await page.locator("body").ariaSnapshot(); } catch { ariaBody = ""; }
    try { if ((await page.locator("main").count()) > 0) ariaMain = await page.locator("main").first().ariaSnapshot(); } catch { ariaMain = null; }
  }
  await page.addScriptTag({ content: TABBABLE_JS }).catch(() => {});
  await page.addScriptTag({ content: AXE_JS }).catch(() => {});
  const tabbable = await page.evaluate(() => {
    const w = window as unknown as { tabbable?: { tabbable: (el: Element) => Element[] }; axe?: { commons?: { text?: { accessibleText: (el: Element) => string } } } };
    if (!w.tabbable) return [];
    const implicit: Record<string, string> = { a: "link", button: "button", select: "combobox", textarea: "textbox", summary: "button", details: "group" };
    const els = w.tabbable.tabbable(document.body);
    return els.map((el, index) => {
      const tag = el.tagName.toLowerCase();
      let role = el.getAttribute("role") ?? implicit[tag] ?? (tag === "input" ? ({ checkbox: "checkbox", radio: "radio", range: "slider", submit: "button", button: "button", file: "button" } as Record<string, string>)[(el as HTMLInputElement).type] ?? "textbox" : tag);
      if (tag === "a" && !el.hasAttribute("href")) role = "generic";
      let name = "";
      try { name = w.axe?.commons?.text?.accessibleText(el) ?? ""; } catch { name = ""; }
      if (!name) name = (el.getAttribute("aria-label") ?? el.getAttribute("title") ?? (el as HTMLElement).innerText ?? "").trim().replace(/\s+/g, " ").slice(0, 120);
      if (!name) name = (el.querySelector("img[alt]")?.getAttribute("alt") ?? el.querySelector("svg title")?.textContent ?? "").trim().slice(0, 120);
      // v3 (box 1b item 2): form fields keyed by their <label> / aria-labelledby text when the
      // accessible name is empty, so relabeled or dropped inputs are visible in the record.
      let label: string | null = null;
      if (/^(input|textarea|select)$/.test(tag)) {
        const byId = el.id ? document.querySelector<HTMLElement>(`label[for="${CSS.escape(el.id)}"]`) : null;
        const byLabelledby = el.getAttribute("aria-labelledby") ? document.getElementById(el.getAttribute("aria-labelledby")!) : null;
        const wrapping = el.closest("label");
        label = (byId?.textContent ?? byLabelledby?.textContent ?? wrapping?.textContent ?? el.getAttribute("placeholder") ?? "").trim().replace(/\s+/g, " ").slice(0, 120) || null;
        if (!name && label) name = label;
      }
      const href = el.getAttribute("href");
      const testid = el.getAttribute("data-testid");
      const region = el.closest("main") ? "main" : "shell";
      const disabled = (el as HTMLButtonElement).disabled === true || el.getAttribute("aria-disabled") === "true";
      const locked = Boolean(el.closest('[data-locked="true"], [data-locked], [aria-disabled="true"]')) && !disabled;
      const fieldType = tag === "input" ? (el as HTMLInputElement).type : /^(textarea|select)$/.test(tag) ? tag : undefined;
      return { index, tag, role, name: name.slice(0, 160), href: href ?? undefined, testid: testid ?? undefined, region, state: disabled ? "disabled" : locked ? "locked" : "enabled", ...(fieldType ? { field: { type: fieldType, label, fieldName: el.getAttribute("name") ?? undefined } } : {}) };
    });
  }).catch(() => []);
  const axe = LIGHT ? { violations: [], note: "LIGHT mode: ARIA snapshot and axe skipped (page too large to serialize)" } : await Promise.race([page.evaluate(async () => {
    const w = window as unknown as { axe?: { run: (ctx: unknown, opts: unknown) => Promise<{ violations: Array<{ id: string; nodes: Array<{ target: string[]; html: string }> }> }> } };
    if (!w.axe) return { violations: [], note: "axe not loaded" };
    const r = await w.axe.run(document, { runOnly: { type: "rule", values: ["link-name", "button-name", "aria-hidden-focus", "nested-interactive"] } });
    return { violations: r.violations.map((v) => ({ rule: v.id, nodes: v.nodes.map((n) => ({ target: n.target.join(" "), html: n.html.slice(0, 200) })) })) };
  }), new Promise<{ violations: never[]; note: string }>((resolve) => setTimeout(() => resolve({ violations: [], note: "axe timed out (30s)" }), 30_000))]).catch((e) => ({ violations: [], note: `axe failed: ${String(e).slice(0, 80)}` }));
  const hrefs = await page.evaluate((base) => {
    const out = new Set<string>();
    for (const a of Array.from(document.querySelectorAll("a[href]"))) {
      const raw = a.getAttribute("href") ?? ""; if (!raw || raw.startsWith("#") || raw.startsWith("mailto:") || raw.startsWith("tel:") || raw.startsWith("javascript:")) continue;
      try { const u = new URL(raw, base); if (u.origin !== new URL(base).origin) continue; out.add(u.pathname + u.search); } catch { /* skip */ }
    }
    return Array.from(out).sort();
  }, BASE).catch(() => [] as string[]);
  return { status: response?.status() ?? null, finalUrl, ariaMain, ariaShell: stripMain(ariaBody), tabbable, axe, hrefs, opened };
}

const CRAWL_SKIP = /\/api\/|\/_next\/|sign-?out|\/dev\//i;
async function main() {
  mkdirSync(OUT, { recursive: true });
  const fp = await fetch(`${BASE}/api/release-fingerprint`).then((r) => r.json()).catch(() => null);
  const fingerprint = fp?.fingerprint ?? null;
  const { routes: manifest, sources } = manifestRoutes();
  const seeds = new Map<string, string>(); // resolved url -> template
  for (const r of manifest) { if (r.startsWith("/dev")) continue; seeds.set(resolve(r), r); for (const p of PANELS[r] ?? []) seeds.set(`${resolve(r)}?panel=${p}`, `${r}?panel=${p}`); for (const m of MODES[r] ?? []) seeds.set(`${resolve(r)}?mode=${m}`, `${r}?mode=${m}`); }
  if (process.env.ONLY_ROUTES) { seeds.clear(); for (const r of process.env.ONLY_ROUTES.split(",")) seeds.set(r, r); }
  const browser = await chromium.launch();
  const summary: Record<string, unknown> = { crawler: "click-inventory v3 (menus opened; fields keyed by label)", build: BUILD, base: BASE, fingerprint, buildDir: BUILD_DIR, flags: process.env.BUILD_FLAGS ?? null, manifestSources: Object.fromEntries(Object.entries(sources).map(([k, v]) => [k, v.length])), seeds: seeds.size, identities: {} };
  await Promise.all(IDENTITIES.map(async (identity) => {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const auth = await signIn(ctx, identity);
    let page = await ctx.newPage();
    const dir = path.join(OUT, identity); mkdirSync(dir, { recursive: true });
    const queue: Array<{ url: string; template: string | null; depth: number; from: string | null }> = [...seeds].map(([url, template]) => ({ url, template, depth: 0, from: null }));
    const seen = new Set<string>(); let visited = 0; const unreachable: Array<{ route: string; status: number | null; finalUrl: string }> = []; let capped = false;
    while (queue.length) {
      const item = queue.shift()!;
      if (seen.has(item.url)) continue; seen.add(item.url);
      if (visited >= MAX_PAGES) { capped = true; break; }
      visited += 1;
      const file = path.join(dir, fileFor(item.url));
      let rec: Awaited<ReturnType<typeof inspect>>;
      if (RESUME && existsSync(file)) {
        const prev = JSON.parse(readFileSync(file, "utf8"));
        rec = { status: prev.status, finalUrl: prev.finalUrl, ariaMain: prev.aria?.main ?? null, ariaShell: prev.aria?.shell ?? "", tabbable: prev.tabbable ?? [], axe: prev.axe ?? { violations: [] }, hrefs: prev.discovered_hrefs ?? [], opened: prev.opened_menus ?? [] };
      } else {
        let timer: NodeJS.Timeout | null = null;
        const budget = new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(`page budget ${PAGE_BUDGET_MS}ms exceeded`)), PAGE_BUDGET_MS); });
        try {
          rec = await Promise.race([inspect(page, `${BASE}${item.url}`), budget]);
        } catch (error) {
          rec = { status: null, finalUrl: page.url().replace(BASE, ""), ariaMain: null, ariaShell: "", tabbable: [], axe: { violations: [], note: `inspect failed: ${error instanceof Error ? error.message.slice(0, 120) : String(error)}` }, hrefs: [], opened: [] };
          await page.close().catch(() => {}); page = await ctx.newPage();
        } finally { if (timer) clearTimeout(timer); }
      }
      const record = { route: item.url, template: item.template, discovered_from: item.from, depth: item.depth, identity, account: auth.account, signIn: auth.note, build: BUILD, fingerprint, status: rec.status, finalUrl: rec.finalUrl, opened_menus: rec.opened, aria: { main: rec.ariaMain, shell: rec.ariaShell }, tabbable: rec.tabbable, axe: rec.axe, discovered_hrefs: rec.hrefs };
      writeFileSync(file, JSON.stringify(record, null, 1));
      if (item.template && item.depth === 0 && (rec.status === null || rec.status >= 400)) unreachable.push({ route: item.template, status: rec.status, finalUrl: rec.finalUrl });
      if (item.depth < MAX_DEPTH && !process.env.ONLY_ROUTES) for (const h of rec.hrefs) { if (CRAWL_SKIP.test(h)) continue; if (!seen.has(h)) queue.push({ url: h, template: null, depth: item.depth + 1, from: item.url }); }
    }
    (summary.identities as Record<string, unknown>)[identity] = { account: auth.account, landed: auth.landed, signIn: auth.note, pages: visited, capped, unreachableManifestRoutes: unreachable };
    console.log(`[${BUILD}] ${identity.padEnd(13)} pages=${visited}${capped ? " (CAPPED)" : ""} unreachable=${unreachable.length} account=${auth.account ?? "-"}${auth.note ? ` note=${auth.note}` : ""}`);
    await ctx.close();
  }));
  await browser.close();
  const summaryFile = path.join(OUT, "_summary.json");
  if (RESUME && existsSync(summaryFile)) {
    const prev = JSON.parse(readFileSync(summaryFile, "utf8"));
    summary.identities = { ...(prev.identities ?? {}), ...(summary.identities as Record<string, unknown>) };
  }
  if (!process.env.ONLY_ROUTES) writeFileSync(summaryFile, JSON.stringify(summary, null, 1));
  console.log(`[${BUILD}] fingerprint=${fingerprint?.releaseId ?? "?"} commit=${fingerprint?.commitShort ?? "?"} seeds=${seeds.size} manifest=${JSON.stringify(summary.manifestSources)}`);
}
main().catch((e) => { console.error(e); process.exit(1); });
