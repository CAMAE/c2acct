# Mac Mini Remote Ops

This repo includes a small launchd-oriented operations layer for a Mac mini host. It keeps runtime state under `artifacts/mac-mini/`, avoids printing secrets, and uses the PAT production entrypoints `pnpm build` and `node .next/standalone/server.js` through `scripts/mac-mini/app-start.sh`.

## Operator commands

- `pnpm ops:mac-mini:status`
- `pnpm ops:mac-mini:health`
- `pnpm ops:mac-mini:launchd:check`
- `pnpm ops:mac-mini:verify`

## One-time setup

1. Run `pnpm install`.
2. Run `pnpm prisma:generate`.
3. Create `.env.local` with the required runtime keys:
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
   - `AUTH_GITHUB_ID`
   - `AUTH_GITHUB_SECRET`
4. Run `pnpm build`.
5. Run `pnpm ops:mac-mini:launchd:install`.

## Launchd workflow

- Templates live in `ops/mac-mini/launchd/`.
- Rendered copies are written to `artifacts/mac-mini/launchd/`.
- Installed user agents live in `~/Library/LaunchAgents/`.
- The install script is safe to re-run and now validates with `pnpm release:prelaunch` before bootstrapping agents.

## Runtime notes

- `pnpm dev` and `pnpm build` use the stable webpack path.
- The app agent refuses to start if required env vars are missing.
- The app agent only auto-builds when usable build output is missing.
- Normal deploy flow is `git pull`, `pnpm install`, `pnpm prisma:generate`, `pnpm build`, then `pnpm ops:mac-mini:launchd:install`.
- Health checks use `http://127.0.0.1:$PORT/api/health/db` by default.

## Rollback clues

Inspect these first:

1. `pnpm ops:mac-mini:status`
2. `artifacts/mac-mini/state/release-state.env`
3. the newest file under `artifacts/mac-mini/reports/nightly-summary-*.txt`
4. `artifacts/mac-mini/logs/app.stderr.log`
