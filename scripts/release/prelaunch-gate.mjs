#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import path from "node:path";

function parseArgs(argv) {
  const args = {
    root: process.cwd(),
    port: 3310,
  };

  for (let index = 0; index < argv.length; index += 1) {
    if (argv[index] === "--root") {
      args.root = argv[index + 1];
      index += 1;
    } else if (argv[index] === "--port") {
      args.port = Number(argv[index + 1]);
      index += 1;
    }
  }

  return args;
}

const args = parseArgs(process.argv.slice(2));
const root = path.resolve(args.root);

function runNodeJson(scriptArgs) {
  try {
    const stdout = execFileSync("node", scriptArgs, {
      cwd: root,
      encoding: "utf8",
    });
    return JSON.parse(stdout);
  } catch (error) {
    const stdout = error?.stdout ? String(error.stdout) : "";
    if (stdout) {
      return JSON.parse(stdout);
    }
    throw error;
  }
}

const sourceIntegrity = runNodeJson([
  "scripts/release/validate-source-integrity.mjs",
  "--root",
  root,
]);

const patSurfaces = runNodeJson([
  "scripts/release/validate-pat-surfaces.mjs",
  "--root",
  root,
  "--port",
  String(args.port),
]);

const result = {
  ok: sourceIntegrity.ok && patSurfaces.ok,
  root,
  sourceIntegrity,
  patSurfaces,
};

console.log(JSON.stringify(result, null, 2));

if (!result.ok) {
  process.exit(1);
}
