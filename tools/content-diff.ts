/**
 * Full-content diff (box 1b item 1). For every route × identity present in two crawl outputs,
 * compare the TEXT of aria.main + aria.shell (every line of the accessibility tree, not just
 * controls), normalized like the guard (times, dates, relative times, digits, demo ids), and emit
 * ops/qa/content-diff/<build>.md: per route, REMOVED / ADDED / CHANGED paragraphs side by side,
 * each classified against ops/qa/intended-changes.json. Unclassified changes come first under
 * RULINGS NEEDED, with a count per portal at the top.
 *   node --import tsx tools/content-diff.ts <inventoryDir> <fromBuild> <toBuild> [<out.md>]
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
const [inv, FROM, TO, outArg] = process.argv.slice(2);
const OUT = outArg ?? path.join(process.cwd(), "ops", "qa", "content-diff", `${TO}.md`);
type Rule = { id: string; box: string; pattern: string; note: string };
const rules = (JSON.parse(readFileSync(path.join(process.cwd(), "ops", "qa", "intended-changes.json"), "utf8")) as Rule[]).map((r) => ({ ...r, re: new RegExp(r.pattern, "i") }));
function norm(s: string): string {
  return s
    .replace(/\b\d{1,2}:\d{2}(?::\d{2})?\b/g, "<time>")
    .replace(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.? \d{1,2}(?:, \d{4})?\b/gi, "<date>")
    .replace(/\b(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday), <date>/gi, "<date>")
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, "<date>")
    .replace(/\b(?:in |about )?\d+\s*(?:s|m|h|d|w|mo|y|min|mins|hours?|days?|weeks?|months?|years?)(?: ago)?\b/gi, "<rel>")
    .replace(/demo-[a-z0-9-]+/g, "demo-…").replace(/perf-scale-[a-z0-9-]+/g, "perf-scale-…")
    .replace(/\d[\d,.]*%?/g, "#")
    .replace(/\s+/g, " ").trim();
}
/** Text lines of an ARIA snapshot: strip the tree syntax, keep role + text, drop url lines. */
function paragraphs(yaml: string | null | undefined): string[] {
  const out: string[] = [];
  for (const raw of (yaml ?? "").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("- /url:")) continue;
    const t = line.replace(/^- /, "").replace(/:$/, "");
    const n = norm(t);
    if (n.length > 1 && !/^(main|navigation|banner|contentinfo|region|group|list|listitem|generic|complementary)$/.test(n)) out.push(n);
  }
  return out;
}
function load(build: string) {
  const data = new Map<string, { route: string; identity: string; text: string[] }>();
  const dir = path.join(inv, build);
  for (const identity of readdirSync(dir)) {
    const idir = path.join(dir, identity); if (!existsSync(path.join(idir))) continue;
    let files: string[] = []; try { files = readdirSync(idir); } catch { continue; }
    for (const f of files) {
      if (!f.endsWith(".json") || f.startsWith("_")) continue;
      const d = JSON.parse(readFileSync(path.join(idir, f), "utf8"));
      const route = String(d.route).replace(/demo-[a-z0-9-]+/g, "demo-…");
      data.set(`${identity}|${route}`, { route, identity, text: [...paragraphs(d.aria?.main), ...paragraphs(d.aria?.shell)] });
    }
  }
  return data;
}
function classify(a: string, b: string | null): Rule | null { return rules.find((r) => r.re.test(a) || (b !== null && r.re.test(b))) ?? null; }
function portal(route: string) { const seg = route.split("?")[0].split("/")[1] ?? ""; return seg || "public"; }
const L = load(FROM), R = load(TO);
type Change = { kind: "REMOVED" | "ADDED" | "CHANGED"; old: string | null; new: string | null; rule: Rule | null };
const perPair = new Map<string, Change[]>();
for (const [key, l] of L) {
  const r = R.get(key); if (!r) continue;
  const lset = new Set(l.text), rset = new Set(r.text);
  const removed = l.text.filter((t) => !rset.has(t)); const added = r.text.filter((t) => !lset.has(t));
  const changes: Change[] = [];
  // pair removed/added lines that share a 12-char prefix as CHANGED
  const usedAdd = new Set<number>();
  for (const o of removed) {
    let paired = -1;
    added.forEach((n, i) => { if (paired < 0 && !usedAdd.has(i) && o.slice(0, 12) === n.slice(0, 12)) paired = i; });
    if (paired >= 0) { usedAdd.add(paired); changes.push({ kind: "CHANGED", old: o, new: added[paired], rule: classify(o, added[paired]) }); }
    else changes.push({ kind: "REMOVED", old: o, new: null, rule: classify(o, null) });
  }
  added.forEach((n, i) => { if (!usedAdd.has(i)) changes.push({ kind: "ADDED", old: null, new: n, rule: classify(n, null) }); });
  if (changes.length) perPair.set(key, changes);
}
const unclassifiedByPortal = new Map<string, number>(); let total = 0, unclassified = 0;
for (const [key, changes] of perPair) { const p = portal(key.split("|")[1]); for (const c of changes) { total += 1; if (!c.rule) { unclassified += 1; unclassifiedByPortal.set(p, (unclassifiedByPortal.get(p) ?? 0) + 1); } } }
const lines: string[] = [`# Content diff ${FROM} → ${TO} · ${new Date().toISOString()}`, "", `Route × identity pairs compared: ${[...L.keys()].filter((k) => R.has(k)).length}; pairs with text changes: ${perPair.size}; changed paragraphs: ${total}; classified as intended: ${total - unclassified}; RULINGS NEEDED (unclassified): ${unclassified}`, "", "## Unclassified paragraphs per portal", "", "| portal | unclassified |", "|---|---|"];
for (const [p, n] of [...unclassifiedByPortal].sort((a, b) => b[1] - a[1])) lines.push(`| ${p} | ${n} |`);
const fmt = (c: Change) => (c.kind === "CHANGED" ? `- CHANGED\n  - old: ${c.old}\n  - new: ${c.new}` : c.kind === "REMOVED" ? `- REMOVED: ${c.old}` : `- ADDED: ${c.new}`);
lines.push("", "## RULINGS NEEDED (unclassified), by route × identity", "");
for (const [key, changes] of [...perPair].sort()) { const u = changes.filter((c) => !c.rule); if (!u.length) continue; const [identity, route] = key.split("|"); lines.push(`### ${route} · ${identity}`); for (const c of u) lines.push(fmt(c)); lines.push(""); }
lines.push("## Classified as intended, by route × identity", "");
for (const [key, changes] of [...perPair].sort()) { const k = changes.filter((c) => c.rule); if (!k.length) continue; const [identity, route] = key.split("|"); lines.push(`### ${route} · ${identity}`); for (const c of k) lines.push(`${fmt(c)}\n  - intended: ${c.rule!.id} (${c.rule!.box})`); lines.push(""); }
mkdirSync(path.dirname(OUT), { recursive: true }); writeFileSync(OUT, lines.join("\n") + "\n");
console.log(lines.slice(2, 3 + 3 + unclassifiedByPortal.size + 4).join("\n"));
