import fs from "node:fs";

const wf = ".github/workflows/ci.yml";
let s = fs.readFileSync(wf, "utf8");

if (s.includes("pnpm exec prisma generate")) {
  console.log("OK: prisma generate already present");
  process.exit(0);
}

// Insert AFTER the first pnpm install occurrence.
// Prefer inserting as its own step if we can find a named install step.
// Otherwise insert after a run: pnpm install step.
// Otherwise insert inside a multi-line run: | block right after the line that contains pnpm install.

const stepText = `  - name: Prisma generate
    run: pnpm exec prisma generate

`;

// A) "- name: Run pnpm install" step
{
  const re = /(^\s*-\s*name:\s*Run pnpm install\s*\r?\n^\s*run:\s*pnpm install\s*\r?\n)/m;
  if (re.test(s)) {
    s = s.replace(re, `$1${stepText}`);
    fs.writeFileSync(wf, s, "utf8");
    console.log("OK: inserted after named pnpm install step");
    process.exit(0);
  }
}

// B) a step that is literally "run: pnpm install"
{
  const re = /(^\s*run:\s*pnpm install\s*\r?\n)/m;
  if (re.test(s)) {
    s = s.replace(re, `$1${stepText}`);
    fs.writeFileSync(wf, s, "utf8");
    console.log("OK: inserted after run: pnpm install step");
    process.exit(0);
  }
}

// C) multiline run block containing pnpm install
{
  const lines = s.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].match(/^\s*run:\s*\|\s*$/)) {
      // scan forward within this block for "pnpm install"
      for (let j = i + 1; j < lines.length; j++) {
        // stop if indentation decreases to a new YAML key/step
        if (lines[j].match(/^\S/)) break;
        if (lines[j].includes("pnpm install")) {
          const indent = (lines[j].match(/^(\s*)/) || ["",""])[1];
          lines.splice(j + 1, 0, `${indent}pnpm exec prisma generate`, "");
          fs.writeFileSync(wf, lines.join("\n"), "utf8");
          console.log("OK: inserted inside run: | block after pnpm install");
          process.exit(0);
        }
      }
    }
  }
}

throw new Error("Could not find any pnpm install occurrence to patch.");
