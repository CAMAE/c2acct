/**
 * pnpm sweep:pair — paired 1440/390 captures of a deployment for a list of identities
 * (PAT-RULES Part 5, box 3; R-D "paired captures on the deployed build with a real account").
 *
 *   pnpm sweep:pair --url <deployment or share URL> --identities firm-pro,vendor-pro,consultant
 *                   [--routes /firm,/firm/insights] [--accounts ~/work/preview-accounts.txt]
 *                   [--email-pattern "lesliegarrettphd+{identity}@gmail.com"] [--out ~/work/sweep-pair]
 *
 * Reuses the box 2b capture flow: visit the share URL first (Deployment Protection
 * cookie), sign in through /sign-in?view=<role> with the provisioned-pilot form, then
 * capture each route full-page at 1440×900 and 390×844. Accounts come from a
 * mode-600 file of "<email> <password> # note" lines — never from the command line,
 * never printed. Output: <out>/<host>/<identity>--<route>--<width>.png plus a table.
 */
import { chromium, type Page } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";

function arg(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : fallback;
}
const url = arg("url");
const identities = (arg("identities") ?? "").split(",").map((s) => s.trim()).filter(Boolean);
if (!url || identities.length === 0) {
  console.error("usage: pnpm sweep:pair --url <deployment or share URL> --identities firm-pro,vendor-pro[,...] [--routes /a,/b] [--accounts <file>] [--email-pattern <p>] [--out <dir>]");
  process.exit(2);
}
const DEPLOY_URL: string = url;
const home = os.homedir();
const accountsFile = (arg("accounts") ?? path.join(home, "work", "preview-accounts.txt")).replace(/^~/, home);
const emailPattern = arg("email-pattern") ?? "lesliegarrettphd+{identity}@gmail.com";
const outRoot = (arg("out") ?? path.join(home, "work", "sweep-pair")).replace(/^~/, home);
const explicitRoutes = arg("routes")?.split(",").map((s) => s.trim()).filter(Boolean);
const BASE = new URL(DEPLOY_URL).origin;
const OUT = path.join(outRoot, new URL(DEPLOY_URL).hostname);
mkdirSync(OUT, { recursive: true });

const ACCOUNTS = new Map<string, string>();
if (!existsSync(accountsFile)) { console.error(`accounts file missing: ${accountsFile}`); process.exit(2); }
for (const line of readFileSync(accountsFile, "utf8").split("\n")) { const m = line.match(/^(\S+@\S+)\s+(\S+)\s+#/); if (m) ACCOUNTS.set(m[1], m[2]); }

const ROLE_HOME: Record<string, string> = { firm: "/firm", vendor: "/vendor", consultant: "/consultants", admin: "/admin" };
function roleOf(identity: string) { return identity.split("-")[0]; }
function slug(route: string) { return (route.replace(/^\//, "").replace(/[/?=&]/g, "_") || "home"); }

async function signIn(page: Page, identity: string): Promise<string> {
  const email = emailPattern.replace("{identity}", identity);
  const password = ACCOUNTS.get(email);
  if (!password) throw new Error(`no account for ${email} in ${accountsFile}`);
  await page.goto(DEPLOY_URL, { waitUntil: "domcontentloaded" }); await page.waitForLoadState("networkidle").catch(() => {});
  await page.goto(`${BASE}/sign-in?view=${roleOf(identity)}`, { waitUntil: "domcontentloaded" });
  await page.getByPlaceholder("Provisioned pilot email").fill(email);
  await page.getByPlaceholder("Provisioned pilot password").fill(password);
  await page.getByRole("button", { name: "Continue with provisioned account" }).click();
  await page.waitForURL((u) => !u.pathname.startsWith("/sign-in"), { timeout: 90_000 });
  return email;
}

const browser = await chromium.launch();
const rows: string[] = [];
let failures = 0;
for (const identity of identities) {
  const routes = explicitRoutes ?? [ROLE_HOME[roleOf(identity)] ?? "/"];
  for (const width of [1440, 390] as const) {
    const ctx = await browser.newContext({ viewport: { width, height: width === 1440 ? 900 : 844 } });
    const page = await ctx.newPage();
    try {
      const email = await signIn(page, identity);
      for (const route of routes) {
        const res = await page.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 120_000 }).catch(() => null);
        const file = path.join(OUT, `${identity}--${slug(route)}--${width}.png`);
        await page.screenshot({ path: file, fullPage: true });
        const heading = (await page.locator("main h1, h1").first().textContent().catch(() => ""))?.trim().slice(0, 60) ?? "";
        rows.push(`| ${identity} | ${width} | ${route} | ${res?.status() ?? "no response"} | ${heading} | ${path.relative(outRoot, file)} |`);
        if (!res || res.status() >= 400) failures++;
        void email;
      }
    } catch (error) {
      failures++;
      rows.push(`| ${identity} | ${width} | — | ERROR | ${String(error).split("\n")[0].slice(0, 80)} | — |`);
    }
    await ctx.close();
  }
}
await browser.close();
console.log(`deployment: ${new URL(DEPLOY_URL).hostname}\n| identity | width | route | status | first heading | file |\n|---|---|---|---|---|---|\n${rows.join("\n")}`);
process.exit(failures ? 1 : 0);
