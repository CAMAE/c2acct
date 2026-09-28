/**
 * pnpm font:proof -- --base http://127.0.0.1:3023 [--routes ident:route,...] [--floor 12] [--meta 14]
 *
 * 3f (R52) measured type proof. Signs in per identity (local review set), renders each
 * route at 1440 and 390, and reads the COMPUTED font size of every element with
 * visible text. Asserts: no visible text below the floor (12px), every .pat-meta /
 * .pat-label element at or above the meta size (14px meta, 12px label), and every SVG
 * <text> inside a radar at or above 12px. Prints one line per page and exits 1 on any
 * violation. Hidden, empty and sr-only text is ignored.
 */
import { chromium, type BrowserContext } from "@playwright/test";
function arg(name: string, fallback?: string) { const i = process.argv.indexOf(`--${name}`); return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : fallback; }
const BASE = arg("base", "http://127.0.0.1:3023")!; const FLOOR = Number(arg("floor", "12")); const META = Number(arg("meta", "14"));
const ACCOUNTS: Record<string, { email: string; password: string; view: string; form: "pilot" | "review" }> = {
  "firm-pro": { email: "review.firm@pat.local", password: process.env.PAT_LOCAL_REVIEW_PASSWORD ?? "pat-local-review", view: "firm", form: "review" },
  "vendor-pro": { email: "review.vendor@pat.local", password: process.env.PAT_LOCAL_REVIEW_PASSWORD ?? "pat-local-review", view: "vendor", form: "review" },
  "firm-elite": { email: "demo-firm-elite@pat.local", password: process.env.PAT_DEMO_ELITE_PASSWORD ?? "PatEliteDemo7x", view: "firm", form: "pilot" },
  "vendor-elite": { email: "demo-vendor-elite@pat.local", password: process.env.PAT_DEMO_ELITE_PASSWORD ?? "PatEliteDemo7x", view: "vendor", form: "pilot" },
  consultant: { email: "review.consultant+sentinel@pat.local", password: process.env.PAT_DEMO_BENCH_PASSWORD ?? "Pat-Demo-Bench-Consultant-2026", view: "consultant", form: "pilot" },
};
const DEFAULT = "public:/,public:/methodology,public:/trust,public:/terms,public:/privacy,public:/support,public:/billing-policy,public:/security,public:/release,firm-pro:/firm/insights,firm-pro:/firm/insights/firm_tier1_operating_baseline,firm-elite:/firm/alignment-board,firm-elite:/firm,vendor-pro:/vendor,vendor-pro:/vendor/alignment-insights,vendor-pro:/vendor/alignment-insights/benchmark-comparison";
const PLAN = (arg("routes", DEFAULT) ?? "").split(",").map((e) => { const [ident, route] = e.split(":"); return { ident, route }; });
async function signIn(ctx: BrowserContext, ident: string) {
  const a = ACCOUNTS[ident]; if (!a) return;
  const page = await ctx.newPage(); await page.goto(`${BASE}/sign-in?view=${a.view}`, { waitUntil: "networkidle" });
  if (a.form === "pilot") { const form = page.locator('form:has(input[placeholder="Provisioned pilot email"])'); await form.locator('input[placeholder="Provisioned pilot email"]').fill(a.email); await form.locator('input[placeholder="Provisioned pilot password"]').fill(a.password); await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/sign-in"), { timeout: 60_000 }), form.locator('button[type="submit"]').click()]); }
  else { const form = page.locator(`form:has(input[name="email"][value="${a.email}"])`); await form.locator('input[name="password"]').fill(a.password); await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/sign-in"), { timeout: 60_000 }), form.locator('button[type="submit"]').click()]); }
  await page.close();
}
// Plain JS, kept as a string so the TypeScript loader does not rewrite it for the browser.
const PAGE_SCRIPT = String.raw`
  const floor = args.floor, meta = args.meta;
  const visible = function (el) { const cs = getComputedStyle(el); if (cs.display === "none" || cs.visibility === "hidden" || Number(cs.opacity) === 0) return false; const rect = el.getBoundingClientRect ? el.getBoundingClientRect() : null; if (!rect || rect.width < 2 || rect.height < 2) return false; if (el.closest(".sr-only,[aria-hidden='true'],template,script,style,noscript")) return false; return true; };
  const own = function (el) { return Array.prototype.some.call(el.childNodes, function (n) { return n.nodeType === 3 && (n.textContent || "").trim().length > 0; }); };
  const below = [], metaBad = [], radarBad = []; let min = 999; const metaSizes = new Set(), labelSizes = new Set();
  const all = document.querySelectorAll("body *");
  for (let i = 0; i < all.length; i++) {
    const el = all[i];
    if (!own(el) || !visible(el)) continue;
    const size = parseFloat(getComputedStyle(el).fontSize); if (!isFinite(size)) continue;
    min = Math.min(min, size);
    const text = (el.textContent || "").trim().replace(/\s+/g, " ").slice(0, 40);
    const cls = typeof el.className === "string" ? el.className.split(" ").slice(0, 2).join(".") : "";
    if (size < floor - 0.05) below.push(size.toFixed(1) + "px <" + el.tagName.toLowerCase() + (cls ? "." + cls : "") + "> \"" + text + "\"");
    if (el.classList.contains("pat-meta")) { metaSizes.add(Math.round(size * 10) / 10); if (size < meta - 0.05) metaBad.push(size.toFixed(1) + "px \"" + text + "\""); }
    if (el.classList.contains("pat-label")) labelSizes.add(Math.round(size * 10) / 10);
    if (el.tagName.toLowerCase() === "text" && el.closest("svg") && size < floor - 0.05) radarBad.push(size.toFixed(1) + "px \"" + text + "\"");
  }
  return { min: min, belowCount: below.length, below: below.slice(0, 6), metaSizes: Array.from(metaSizes), labelSizes: Array.from(labelSizes), metaBad: metaBad.slice(0, 3), radarBad: radarBad.slice(0, 4), radarBadCount: radarBad.length };
`;
const browser = await chromium.launch(); let violations = 0; let pages = 0;
for (const width of [1440, 390]) {
  const byIdent = new Map<string, BrowserContext>();
  for (const { ident, route } of PLAN) {
    let ctx = byIdent.get(ident); if (!ctx) { ctx = await browser.newContext({ viewport: { width, height: width === 1440 ? 900 : 844 } }); await signIn(ctx, ident); byIdent.set(ident, ctx); }
    const page = await ctx.newPage(); const res = await page.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 120_000 }).catch(() => null); pages++;
    const r = (await page.evaluate(new Function("args", PAGE_SCRIPT) as unknown as (a: { floor: number; meta: number }) => unknown, { floor: FLOOR, meta: META })) as {
      min: number; belowCount: number; below: string[]; metaSizes: number[]; labelSizes: number[]; metaBad: string[]; radarBad: string[]; radarBadCount: number;
    };
    const bad = r.belowCount + r.metaBad.length + r.radarBadCount; violations += bad;
    console.log(`${width} ${ident} ${route} → ${res?.status() ?? "-"} · min ${r.min.toFixed(1)}px · below ${FLOOR}px: ${r.belowCount} · pat-meta sizes ${JSON.stringify(r.metaSizes)} · pat-label sizes ${JSON.stringify(r.labelSizes)} · svg text below floor: ${r.radarBadCount}${bad ? "\n   e.g. " + [...r.below, ...r.radarBad, ...r.metaBad].slice(0, 6).join(" | ") : ""}`);
    await page.close();
  }
  for (const ctx of byIdent.values()) await ctx.close();
}
await browser.close();
console.log(`font floor ${FLOOR}px, meta ${META}px: ${violations} violation(s) across ${pages} page renders`);
process.exit(violations ? 1 : 0);
