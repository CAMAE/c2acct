import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { chromium, type BrowserContext, type Page } from "@playwright/test";

/**
 * Route atlas (A1): every app/**\/page.tsx route except /dev/*, captured full-page
 * at 1440 and 390 on the flag-on preview, under the identity that can see it;
 * every ?panel= of a PortalPanelSelector page captured separately.
 *
 *   PLAYWRIGHT_BASE_URL=http://127.0.0.1:3011 node --import tsx scripts/qa/route-atlas.ts before|after [outRoot]
 *
 * Output: <outRoot>/<phase>/<identity>/<route-slug>[--panel]-{1440,390}.png + index.md
 * (route → identity → files → HTTP status). Demo-depth fixtures fill the dynamic
 * segments (see FIXTURES). Reports counts and any 4xx/5xx.
 */
const base = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3011";
const phase = process.argv[2] ?? "before";
const outRoot = process.argv[3] ?? path.join(process.env.HOME ?? "~", "work", `route-atlas-${new Date().toISOString().slice(0, 10)}`);
const outDir = path.join(outRoot, phase);
const ROOT = process.cwd();
const envFile = readFileSync(path.join(ROOT, ".env.local"), "utf8");
const localReviewPassword = (envFile.match(/^PAT_LOCAL_REVIEW_PASSWORD=(.*)$/m) ?? [])[1] ?? "pat-local-review";

const FIXTURES: Record<string, string> = {
  "[companyId]": "demo-firm-company-demo-expand-firm-kirkland-reyes-llp-6-1", // Elite demo firm (admin views)
  "[productId]": "demo-product-pat-demo-vendor-apstream-control", // PAT Demo Vendor product
  "[ecosystemId]": "demo-bench-ecosystem-sentinel",
  "[firmCompanyId]": "demo-firm-company-demo-bench-firm-calder-pierce-and-boon-0-1",
  "[metricKey]": "avg-alignment",
  "[key]": "firm_tier1_operating_baseline",
  "[insightKey]": "current-product-fit", // vendorProductInsights key (lib/insightContent.ts); the old guess 404'd
  "[templateId]": "no-approved-template", // ModuleTemplate is empty locally → expect 404
  "[agentKey]": "pilot-ops",
  "[vendorId]": "demo-vendor-company-pat-demo-vendor",
  "[audience]": "firm",
  "[id]": "demo-engagement",
};
/** Per-route overrides where the generic fixture would not resolve. */
const ROUTE_FIXTURES: Record<string, Record<string, string>> = {
  "/consultants/briefings/[companyId]": { "[companyId]": "demo-firm-company-demo-bench-firm-calder-pierce-and-boon-0-1" },
  "/consultants/briefings/[companyId]/products/[productId]": {
    "[companyId]": "demo-firm-company-demo-bench-firm-calder-pierce-and-boon-0-1",
    "[productId]": "demo-product-demo-bench-vendor-sentinel-demo-bench-product-sentinel-cas",
  },
  "/user/insights/[key]": { "[key]": "user_tier1_work_fit" },
  // Kirkland (the admin/company fixture) reviews the Meridian products, not APStream.
  "/admin/briefings/[companyId]/products/[productId]": {
    "[productId]": "demo-product-demo-expand-vendor-meridian-demo-expand-product-meridian-audit",
  },
  "/vendor/alignment-insights/[key]": { "[key]": "benchmark-comparison" },
  "/survey/[key]": { "[key]": "firm_alignment_operating_model_v1" },
};
/**
 * Routes that are 404 by design with the pilot flag set (fail-closed flags).
 * Recorded so the index says WHY a non-2xx is expected; anything not listed
 * here that is not 2xx/3xx is an unexpected finding.
 */
const EXPECTED_NON_2XX: Record<string, { status: number; reason: string }> = {
  "/ask": { status: 404, reason: "PAT_ENABLE_PUBLIC_TIER off → notFound() (app/(public)/ask/page.tsx)" },
  "/notifications": { status: 404, reason: "PAT_ENABLE_PINGS off → notFound() (isPingsEnabled)" },
  "/firm/benchmark": { status: 404, reason: "PAT_ENABLE_PINGS off → notFound() (isPingsEnabled)" },
  "/vendor/review-refresh": { status: 404, reason: "PAT_ENABLE_PINGS off → notFound() (isPingsEnabled)" },
  "/firm/modules": { status: 404, reason: "PAT_ENABLE_ADAPTIVE_MODULES off → notFound() (lib/modules/portal.ts gate)" },
  "/firm/modules/[templateId]": { status: 404, reason: "PAT_ENABLE_ADAPTIVE_MODULES off → notFound() (lib/modules/portal.ts gate)" },
};

const PANELS: Record<string, string[]> = {
  "/user": ["workspace", "profile", "pat", "help"],
  "/firm": ["workspace", "admin", "pat", "help"],
  "/vendor": ["workspace", "admin", "pat", "help"],
  "/consultants": ["ecosystems", "nudges", "freshness", "pat", "help"],
  "/consultants/ecosystems/[ecosystemId]/firm/[firmCompanyId]": ["operating", "radar", "stack-fit", "roadmap", "follow-ups", "method", "pat", "help"],
  "/consultants/ecosystems/[ecosystemId]/vendor-brief": ["exec", "positioning", "product", "strengths", "roadmap", "method", "pat", "help"],
};

type Identity = "public" | "firm" | "vendor" | "individual" | "consultant" | "admin";
function identityFor(route: string): Identity {
  if (route.startsWith("/admin")) return "admin";
  if (route.startsWith("/consultants")) return "consultant";
  if (route.startsWith("/firm") || route.startsWith("/survey") || route.startsWith("/engagements")) return "firm";
  if (route.startsWith("/vendor")) return "vendor";
  if (route.startsWith("/user")) return "individual";
  return "public";
}

function listRoutes(): string[] {
  const out = new Set<string>();
  const walk = (dir: string, prefix: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "dev" && prefix === "") continue;
        const seg = entry.name.startsWith("(") ? "" : `/${entry.name}`;
        walk(full, prefix + seg);
      } else if (entry.name === "page.tsx") {
        out.add(prefix === "" ? "/" : prefix);
      }
    }
  };
  walk(path.join(ROOT, "app"), "");
  return [...out].filter((route) => !route.startsWith("/dev")).sort();
}

function resolve(route: string): string {
  const overrides = ROUTE_FIXTURES[route] ?? {};
  return route.replace(/\[[^\]]+\]/g, (segment) => overrides[segment] ?? FIXTURES[segment] ?? segment);
}

function slug(route: string) {
  return route === "/" ? "home" : route.replace(/^\//, "").replace(/[\/\[\]?=]/g, "_");
}

/** Returns null when signed in, or the reason the identity could not sign in (captured signed-out instead). */
async function signIn(ctx: BrowserContext, identity: Identity): Promise<string | null> {
  if (identity === "public") return null;
  const page = await ctx.newPage();
  try {
  if (identity === "consultant") {
    await page.goto(`${base}/sign-in?view=consultant`, { waitUntil: "networkidle" });
    const form = page.locator('form:has(input[placeholder="Provisioned pilot email"])');
    await form.locator('input[placeholder="Provisioned pilot email"]').fill("review.consultant+sentinel@pat.local");
    await form.locator('input[placeholder="Provisioned pilot password"]').fill(process.env.PAT_DEMO_BENCH_PASSWORD ?? "Pat-Demo-Bench-Consultant-2026");
    await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/sign-in")), form.locator('button[type="submit"]').click()]);
  } else {
    const view = identity === "individual" ? "individual" : identity;
    const email = `review.${identity}@pat.local`;
    await page.goto(`${base}/sign-in?view=${view}`, { waitUntil: "networkidle" });
    const form = page.locator(`form:has(input[name="email"][value="${email}"])`);
    await form.locator('input[name="password"]').fill(localReviewPassword);
    await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/sign-in")), form.locator('button[type="submit"]').click()]);
    }
    return null;
  } catch (error) {
    // e.g. review.individual: individual surfaces are off for the pilot, so the
    // sign-in view has no form. Capture the routes signed out and say so.
    return `sign-in unavailable for ${identity} (${error instanceof Error ? error.message.split("\n")[0].slice(0, 60) : "unknown"}); captured signed out`;
  } finally {
    await page.close();
  }
}

type IndexRow = { route: string; url: string; identity: Identity; panel: string | null; status: number | null; finalUrl: string; files: string[]; notes: string[] };

async function capture(page: Page, url: string, file: string, width: number) {
  const sidecar = `${file}.json`;
  if (existsSync(file) && existsSync(sidecar)) {
    return JSON.parse(readFileSync(sidecar, "utf8")) as { status: number | null; finalUrl: string; note: string | null };
  }
  await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
  // "load", then a bounded idle wait: pages that hold a Server-Sent Events
  // stream open (/admin, /admin/agents/[agentKey] — LiveActionStream) never
  // reach networkidle, and a 90s wait for it was misreported as a slow route.
  const response = await page.goto(url, { waitUntil: "load", timeout: 90_000 }).catch(() => null);
  await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});
  await page.waitForTimeout(400);
  let note: string | null = null;
  try {
    await page.screenshot({ path: file, fullPage: true, timeout: 60_000 });
  } catch (error) {
    // Chromium refuses very tall full-page captures; keep the viewport so the
    // route is still represented, and say so in the index.
    note = `full-page capture failed (${error instanceof Error ? error.message.split("\n")[0].slice(0, 80) : "unknown"}); viewport only`;
    await page.screenshot({ path: file, fullPage: false, timeout: 60_000 }).catch(() => {
      note = "screenshot failed";
    });
  }
  const result = { status: response?.status() ?? null, finalUrl: page.url(), note };
  writeFileSync(sidecar, JSON.stringify(result));
  return result;
}

async function main() {
  const routes = listRoutes();
  mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch();
  const rows: IndexRow[] = [];
  const byIdentity = new Map<Identity, string[]>();
  for (const route of routes) byIdentity.set(identityFor(route), [...(byIdentity.get(identityFor(route)) ?? []), route]);

  for (const [identity, identityRoutes] of byIdentity) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const signInNote = await signIn(ctx, identity);
    if (signInNote) console.log(`${identity.padEnd(10)} note ${signInNote}`);
    const page = await ctx.newPage();
    const dir = path.join(outDir, identity);
    mkdirSync(dir, { recursive: true });
    for (const route of identityRoutes) {
      const panels: (string | null)[] = [null, ...(PANELS[route] ?? [])];
      for (const panel of panels) {
        const url = `${base}${resolve(route)}${panel ? `?panel=${panel}` : ""}`;
        const name = `${slug(route)}${panel ? `--${panel}` : ""}`;
        const files: string[] = [];
        const notes: string[] = [];
        let status: number | null = null;
        let finalUrl = "";
        for (const width of [1440, 390]) {
          const file = path.join(dir, `${name}-${width}.png`);
          const result = await capture(page, url, file, width);
          if (width === 1440) {
            status = result.status;
            finalUrl = result.finalUrl;
          }
          if (result.note) notes.push(`${width}: ${result.note}`);
          if (signInNote && width === 1440) notes.push(signInNote);
          files.push(path.relative(outRoot, file));
        }
        rows.push({ route, url, identity, panel, status, finalUrl, files, notes });
        const flag = status === null || status >= 400 ? "  !!" : "";
        console.log(`${identity.padEnd(10)} ${String(status).padEnd(4)} ${route}${panel ? ` ?panel=${panel}` : ""}${flag}`);
      }
    }
    await ctx.close();
  }
  await browser.close();

  const bad = rows.filter((row) => row.status === null || row.status >= 400);
  const expected = bad.filter((row) => EXPECTED_NON_2XX[row.route]?.status === row.status);
  const unexpected = bad.filter((row) => !expected.includes(row));
  const lines = [
    `# Route atlas — ${phase} (${new Date().toISOString()})`,
    "",
    `Base: ${base} (flag-on: PAT_ENABLE_NEW_FRONT_DOOR, PAT_ENABLE_FOLLOWUP_MC). Routes: ${routes.length}. Captures: ${rows.length} (× 1440 and 390 = ${rows.length * 2} files).`,
    `Non-2xx/3xx: ${bad.length} (expected by flag: ${expected.length}, unexpected: ${unexpected.length})${bad.length ? " — " + bad.map((row) => `${row.route}${row.panel ? `?panel=${row.panel}` : ""} (${row.status}${EXPECTED_NON_2XX[row.route]?.status === row.status ? ", expected" : ""})`).join(", ") : ""}`,
    "",
    "| Route | Identity | Panel | HTTP | Final URL | Files | Notes |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...rows.map((row) => `| \`${row.route}\` | ${row.identity} | ${row.panel ?? ""} | ${row.status ?? "ERR"} | \`${row.finalUrl.replace(base, "")}\` | ${row.files.map((file) => `\`${file}\``).join(" ")} | ${EXPECTED_NON_2XX[row.route]?.status === row.status ? `expected: ${EXPECTED_NON_2XX[row.route].reason}` + (row.notes ? " · " : "") : ""}${row.notes.join("; ")} |`),
    "",
  ];
  writeFileSync(path.join(outDir, "index.md"), lines.join("\n"));
  console.log(`\nroutes=${routes.length} captures=${rows.length} files=${rows.length * 2} bad=${bad.length} -> ${path.join(outDir, "index.md")}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
