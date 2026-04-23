import { spawnSync } from "node:child_process";
import { loadEnv } from "./_shared/prismaScript";

loadEnv();

const packageManagerCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";

const steps = [
  [packageManagerCommand, ["lint:test"]],
  [packageManagerCommand, ["db:recreate"]],
  [packageManagerCommand, ["validate:db"]],
  [packageManagerCommand, ["typecheck"]],
  [packageManagerCommand, ["test:unit"]],
  [packageManagerCommand, ["build"]],
  [packageManagerCommand, ["standalone:local:check"]],
  [packageManagerCommand, ["release:prelaunch"]],
  [packageManagerCommand, ["test:e2e:local-review"]],
  [packageManagerCommand, ["test:e2e:release-integrity"]],
  ["bash", ["scripts/mac-mini/launchd-check.sh"]],
  ["bash", ["scripts/mac-mini/port-owner-proof.sh"]],
] as const;

for (const [command, args] of steps) {
  const rendered = [command, ...args].join(" ");
  console.log(`\n==> ${rendered}`);
  const result = spawnSync(command, args, {
    stdio: "inherit",
    env: process.env,
  });

  if ((result.status ?? 1) !== 0) {
    process.exit(result.status ?? 1);
  }
}

console.log("\nPASS validate-launch: PAT launch validation completed.");
