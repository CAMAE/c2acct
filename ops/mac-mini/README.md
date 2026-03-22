# Mac Mini Remote Ops

This repo includes a small launchd-oriented operations layer for a Mac mini host. It keeps runtime state under `artifacts/mac-mini/`, avoids printing secrets, and uses the existing production entrypoints: `pnpm build` and `pnpm start`.

## Local dev stability

`pnpm dev` and `pnpm build` now use the stable webpack path to avoid the Turbopack root instability seen on local Mac setups. If you explicitly want Turbopack for debugging, use `pnpm dev:turbopack`.

## One-time setup

1. Install dependencies with `pnpm install`.
2. Create `.env.local` with the production or staging values needed by the app.
3. Build once with `pnpm build`.
4. Install or refresh the launch agents with `pnpm ops:mac-mini:launchd:install`.

## Remote commands

These are designed to be short enough for phone-based SSH use:

```bash
pnpm ops:mac-mini:status
pnpm ops:mac-mini:health
pnpm ops:mac-mini:launchd:check
pnpm ops:mac-mini:verify
```

`pnpm ops:mac-mini:status` prints the branch, commit, launchd load state, listen port, app URL, health result, and the latest nightly summary path.

## Launchd workflow

- Templates live in `ops/mac-mini/launchd/`.
- Rendered copies are written to `artifacts/mac-mini/launchd/`.
- Installed user agents live in `~/Library/LaunchAgents/`.

The install script is safe to re-run. It re-renders the plists, boots out any existing agents, bootstraps the updated versions, and kickstarts the app agent.

## Logs and artifacts

- Launchd stdout and stderr go to `artifacts/mac-mini/logs/`.
- Nightly verification logs go to `artifacts/mac-mini/reports/<timestamp>/`.
- A short nightly summary is written to `artifacts/mac-mini/reports/nightly-summary-<timestamp>.txt`.
- Old logs older than 14 days and reports older than 30 days are pruned automatically by the shared script helpers.

## Notes

- The app agent only runs `pnpm build` automatically if `.next/` is missing. Regular deploy flow should stay `git pull`, `pnpm install`, `pnpm build`, then `pnpm ops:mac-mini:launchd:install`.
- Health checks use `http://127.0.0.1:$PORT/api/health/db` by default. Override `PORT` or `MAC_MINI_HOST` in `.env.local` only if your host setup requires it.
