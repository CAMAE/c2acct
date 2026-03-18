# Final Mac Mini Operations Report

Accessed: 2026-03-16

## Packaged

- Mac mini job wrappers exist for:
  - nightly verification
  - recompute jobs
  - sync checks
  - export packets
  - smoke runs
  - healthcheck
  - last-run summary
- Launchd templates exist under `ops/mac-mini/launchd/`.
- Documentation exists under:
  - `ops/mac-mini/README.md`
  - `ops/mac-mini/job-catalog.md`
  - `ops/mac-mini/incident-response.md`
  - `ops/mac-mini/remote-ops-guide.md`
  - `ops/mac-mini/STATUS_AND_HEARTBEAT_CONTRACT.md`

## Verified in this workspace

- Repo-side script packaging exists.
- Script contracts are documented.
- Host-readiness separation is documented in `audit/MAC_MINI_AUTOMATION_READINESS.md`.

## Not proven in this workspace

- Direct shell execution of the Mac mini scripts on macOS
- `bash`-driven runtime execution from this Windows host
- launchd installation/runtime behavior on a real Mac mini

## Current blocker

- The current Windows host blocks `bash` execution with `Bash/Service/CreateInstance/E_ACCESSDENIED`, so runtime proof remains host-dependent.
