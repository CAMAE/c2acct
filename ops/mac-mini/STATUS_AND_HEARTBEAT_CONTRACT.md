# Status And Heartbeat Contract

Each managed Mac mini job writes:

- `artifacts/mac-mini/status/<job>.json`
- `artifacts/mac-mini/heartbeats/<job>.json`
- `artifacts/mac-mini/logs/<job>.stdout.log`
- `artifacts/mac-mini/logs/<job>.stderr.log`

Status file fields:

- `job`
- `status`
- `startedAt`
- `finishedAt`
- `exitCode`
- `attempt`
- `maxAttempts`
- `stdoutLog`
- `stderrLog`
- `heartbeat`
- `artifactPath`
- `dryRun`
- `note`

Heartbeat file fields:

- `job`
- `phase`
- `timestamp`
- `note`

Expected status values:

- `dry-run`
- `ok`
- `failed`

Expected heartbeat phases:

- `dry-run`
- `starting`
- `running`
- `retrying`
- `ok`
- `failed`

Use `scripts/mac-mini/last-run-summary.sh` to aggregate the latest job state for laptop or phone supervision.
