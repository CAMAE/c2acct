/**
 * Negative-access matrix (box 1b item 3): each preview account requests every portal home and
 * one deep page; 200 is expected only inside its own portal. Any other 200 is P1.
 *   S=<scratch with share.txt> node --import tsx tools/access-matrix.mts > ops/qa/access-matrix.md
 */
import { chromium, type BrowserContext } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
const SHARE = process.env.SHARE_URL ?? readFileSync(path.join(process.env.S!, "share.txt"), "utf8").trim();
const BASE = new URL(SHARE).origin;
const ACCOUNTS = new Map<string, string>();
for (const line of readFileSync(path.join(process.env.HOME!, "work", "preview-accounts.txt"), "utf8").split("\n")) { const m = line.match(/^(\S+@\S+)\s+(\S+)\s+#/); if (m) ACCOUNTS.set(m[1], m[2]); }
const ROUTES = ["/firm", "/vendor", "/consultants", "/admin", "/firm/alignment-board", "/vendor/battlecard", "/consultants/ecosystems/demo-bench-ecosystem-sentinel", "/admin/users"];
const OWN: Record<string, RegExp> = { "firm-pro": /^\/firm/, "firm-elite": /^\/firm/, "vendor-pro": /^\/vendor/, "vendor-elite": /^\/vendor/, consultant: /^\/consultants/, admin: /^\/admin/ };
const ROLES: Array<[string, string]> = [["firm-pro", "firm"], ["firm-elite", "firm"], ["vendor-pro", "vendor"], ["vendor-elite", "vendor"], ["consultant", "consultant"], ["admin", "admin"]];
async function probe(ctx: BrowserContext, url: string) { const r = await ctx.request.get(url, { maxRedirects: 0 }); const loc = r.headers()["location"]; return `${r.status()}${loc ? " → " + loc.replace(BASE, "").split("?")[0] : ""}`; }
const browser = await chromium.launch();
console.log(`# Negative-access matrix · ${BASE} · ${new Date().toISOString()}\n`);
console.log("| account | " + ROUTES.join(" | ") + " |"); console.log("|---|" + ROUTES.map(() => "---").join("|") + "|");
let p1 = 0;
for (const person of ["lesliegarrettphd@gmail.com", "cameron@garrettandgarrett.info"]) for (const [role, view] of ROLES) {
  const [local, domain] = person.split("@"); const email = `${local}+${role}@${domain}`;
  const ctx = await browser.newContext(); const page = await ctx.newPage();
  await page.goto(SHARE, { waitUntil: "domcontentloaded" }); await page.waitForLoadState("networkidle").catch(() => {});
  await page.goto(`${BASE}/sign-in?view=${view}`, { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("Provisioned pilot email").fill(email); await page.getByPlaceholder("Provisioned pilot password").fill(ACCOUNTS.get(email)!);
  await page.getByRole("button", { name: "Continue with provisioned account" }).click(); await page.waitForURL((u) => !u.pathname.startsWith("/sign-in"), { timeout: 30_000 });
  const cells: string[] = [];
  for (const r of ROUTES) { const res = await probe(ctx, `${BASE}${r}`); const own = OWN[role].test(r); const ok = own ? res.startsWith("200") : !res.startsWith("200"); if (!ok) p1 += 1; cells.push(`${res}${ok ? "" : " **P1**"}`); }
  console.log(`| ${email} | ${cells.join(" | ")} |`);
  await ctx.close();
}
await browser.close();
console.log(`\nUnexpected results (P1): ${p1}`);
