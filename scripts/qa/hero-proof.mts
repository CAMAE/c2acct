/**
 * pnpm hero:proof -- --base http://127.0.0.1:3000
 *
 * 3f (R52) hero and header proof over the route atlas list (every app/**\/page.tsx, the
 * same walk scripts/qa/route-atlas.ts does), restricted to the pages that carry the page
 * head (IN_SCOPE below); every other atlas route is listed as excluded. For each page in scope:
 *   - exactly one <h1>;
 *   - the descriptor "Performance Alignment Technology" ([data-testid="wordmark-descriptor"])
 *     is rendered and sits DIRECTLY UNDER the PAT logo (its top at or below the logo's
 *     bottom, horizontally overlapping);
 *   - public pages: the header nav reads exactly For firms, For vendors, Sign in (plus the
 *     language control) and the footer carries Methodology and Trust.
 * Prints one line per page and exits 1 on any failure.
 */
import { readdirSync } from "node:fs";
import path from "node:path";
import { chromium, type BrowserContext } from "@playwright/test";
function arg(name: string, fallback?: string) { const i = process.argv.indexOf(`--${name}`); return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : fallback; }
const BASE = arg("base", "http://127.0.0.1:3000")!;
const ROOT = process.cwd();
const ACCOUNTS: Record<string, { email: string; password: string; view: string; form: "pilot" | "review" }> = {
  "firm-pro": { email: "review.firm@pat.local", password: process.env.PAT_LOCAL_REVIEW_PASSWORD ?? "pat-local-review", view: "firm", form: "review" },
  "vendor-pro": { email: "review.vendor@pat.local", password: process.env.PAT_LOCAL_REVIEW_PASSWORD ?? "pat-local-review", view: "vendor", form: "review" },
  "firm-elite": { email: "demo-firm-elite@pat.local", password: process.env.PAT_DEMO_ELITE_PASSWORD ?? "PatEliteDemo7x", view: "firm", form: "pilot" },
  consultant: { email: "review.consultant+sentinel@pat.local", password: process.env.PAT_DEMO_BENCH_PASSWORD ?? "Pat-Demo-Bench-Consultant-2026", view: "consultant", form: "pilot" },
};
function listRoutes(): string[] {
  const out = new Set<string>();
  const walk = (dir: string, prefix: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "dev" && prefix === "") continue;
        const seg = entry.name.startsWith("(") ? "" : `/${entry.name}`;
        walk(full, prefix + seg);
      } else if (entry.name === "page.tsx") out.add(prefix === "" ? "/" : prefix);
    }
  };
  walk(path.join(ROOT, "app"), "");
  return [...out].sort();
}
const DEMO: Record<string, string> = { "/firm/insights/[key]": "/firm/insights/firm_tier1_operating_baseline", "/vendor/alignment-insights/[key]": "/vendor/alignment-insights/implementation-risk-posture" };
// The pages that carry the page head (box 3f item A; the mock's rule: portal homes, the
// insight hubs and drill downs, the sandbox, Methodology, Trust and the trust set, help).
// Everything else on the atlas (assessment steps, readouts, tables, briefings, admin, flows
// and flag-dark groups) keeps a slim title line and is listed as excluded.
const IN_SCOPE = new Set([
  "/", "/methodology", "/trust", "/trust/pat", "/terms", "/privacy", "/support", "/billing-policy", "/security", "/release", "/help", "/pat",
  "/firm", "/firm/insights", "/firm/insights/[key]", "/firm/alignment-board",
  "/vendor", "/vendor/alignment-insights", "/vendor/alignment-insights/[key]",
  "/consultants",
]);
function identityFor(route: string): string | null {
  if (route.startsWith("/firm/alignment-board")) return "firm-elite";
  if (route.startsWith("/firm")) return "firm-pro";
  if (route.startsWith("/vendor")) return "vendor-pro";
  if (route.startsWith("/consultants")) return "consultant";
  return null;
}
async function signIn(ctx: BrowserContext, ident: string) {
  const a = ACCOUNTS[ident]; if (!a) return;
  const page = await ctx.newPage(); await page.goto(`${BASE}/sign-in?view=${a.view}`, { waitUntil: "networkidle" });
  if (a.form === "pilot") { const form = page.locator('form:has(input[placeholder="Provisioned pilot email"])'); await form.locator('input[placeholder="Provisioned pilot email"]').fill(a.email); await form.locator('input[placeholder="Provisioned pilot password"]').fill(a.password); await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/sign-in"), { timeout: 60_000 }), form.locator('button[type="submit"]').click()]); }
  else { const form = page.locator(`form:has(input[name="email"][value="${a.email}"])`); await form.locator('input[name="password"]').fill(a.password); await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/sign-in"), { timeout: 60_000 }), form.locator('button[type="submit"]').click()]); }
  await page.close();
}
const PAGE_SCRIPT = String.raw`
  const h1s = [...document.querySelectorAll('h1')].filter((h) => (h.textContent || '').trim().length > 0);
  const desc = document.querySelector('[data-testid="wordmark-descriptor"]');
  let under = false;
  if (desc) {
    const d = desc.getBoundingClientRect();
    const logos = [...document.querySelectorAll('img[alt="PAT"], img[alt="PAT logo"]')];
    under = logos.some((img) => { const r = img.getBoundingClientRect(); return r.width > 0 && d.top >= r.bottom - 2 && d.left < r.right + 8 && d.right > r.left - 8; });
  }
  const nav = document.querySelector('nav');
  const navLinks = nav ? [...nav.querySelectorAll('a')].map((a) => (a.textContent || '').trim()).filter(Boolean) : [];
  const footer = document.querySelector('footer');
  const footerLinks = footer ? [...footer.querySelectorAll('a')].map((a) => (a.textContent || '').trim()) : [];
  return { h1: h1s.map((h) => (h.textContent || '').trim().slice(0, 60)), descriptor: !!desc, under, navLinks, footerLinks };
`;
async function main() {
  const routes = listRoutes();
  const inScope = routes.filter((r) => IN_SCOPE.has(r)).map((r) => DEMO[r] ?? r);
  const excluded = routes.filter((r) => !IN_SCOPE.has(r));
  console.log(`routes ${routes.length} · in scope ${inScope.length} · excluded ${excluded.length}: ${excluded.join(" ")}`);
  const browser = await chromium.launch();
  const byIdent = new Map<string, BrowserContext>();
  let failed = 0;
  for (const route of inScope) {
    const ident = identityFor(route) ?? "public";
    let ctx = byIdent.get(ident);
    if (!ctx) { ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } }); if (ident !== "public") await signIn(ctx, ident); byIdent.set(ident, ctx); }
    const page = await ctx.newPage();
    const res = await page.goto(`${BASE}${route}`, { waitUntil: "load", timeout: 120_000 }).catch(() => null);
    await page.waitForTimeout(1500);
    const r = (await page.evaluate(new Function("args", PAGE_SCRIPT) as unknown as () => unknown, {})) as { h1: string[]; descriptor: boolean; under: boolean; navLinks: string[]; footerLinks: string[] };
    const isPublic = ident === "public";
    const navOk = !isPublic || (r.navLinks.filter((l) => ["For firms", "For vendors", "Sign in"].includes(l)).length === 3 && !r.navLinks.includes("Methodology") && !r.navLinks.includes("Trust"));
    const footerOk = !isPublic || (r.footerLinks.includes("Methodology") && r.footerLinks.includes("Trust"));
    const ok = r.h1.length === 1 && r.descriptor && r.under && navOk && footerOk;
    if (!ok) failed += 1;
    console.log(`${ok ? "ok  " : "FAIL"} ${ident.padEnd(10)} ${route.padEnd(44)} ${res?.status() ?? "-"} · h1 ${r.h1.length} ${JSON.stringify(r.h1)} · descriptor ${r.descriptor ? (r.under ? "under logo" : "NOT under logo") : "missing"}${isPublic ? ` · nav ${navOk ? "ok" : JSON.stringify(r.navLinks)} · footer ${footerOk ? "ok" : "missing Methodology/Trust"}` : ""}`);
    await page.close();
  }
  await browser.close();
  console.log(`hero proof: ${inScope.length - failed}/${inScope.length} pages pass`);
  process.exit(failed ? 1 : 0);
}
main().catch((error) => { console.error(error); process.exit(1); });
