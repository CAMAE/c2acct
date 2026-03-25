import fs from "node:fs";

const p = "package.json";
const raw = fs.readFileSync(p, "utf8");
const j = JSON.parse(raw);

j.scripts ??= {};
const lint = j.scripts.lint;

if (typeof lint !== "string") {
  throw new Error('package.json scripts.lint missing or not a string');
}

if (!lint.includes("eslint")) {
  throw new Error(`scripts.lint does not include "eslint": ${lint}`);
}

if (!lint.includes("--max-warnings")) {
  j.scripts.lint = `${lint} --max-warnings=-1`;
}

fs.writeFileSync(p, JSON.stringify(j, null, 2) + "\n", "utf8");
console.log("OK: patched scripts.lint =", j.scripts.lint);
