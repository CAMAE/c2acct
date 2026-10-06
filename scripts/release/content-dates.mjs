/**
 * pattern box A (R60, R-R, audit P6): user-visible "Updated <Month> <year>" lines
 * come from git, never from a literal. For each content file below, the date of
 * the last commit that touched it is written to lib/generated/contentDates.json.
 *
 * Runs from bake-release.mjs (cloud build command) and from build-lock.mjs (local
 * `pnpm build`). Coupling (R-K): a CLI `vercel deploy` upload carries no .git, so
 * the cloud build keeps the COMMITTED json; the local build regenerates it, so a
 * push after `pnpm build` carries current dates. A file whose git date cannot be
 * read keeps its committed value; the json is never emptied.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

export const CONTENT_DATE_FILES = ["lib/trustContent.ts", "lib/methodology.ts"];

function gitDate(root, file) {
  try {
    return execFileSync("git", ["-C", root, "log", "-1", "--format=%cI", "--", file], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

export function writeContentDates(root = process.cwd()) {
  const out = join(root, "lib", "generated", "contentDates.json");
  const previous = existsSync(out) ? JSON.parse(readFileSync(out, "utf8")) : {};
  const next = { ...previous };
  let changed = 0;
  for (const file of CONTENT_DATE_FILES) {
    const iso = gitDate(root, file);
    if (iso && /^\d{4}-\d{2}-\d{2}T/.test(iso) && previous[file] !== iso) {
      next[file] = iso;
      changed += 1;
    } else if (!next[file]) {
      next[file] = new Date().toISOString();
      changed += 1;
    }
  }
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`[content-dates] wrote ${out} (${changed} value(s) updated)`);
  return next;
}

if (process.argv[1] && process.argv[1].endsWith("content-dates.mjs")) {
  writeContentDates();
}
