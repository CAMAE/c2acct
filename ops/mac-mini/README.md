# Mac Mini Remote Ops

This repo includes a small launchd-oriented operations layer for a Mac mini host. It keeps runtime state under `artifacts/mac-mini/`, avoids printing secrets, and uses the existing production entrypoints: `pnpm build` and `pnpm start`.

The layer is intentionally phone-friendly:

- `pnpm ops:mac-mini:status` is the fast operator summary
- `pnpm ops:mac-mini:health` is the app/db reachability probe
- `pnpm ops:mac-mini:launchd:check` is the agent/install sanity check
- `pnpm ops:mac-mini:verify` is the heavier nightly control

## Local dev stability

`pnpm dev` and `pnpm build` now use the stable webpack path to avoid the Turbopack root instability seen on local Mac setups. If you explicitly want Turbopack for debugging, use `pnpm dev:turbopack`.

## One-time setup

1. Install dependencies with `pnpm install`.
2. Create `.env.local` with the production or staging values needed by the app.
3. Ensure the required runtime keys are present:
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
   - `AUTH_GITHUB_ID`
   - `AUTH_GITHUB_SECRET`
4. Build once with `pnpm build`.
5. Install or refresh the launch agents with `pnpm ops:mac-mini:launchd:install`.

## Remote commands

These are designed to be short enough for phone-based SSH use:

```bash
pnpm ops:mac-mini:status
pnpm ops:mac-mini:health
pnpm ops:mac-mini:launchd:check
pnpm ops:mac-mini:verify
```

`pnpm ops:mac-mini:status` prints:

- branch and commit
- whether the git worktree is clean or dirty
- launchd support and load state
- listen host/port and health result
- build id, build time, and build reason
- env/build/node_modules preflight summary
- latest nightly summary path

## Launchd workflow

- Templates live in `ops/mac-mini/launchd/`.
- Rendered copies are written to `artifacts/mac-mini/launchd/`.
- Installed user agents live in `~/Library/LaunchAgents/`.

The install script is safe to re-run. It re-renders the plists, lint-checks them with `plutil`, boots out any existing agents, bootstraps the updated versions, and kickstarts the app agent.

## Logs and artifacts

- Launchd stdout and stderr go to `artifacts/mac-mini/logs/`.
- Nightly verification logs go to `artifacts/mac-mini/reports/<timestamp>/`.
- A short nightly summary is written to `artifacts/mac-mini/reports/nightly-summary-<timestamp>.txt`.
- Current release metadata is written to `artifacts/mac-mini/state/release-state.env`.
- Old logs older than 14 days, old report directories older than 30 days, and stale nightly summaries beyond the newest 10 are pruned automatically by the shared script helpers.

## Notes

- The app agent will refuse to start if required env vars are missing.
- The app agent only auto-builds when usable build output is missing. Regular deploy flow should still stay `git pull`, `pnpm install`, `pnpm build`, then `pnpm ops:mac-mini:launchd:install`.
- Health checks use `http://127.0.0.1:$PORT/api/health/db` by default. Override `PORT` or `MAC_MINI_HOST` in `.env.local` only if your host setup requires it.
- The health endpoint returns safe release metadata only. It does not echo env contents or secrets.

## Rollback clues

When a release goes wrong, operators should inspect:

1. `pnpm ops:mac-mini:status`
2. `artifacts/mac-mini/state/release-state.env`
3. the newest file under `artifacts/mac-mini/reports/nightly-summary-*.txt`
4. `artifacts/mac-mini/logs/app.stderr.log`

Those four surfaces should tell you which branch/commit/build last ran, whether the worktree drifted, whether nightly checks failed, and whether the runtime is currently reachable.
