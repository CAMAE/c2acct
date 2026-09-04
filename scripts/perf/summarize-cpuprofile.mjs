// Summarize a V8 .cpuprofile (from `node --cpu-prof`) — see scripts/perf/route-once.ts.
//   node scripts/perf/summarize-cpuprofile.mjs <dir-or-file>
import fs from "node:fs";
import path from "node:path";

const input = process.argv[2];
if (!input) {
  console.error("usage: node scripts/perf/summarize-cpuprofile.mjs <dir-or-file>");
  process.exit(1);
}
// `node --cpu-prof` under tsx writes one profile per thread (tsx runs an esbuild
// helper); the main thread's is the large one. Picking by name chose an idle
// helper profile once and reported 98% idle.
const file = fs.statSync(input).isDirectory()
  ? fs
      .readdirSync(input)
      .filter((name) => name.endsWith(".cpuprofile"))
      .map((name) => path.join(input, name))
      .sort((a, b) => fs.statSync(b).size - fs.statSync(a).size)[0]
  : input;
const profile = JSON.parse(fs.readFileSync(file, "utf8"));

const byId = new Map(profile.nodes.map((node) => [node.id, node]));
const parentOf = new Map();
for (const node of profile.nodes) for (const child of node.children ?? []) parentOf.set(child, node.id);

const selfTime = new Map();
let total = 0;
profile.samples.forEach((id, index) => {
  const delta = profile.timeDeltas[index] ?? 0;
  total += delta;
  selfTime.set(id, (selfTime.get(id) ?? 0) + delta);
});

const short = (url) =>
  url.replace(/^file:\/\//, "").replace(/.*c2acct-live\//, "").replace(/.*node_modules\/\.pnpm\//, "npm:");
const label = (frame) => `${frame.functionName || "(anon)"}  ${short(frame.url)}`;
const isApp = (url) => /c2acct-live\/(lib|app)\//.test(url);
const category = (frame) => {
  if (!frame.url) return `(native/${frame.functionName || "idle"})`;
  if (isApp(frame.url)) return "app code lib/ app/";
  if (/@prisma|\/prisma\//.test(frame.url)) return "prisma client js (result decoding)";
  if (/^node:/.test(frame.url)) return "node internals";
  return "other";
};
const print = (title, map, limit) => {
  console.log(`\n=== ${title}`);
  for (const [key, time] of [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit)) {
    console.log(`${(time / 1000).toFixed(0).padStart(7)}ms ${((100 * time) / total).toFixed(1).padStart(5)}%  ${key}`);
  }
};

const byFunction = new Map();
const byCategory = new Map();
const inclusive = new Map();
for (const [id, time] of selfTime) {
  const frame = byId.get(id).callFrame;
  byFunction.set(label(frame), (byFunction.get(label(frame)) ?? 0) + time);
  byCategory.set(category(frame), (byCategory.get(category(frame)) ?? 0) + time);
  const seen = new Set();
  for (let cursor = id; cursor !== undefined; cursor = parentOf.get(cursor)) {
    const ancestor = byId.get(cursor).callFrame;
    if (!isApp(ancestor.url)) continue;
    const key = label(ancestor);
    if (seen.has(key)) continue;
    seen.add(key);
    inclusive.set(key, (inclusive.get(key) ?? 0) + time);
  }
}

console.log(`${file}\nsampled ${(total / 1000).toFixed(0)}ms (includes startup and the warm call — read shares)`);
print("SELF TIME BY CATEGORY", byCategory, 12);
print("SELF TIME BY FUNCTION", byFunction, 25);
print("INCLUSIVE TIME, APP FUNCTIONS (sync frames; an async continuation attributes to the function it resumes)", inclusive, 25);
