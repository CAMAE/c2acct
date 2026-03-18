# Incident Response

1. Read `artifacts/mac-mini/status/<job>.json`.
2. Read `artifacts/mac-mini/heartbeats/<job>.json`.
3. Inspect the paired stdout/stderr logs in `artifacts/mac-mini/logs/`.
4. Run `bash scripts/mac-mini/healthcheck.sh`.
5. Re-run the failed job directly with `--dry-run` first, then without `--dry-run` if the host is ready.
6. If launchd is involved, compare the staged plists in `artifacts/mac-mini/launchd-installed/` with the source templates in `ops/mac-mini/launchd/`.
7. If the failure touches DB or launch verification, inspect `docs/ops/ENVIRONMENT_AND_LAUNCH_CONTRACT.md`.

Current operator actions supported by the repo:

- inspect
- dry-run
- rerun a single script
- reload LaunchAgents on a macOS host with `scripts/mac-mini/install-launch-agents.sh`

Not yet built:

- in-app pause/retry buttons
- automatic alert delivery
- persisted job-run rows in the application database
