/**
 * pnpm word:sweep -- --base http://127.0.0.1:3023 --word consultant [--identities firm-pro,...]
 *
 * R17 zero-occurrence proof (box 2d, 2026-09-25): signs in as each local review
 * identity (same accounts and form as scripts/qa/click-inventory.mts), visits the
 * routes a user reads, and counts the WORD in the rendered visible text. Emails,
 * URLs and data attributes are not text and are ignored. Exit 1 on any hit.
 */
import { chromium, type BrowserContext } from "@playwright/test";

function arg(name: string, fallback?: string) {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : fallback;
}
const BASE = arg("base", "http://127.0.0.1:3023")!;
const WORD = arg("word", "consultant")!;
const IDENTITIES = (arg("identities", "public,firm-pro,firm-elite,vendor-pro,vendor-elite,consultant,admin") ?? "").split(",");
const LOCAL_REVIEW_PASSWORD = process.env.PAT_LOCAL_REVIEW_PASSWORD ?? "pat-local-review";
const ELITE_PASSWORD = process.env.PAT_DEMO_ELITE_PASSWORD ?? "PatEliteDemo7x";
const BENCH_PASSWORD = process.env.PAT_DEMO_BENCH_PASSWORD ?? "Pat-Demo-Bench-Consultant-2026";
const ROUTES: Record<string, string[]> = {
  public: ["/", "/sign-in", "/sign-in?view=consultant", "/methodology", "/trust", "/pat", "/help", "/help/pat-for-consultants-and-ecosystem-owners", "/does-not-exist"],
  "firm-pro": ["/firm", "/firm/insights", "/firm/membership", "/firm/alignment-assessment"],
  "firm-elite": ["/firm", "/firm/insights?mode=elite"],
  "vendor-pro": ["/vendor", "/vendor/battlecard", "/vendor/alignment-insights"],
  "vendor-elite": ["/vendor", "/vendor/battlecard"],
  consultant: ["/consultants", "/consultants?panel=freshness", "/consultants?panel=nudges", "/consultants?panel=help"],
  admin: ["/admin", "/admin/insights", "/admin/briefings", "/admin/users", "/admin/consultants"],
};
const word = new RegExp(`\\b${WORD}s?\\b`, "gi");

async function signIn(ctx: BrowserContext, identity: string) {
  if (identity === "public") return;
  const page = await ctx.newPage();
  if (identity === "firm-elite" || identity === "vendor-elite" || identity === "consultant") {
    const email = identity === "consultant" ? "review.consultant+sentinel@pat.local" : identity === "firm-elite" ? "demo-firm-elite@pat.local" : "demo-vendor-elite@pat.local";
    const view = identity === "consultant" ? "consultant" : identity.split("-")[0];
    await page.goto(`${BASE}/sign-in?view=${view}`, { waitUntil: "networkidle" });
    const form = page.locator('form:has(input[placeholder="Provisioned pilot email"])');
    await form.locator('input[placeholder="Provisioned pilot email"]').fill(email);
    await form.locator('input[placeholder="Provisioned pilot password"]').fill(identity === "consultant" ? BENCH_PASSWORD : ELITE_PASSWORD);
    await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/sign-in"), { timeout: 60_000 }), form.locator('button[type="submit"]').click()]);
  } else {
    const role = identity.replace(/-pro$/, "");
    const email = `review.${role}@pat.local`;
    await page.goto(`${BASE}/sign-in?view=${role}`, { waitUntil: "networkidle" });
    const form = page.locator(`form:has(input[name="email"][value="${email}"])`);
    await form.locator('input[name="password"]').fill(LOCAL_REVIEW_PASSWORD);
    await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/sign-in"), { timeout: 60_000 }), form.locator('button[type="submit"]').click()]);
  }
  await page.close();
}

const browser = await chromium.launch();
let hits = 0; let dataHits = 0; let pages = 0;
for (const identity of IDENTITIES) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  try {
    await signIn(ctx, identity);
    const page = await ctx.newPage();
    for (const route of ROUTES[identity] ?? []) {
      const res = await page.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 120_000 }).catch(() => null);
      pages++;
      const text = await page.evaluate(() => document.body.innerText).catch(() => "");
      const found = [...text.matchAll(word)];
      // Data rows (organization and display names seeded or created by tests) are not copy.
      const DATA = /Consultant (Unassigned|Assigned) Firm \d+|^Consultant [A-Z][\w&. ]+$|Created organization Consultant|^Consultant review$/;
      // Route paths are unchanged by design (R17 keeps /consultants); a path fragment is not a word.
      const stripPaths = (l: string) => l.replace(/\/[\w/[\]-]*consultants?[\w/[\]-]*/g, "/…");
      const all = found.length ? text.split("\n").map(stripPaths).filter((l) => word.test(l) && !/@|https?:\/\//.test(l)).map((l) => l.trim().slice(0, 90)) : [];
      const dataLines = all.filter((l) => DATA.test(l));
      const lines = all.filter((l) => !DATA.test(l));
      const real = lines.length;
      hits += real;
      dataHits += dataLines.length;
      console.log(`${identity} ${route} → ${res?.status() ?? "-"} · ${real} copy hit(s)${dataLines.length ? ` · ${dataLines.length} data row(s)` : ""}${real ? " · " + lines.slice(0, 3).join(" | ") : ""}`);
    }
  } catch (error) {
    console.log(`${identity} ERROR ${String(error).split("\n")[0].slice(0, 120)}`);
    hits++;
  }
  await ctx.close();
}
await browser.close();
console.log(`word "${WORD}": ${hits} copy hit(s) and ${dataHits} data row(s) across ${pages} pages`);
process.exit(hits ? 1 : 0);
