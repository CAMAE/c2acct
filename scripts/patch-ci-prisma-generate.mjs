import fs from "node:fs";

const wf = ".github/workflows/ci.yml";
let s = fs.readFileSync(wf, "utf8");

if (s.includes("pnpm exec prisma generate")) {
  console.log("OK: prisma generate already present");
  process.exit(0);
}

const needle = "\n      - run: pnpm install\n      - run: pnpm build\n";
const insert = "\n      - run: pnpm install\n      - name: Prisma generate\n        run: pnpm exec prisma generate\n      - run: pnpm build\n";

if (s.includes(needle)) {
  s = s.replace(needle, insert);
  fs.writeFileSync(wf, s, "utf8");
  console.log("OK: inserted prisma generate between pnpm install and pnpm build");
  process.exit(0);
}

// fallback: insert immediately BEFORE the first "      - run: pnpm build"
const buildLine = "\n      - run: pnpm build\n";
const idx = s.indexOf(buildLine);
if (idx !== -1) {
  s = s.slice(0, idx) + "\n      - name: Prisma generate\n        run: pnpm exec prisma generate\n" + s.slice(idx);
  fs.writeFileSync(wf, s, "utf8");
  console.log("OK: inserted prisma generate before first pnpm build");
  process.exit(0);
}

throw new Error("Could not find a pnpm build step to patch.");
