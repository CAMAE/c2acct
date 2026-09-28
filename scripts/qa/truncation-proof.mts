/**
 * pnpm truncation:proof -- --base http://127.0.0.1:3000 [--widths 1440,1100]
 *
 * 3f (item J, S2/S5) truncation proof on /firm/alignment-board with the demo seed. Signs in
 * as the Elite demo firm, renders the board at each width and asserts, in the DOM:
 *   - no puzzle-piece text element ([data-testid="piece-text"] and its descendants) has
 *     overflow text hidden (scrollWidth > clientWidth) or a truncate / line-clamp class;
 *   - no radar axis label (<text> inside [data-testid="alignment-radar"] svg) has its
 *     bounding box outside the svg's client box (clipped);
 *   - no top-movers name (the list under "What changes") is truncated.
 * Prints one line per width and exits 1 on any violation.
 */
import { chromium } from "@playwright/test";
function arg(name: string, fallback?: string) { const i = process.argv.indexOf(`--${name}`); return i >= 0 && process.argv[i + 1] && !process.argv[i + 1].startsWith("--") ? process.argv[i + 1] : fallback; }
const BASE = arg("base", "http://127.0.0.1:3000")!;
const WIDTHS = (arg("widths", "1440,1100") ?? "").split(",").map((w) => Number(w));
const EMAIL = "demo-firm-elite@pat.local";
const PASSWORD = process.env.PAT_DEMO_ELITE_PASSWORD ?? "PatEliteDemo7x";
const PAGE_SCRIPT = String.raw`
  const out = { pieces: 0, pieceOverflow: [], pieceClamped: [], radarLabels: 0, radarClipped: [], movers: 0, moverOverflow: [] };
  const clip = (el) => el.scrollWidth > el.clientWidth + 1;
  for (const block of document.querySelectorAll('[data-testid="piece-text"]')) {
    out.pieces += 1;
    const els = [block, ...block.querySelectorAll('*')];
    for (const el of els) {
      const cls = el.getAttribute('class') || '';
      if (/\btruncate\b|line-clamp-/.test(cls)) out.pieceClamped.push((el.textContent || '').trim().slice(0, 40));
      if (el.children.length === 0 && clip(el)) out.pieceOverflow.push((el.textContent || '').trim().slice(0, 40));
    }
  }
  const radar = document.querySelector('[data-testid="alignment-radar"] svg');
  if (radar) {
    const box = radar.getBoundingClientRect();
    for (const t of radar.querySelectorAll('text')) {
      out.radarLabels += 1;
      const r = t.getBoundingClientRect();
      if (r.left < box.left - 0.5 || r.right > box.right + 0.5 || r.top < box.top - 0.5 || r.bottom > box.bottom + 0.5) out.radarClipped.push((t.textContent || '').trim());
    }
  }
  for (const li of document.querySelectorAll('li.flex.items-center.gap-3 > span:first-child')) {
    out.movers += 1;
    if (clip(li) || /\btruncate\b/.test(li.getAttribute('class') || '')) out.moverOverflow.push((li.textContent || '').trim().slice(0, 40));
  }
  return out;
`;
async function main() {
  const browser = await chromium.launch();
  let failed = false;
  for (const width of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/sign-in?view=firm`, { waitUntil: "networkidle" });
    const form = page.locator('form:has(input[placeholder="Provisioned pilot email"])');
    await form.locator('input[placeholder="Provisioned pilot email"]').fill(EMAIL);
    await form.locator('input[placeholder="Provisioned pilot password"]').fill(PASSWORD);
    await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/sign-in"), { timeout: 60_000 }), form.locator('button[type="submit"]').click()]);
    const res = await page.goto(`${BASE}/firm/alignment-board`, { waitUntil: "networkidle", timeout: 120_000 }).catch(() => null);
    await page.waitForTimeout(800);
    const r = (await page.evaluate(new Function("args", PAGE_SCRIPT) as unknown as () => unknown, {})) as {
      pieces: number; pieceOverflow: string[]; pieceClamped: string[]; radarLabels: number; radarClipped: string[]; movers: number; moverOverflow: string[];
    };
    const bad = r.pieceOverflow.length + r.pieceClamped.length + r.radarClipped.length + r.moverOverflow.length;
    if (bad > 0 || r.pieces === 0 || r.radarLabels === 0) failed = true;
    console.log(`${width} /firm/alignment-board → ${res?.status() ?? "-"} · pieces ${r.pieces} (overflow ${r.pieceOverflow.length}, clamped ${r.pieceClamped.length}) · radar labels ${r.radarLabels} (clipped ${r.radarClipped.length}) · movers ${r.movers} (overflow ${r.moverOverflow.length})${bad ? " · FAIL" : " · ok"}`);
    for (const x of [...r.pieceOverflow, ...r.pieceClamped, ...r.radarClipped, ...r.moverOverflow]) console.log(`   ✗ ${x}`);
    await ctx.close();
  }
  await browser.close();
  process.exit(failed ? 1 : 0);
}
main().catch((error) => { console.error(error); process.exit(1); });
