# Mac Mini Operations

Mac mini is the private execution backbone for scheduled verification, exports, sync checks, recompute checks, and smoke validation. The repo-side layer is now packaged for headless execution with:

- non-interactive shell entry points in `scripts/mac-mini/`
- structured status files in `artifacts/mac-mini/status/`
- heartbeat files in `artifacts/mac-mini/heartbeats/`
- split stdout/stderr logs in `artifacts/mac-mini/logs/`
- launchd-ready plist templates in `ops/mac-mini/launchd/`

What is proven here:

- shell packaging
- dry-run behavior
- bash syntax lint
- plist XML packaging

What is not proven here:

- actual `launchctl` load/unload execution on a macOS host
- scheduled background execution on a real Mac mini
- remote shell or alert transport outside this repo

Primary scripts:

- `scripts/mac-mini/setup-mac-mini.sh`
- `scripts/mac-mini/bootstrap-mac-mini.sh`
- `scripts/mac-mini/healthcheck.sh`
- `scripts/mac-mini/last-run-summary.sh`
- `scripts/mac-mini/run-nightly-verification.sh`
- `scripts/mac-mini/run-recompute-jobs.sh`
- `scripts/mac-mini/run-sync-checks.sh`
- `scripts/mac-mini/run-export-packets.sh`
- `scripts/mac-mini/run-smoke-suite.sh`
- `scripts/mac-mini/install-launch-agents.sh`
