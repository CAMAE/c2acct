import fs from "node:fs";

const wf = ".github/workflows/ci.yml";
let s = fs.readFileSync(wf, "utf8");

if (s.includes("pnpm exec prisma generate")) {
  console.log("OK: prisma generate already present");
  process.exit(0);
}

const stepText = `  - name: Prisma generate
    run: pnpm exec prisma generate

`;

// Insert before the first pnpm build invocation (named step or run line)
const reNamed = /(^\s*-\s*name:.*\r?\n(?:^\s*(?:uses|run):.*\r?\n)+)(?=^\s*-\s*name:.*\r?\n^\s*run:\s*pnpm\s+build\s*$)/m;
const reRun   = /(^\s*run:\s*pnpm\s+build\s*$)/m;

if (reNamed.test(s)) {
  s = s.replace(reNamed, `$1${stepText}`);
  fs.writeFileSync(wf, s, "utf8");
  console.log("OK: inserted before named pnpm build step");
  process.exit(0);
}

if (reRun.test(s)) {
  s = s.replace(reRun, `${stepText}$1`);
  fs.writeFileSync(wf, s, "utf8");
  console.log("OK: inserted before run: pnpm build");
  process.exit(0);
}

throw new Error("Could not locate a pnpm build step to patch.");
