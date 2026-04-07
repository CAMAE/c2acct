// Compatibility shim for older Node-only callers.
// Canonical runtime entrypoint: scripts/check-question-count.ts
(async () => {
  const { spawnSync } = await import("node:child_process");
  const result = spawnSync(process.execPath, ["--import", "tsx", "scripts/check-question-count.ts"], {
    stdio: "inherit",
    env: process.env,
  });
  process.exit(result.status ?? 1);
})();
