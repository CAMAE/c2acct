# Job Catalog

| Job | Purpose | Script | Timeout | Retries | Artifact path |
| --- | --- | --- | --- | --- | --- |
| Nightly verification | Full verification suite plus build | `scripts/mac-mini/run-nightly-verification.sh` | 3600s | 2 | `artifacts/audit-bundles/latest/verification` |
| Recompute jobs | External-review trust and concurrency recompute checks | `scripts/mac-mini/run-recompute-jobs.sh` | 1800s | 2 | `artifacts/mac-mini/runs/recompute-jobs` |
| Sync checks | Membership, visibility, and hygiene sync checks | `scripts/mac-mini/run-sync-checks.sh` | 1800s | 2 | `artifacts/mac-mini/runs/sync-checks` |
| Export packets | Audit bundle plus verification packet generation | `scripts/mac-mini/run-export-packets.sh` | 2400s | 2 | `artifacts/audit-bundles/latest` |
| Smoke suite | Launch and ops hardening smoke run | `scripts/mac-mini/run-smoke-suite.sh` | 1800s | 2 | `artifacts/mac-mini/runs/smoke-suite` |
| Bootstrap | One-time repo bootstrap on the host | `scripts/mac-mini/bootstrap-mac-mini.sh` | 1800s | 1 | `artifacts/mac-mini` |
| Healthcheck | Repo-side contract and dependency checks | `scripts/mac-mini/healthcheck.sh` | manual | n/a | `artifacts/mac-mini/status` |

Status and heartbeat contract:

- latest job state: `artifacts/mac-mini/status/<job>.json`
- latest heartbeat: `artifacts/mac-mini/heartbeats/<job>.json`
- stdout log: `artifacts/mac-mini/logs/<job>.stdout.log`
- stderr log: `artifacts/mac-mini/logs/<job>.stderr.log`

Phone-friendly summary:

- `bash scripts/mac-mini/last-run-summary.sh`
- `bash scripts/mac-mini/last-run-summary.sh --json`
