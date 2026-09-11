/**
 * Score parity (box 1b item 4). Read-only. Two modes:
 *   DATABASE_URL=<side> node --import tsx tools/score-parity.ts dump <label> <out.json>
 *   node --import tsx tools/score-parity.ts compare <prod.json> <preview.json> > ops/qa/score-parity.md
 * dump: for every FIRM company, alignment index + five module scores (lib/firmAlignmentSignal);
 *       for every product, vendor self-reported score, firm-reviewed mean, divergence, review count
 *       computed raw from FINAL submissions (registry-version independent); newest submission date per company / product.
 * Only reads are issued (Prisma findMany/aggregate through the app's own read paths); no writes.
 */
import { readFileSync, writeFileSync } from "node:fs";
import prisma from "@/lib/prisma";
import { getFirmAlignmentSignal } from "@/lib/firmAlignmentSignal";
async function main() {
const [mode, a, b] = process.argv.slice(2);
  type Dump = { label: string; host: string; at: string; firms: Record<string, { name: string; index: number | null; modules: Record<string, number | null>; newest: string | null }>; products: Record<string, { name: string; vendor: string; self: number | null; firm: number | null; divergence: number | null; reviews: number; newest: string | null }> };
  if (mode === "dump") {
    const host = new URL(process.env.DATABASE_URL ?? "").hostname;
    const firms = await prisma.company.findMany({ where: { type: "FIRM", deletedAt: null }, select: { id: true, name: true } });
    const out: Dump = { label: a, host, at: new Date().toISOString(), firms: {}, products: {} };
    for (const f of firms) {
      const s = await getFirmAlignmentSignal(f.id);
      const newest = await prisma.surveySubmission.aggregate({ where: { companyId: f.id }, _max: { createdAt: true } });
      out.firms[f.id] = { name: f.name, index: s.alignmentIndex ?? null, modules: Object.fromEntries([...s.moduleScores.entries()]), newest: newest._max.createdAt?.toISOString() ?? null };
    }
    // Products: raw from submissions so both sides are comparable regardless of the
    // question-registry version (HEAD's catalog rejects production's v2-registry
    // submissions — the deploy-night registry drift; see the 2026-09-10 ledger).
    // self = latest FINAL vendor self-assessment score; firm = mean of FINAL firm
    // reviews (latest per reviewing firm); divergence = firm − self; reviews = count.
    const rows = await prisma.$queryRawUnsafe<Array<{ productId: string; productName: string; vendor: string; self: number | null; selfAt: Date | null; firmAvg: number | null; reviews: number; newest: Date | null }>>(`
      with subs as (
        select ss.id, ss.score, ss."createdAt", ss."companyId", s."productId", sm.key
        from "SurveySubmission" ss join "Subject" s on s.id = ss."subjectId" join "SurveyModule" sm on sm.id = ss."moduleId"
        where s."productId" is not null and ss."scoreVersion" > 0 and sm.key in ('vendor_product_alignment_v1','firm_product_review_v1')
      ), vend as (
        select distinct on ("productId") "productId", score as self, "createdAt" as "selfAt" from subs where key = 'vendor_product_alignment_v1' order by "productId", "createdAt" desc
      ), firm_latest as (
        select distinct on ("productId", "companyId") "productId", "companyId", score from subs where key = 'firm_product_review_v1' order by "productId", "companyId", "createdAt" desc
      ), firm as (
        select "productId", avg(score)::float as "firmAvg", count(*)::int as reviews from firm_latest group by "productId"
      ), newest as (select "productId", max("createdAt") as newest from subs group by "productId")
      select p.id as "productId", p.name as "productName", c.name as vendor, v.self, v."selfAt", f."firmAvg", coalesce(f.reviews, 0)::int as reviews, n.newest
      from "Product" p join "Company" c on c.id = p."companyId"
      left join vend v on v."productId" = p.id left join firm f on f."productId" = p.id left join newest n on n."productId" = p.id
      where c."deletedAt" is null`);
    for (const r of rows) {
      const firm = r.firmAvg === null ? null : Math.round(r.firmAvg * 10) / 10;
      out.products[r.productId] = { name: r.productName, vendor: r.vendor, self: r.self, firm, divergence: r.self !== null && firm !== null ? Math.round((firm - r.self) * 10) / 10 : null, reviews: r.reviews, newest: r.newest ? new Date(r.newest).toISOString() : null };
    }
    writeFileSync(b, JSON.stringify(out, null, 1));
    console.log(`${a}: host ${host} · firms ${Object.keys(out.firms).length} · products ${Object.keys(out.products).length} → ${b}`);
    await prisma.$disconnect();
  } else if (mode === "compare") {
    const L = JSON.parse(readFileSync(a, "utf8")) as Dump; const R = JSON.parse(readFileSync(b, "utf8")) as Dump;
    const n = (x: number | null) => (x === null ? "—" : String(Math.round(x * 10) / 10));
    const d = (x: string | null) => (x ? x.slice(0, 10) : "—");
    console.log(`# Score parity · ${L.label} (${L.host}) vs ${R.label} (${R.host}) · ${new Date().toISOString()}\n`);
    const firmIds = Object.keys(L.firms).filter((id) => R.firms[id]); const prodIds = Object.keys(L.products).filter((id) => R.products[id]);
    const firmDiffs: string[] = []; const prodDiffs: string[] = []; let postBranch = 0;
    for (const id of firmIds) {
      const l = L.firms[id], r = R.firms[id];
      const mods = Object.keys({ ...l.modules, ...r.modules });
      const changed = l.index !== r.index || mods.some((m) => (l.modules[m] ?? null) !== (r.modules[m] ?? null));
      if (!changed) continue;
      const later = (r.newest ?? "") > (l.newest ?? "");
      if (later) postBranch += 1;
      firmDiffs.push(`| ${l.name} | ${n(l.index)} → ${n(r.index)} | ${mods.map((m) => `${m.replace("firm_alignment_", "").replace("_v1", "")}: ${n(l.modules[m] ?? null)}→${n(r.modules[m] ?? null)}`).join("; ")} | ${d(l.newest)} / ${d(r.newest)} | ${later ? "post-branch submission" : "**defect?**"} |`);
    }
    for (const id of prodIds) {
      const l = L.products[id], r = R.products[id];
      if (l.self === r.self && l.firm === r.firm && l.divergence === r.divergence && l.reviews === r.reviews) continue;
      const later = (r.newest ?? "") > (l.newest ?? "");
      if (later) postBranch += 1;
      prodDiffs.push(`| ${l.vendor} · ${l.name} | ${n(l.self)}→${n(r.self)} | ${n(l.firm)}→${n(r.firm)} | ${n(l.divergence)}→${n(r.divergence)} | ${l.reviews}→${r.reviews} | ${d(l.newest)} / ${d(r.newest)} | ${later ? "post-branch submission" : "**defect?**"} |`);
    }
    console.log(`Firms in both: ${firmIds.length} (only ${L.label}: ${Object.keys(L.firms).length - firmIds.length}; only ${R.label}: ${Object.keys(R.firms).length - firmIds.length}). Products in both: ${prodIds.length} (only ${L.label}: ${Object.keys(L.products).length - prodIds.length}; only ${R.label}: ${Object.keys(R.products).length - prodIds.length}).`);
    console.log(`Firm differences: ${firmDiffs.length}; product differences: ${prodDiffs.length}; of which explained by a newer submission on ${R.label}: ${postBranch}.\n`);
    console.log(`## Firm differences\n\n| firm | index ${L.label}→${R.label} | modules | newest submission ${L.label} / ${R.label} | cause |\n|---|---|---|---|---|`); for (const row of firmDiffs) console.log(row);
    console.log(`\n## Product differences\n\n| product | self % | firm-reviewed % | divergence | reviews | newest submission ${L.label} / ${R.label} | cause |\n|---|---|---|---|---|---|---|`); for (const row of prodDiffs) console.log(row);
  }
  
}
main().catch((e) => { console.error(e); process.exit(1); });
