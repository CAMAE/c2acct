import { spawnSync } from "node:child_process";

const command = process.platform === "win32" ? "npx.cmd" : "npx";
const result = spawnSync(command, ["tsx", "scripts/seed-pat-runtime.ts"], {
  stdio: "inherit",
  cwd: process.cwd(),
  env: process.env,
});

if (result.error) {
  console.error("SEED_ERROR", result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 0);
