import fs from "node:fs";
import path from "node:path";

function fail(message: string): never {
  throw new Error(message);
}

function existing(relativePath: string) {
  return fs.existsSync(path.join(process.cwd(), relativePath));
}

function main() {
  const forbiddenPaths = [
    "lib/companyContext.ts",
    "lib/request-origin.ts",
    "app/api/users/route.ts",
    "app/api/surveys/[moduleId]/route.ts",
    "app/api/fmi/route.ts",
    "app/api/fmi/momentum/route.ts",
    "app/api/engagements/[id]/score/route.ts",
    "app/api/engagements/[id]/score/_bak",
  ];

  for (const relativePath of forbiddenPaths) {
    if (existing(relativePath)) {
      fail(`${relativePath} should not remain in the launch repo`);
    }
  }

  const allFiles: string[] = [];
  function walk(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name === ".git" || entry.name === ".next") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        allFiles.push(full);
      }
    }
  }
  walk(process.cwd());

  const staleFiles = allFiles.filter((full) => /\.bak/i.test(path.basename(full)));
  if (staleFiles.length > 0) {
    fail(`Backup files remain: ${staleFiles.length}`);
  }

  console.log(JSON.stringify({ ok: true, checked: forbiddenPaths.length }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(
    "VERIFY_REPO_HYGIENE_ERROR",
    error instanceof Error ? error.message : error
  );
  process.exit(1);
}
