(async () => {
  const { spawnSync } = await import("node:child_process");
  const result = spawnSync(
    process.execPath,
    ["--import", "tsx", "scripts/verify-firm-capability-mappings.ts"],
    {
      stdio: "inherit",
      env: process.env,
    }
  );
  process.exit(result.status ?? 1);
})();
