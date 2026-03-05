import fs from "node:fs";

const wf = ".github/workflows/ci.yml";
let s = fs.readFileSync(wf, "utf8");
const eol = s.includes("\r\n") ? "\r\n" : "\n";

if (s.includes("pnpm exec prisma generate")) {
  console.log("OK: prisma generate already present");
  process.exit(0);
}

// Build the step with correct indentation (match the existing "- run:" indent)
function makeStep(indent) {
  return (
    indent + "- name: Prisma generate" + eol +
    indent + "  run: pnpm exec prisma generate" + eol
  );
}

// Prefer: insert between "pnpm install" and "pnpm build"
{
  const re = /^(\s*-\s*run:\s*pnpm\s+install\s*\r?\n)(\s*-\s*run:\s*pnpm\s+build\s*\r?\n)/m;
  const m = s.match(re);
  if (m) {
    const indent = (m[1].match(/^(\s*)-/m) || ["", ""])[1];
    s = s.replace(re, `$1${makeStep(indent)}$2`);
    fs.writeFileSync(wf, s, "utf8");
    console.log("OK: inserted prisma generate between pnpm install and pnpm build");
    process.exit(0);
  }
}

// Fallback: insert immediately before the first "pnpm build"
{
  const reBuildLine = /^(\s*)-\s*run:\s*pnpm\s+build\s*$/m;
  const m = s.match(reBuildLine);
  if (m) {
    const indent = m[1] || "";
    const reBuild = /^(\s*-\s*run:\s*pnpm\s+build\s*\r?\n)/m;
    s = s.replace(reBuild, `${makeStep(indent)}$1`);
    fs.writeFileSync(wf, s, "utf8");
    console.log("OK: inserted prisma generate before pnpm build");
    process.exit(0);
  }
}

throw new Error("Could not locate pnpm install/build steps to patch.");
