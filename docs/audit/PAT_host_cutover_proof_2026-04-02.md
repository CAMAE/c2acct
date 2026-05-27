# PAT Host Cutover Proof (2026-04-02)

## Goal

Make Mac mini host cutover deterministic by proving:

- who owns `127.0.0.1:3000`
- whether that PID is the launchd-installed PAT app
- which release fingerprint it is serving
- whether launchd, the live listener, and operator state agree

## Changes

Added host ownership proof at:

- `scripts/mac-mini/port-owner-proof.sh`

Updated host checks to consume that proof:

- `scripts/mac-mini/launchd-check.sh`
- `scripts/mac-mini/status.sh`
- `scripts/mac-mini/nightly-verify.sh`

## New Contract

`port-owner-proof.sh` now reports:

- `launchd_service_state`
- `launchd_service_pid`
- `live_port_owner_state`
- `live_port_owner_pid`
- `live_port_owner_command`
- `live_release_id`
- `live_commit_sha`
- `expected_release_id`
- `ownership_check`
- `ownership_failures`

Strict mode is `bash scripts/mac-mini/port-owner-proof.sh --check`.

## launchd-check Behavior

`bash scripts/mac-mini/launchd-check.sh` now fails when any of these are true:

- launchd says `com.c2acct.app` is not loaded
- port `3000` is owned by a non-launchd process
- the live `/api/release-fingerprint` endpoint is unavailable
- the live release fingerprint does not match operator state

## status Behavior

`bash scripts/mac-mini/status.sh` now prints the host-side ownership proof directly, including:

- `launchd_service_state`
- `live_port_owner_state`
- `live_port_owner_pid`
- `live_release_id`
- `ownership_check`
- `ownership_failures`

## nightly verify Behavior

`bash scripts/mac-mini/nightly-verify.sh` now runs:

- `host_cutover_proof`

and records `host_cutover_summary` in the nightly summary. This makes nightly fail explicitly on:

- non-launchd port owner
- stale listener
- mismatched or missing live release fingerprint

## Current Host Evidence

Observed with:

```bash
bash scripts/mac-mini/port-owner-proof.sh
bash scripts/mac-mini/launchd-check.sh
bash scripts/mac-mini/status.sh
bash scripts/mac-mini/nightly-verify.sh
```

Current proof output:

- `launchd_service_state=not-loaded`
- `live_port_owner_state=stale-listener`
- `live_port_owner_pid=25059`
- `live_port_owner_command=node`
- `live_release_probe_http=000`
- `ownership_check=fail`
- `ownership_failures=launchd_not_loaded,non_launchd_port_owner,live_release_endpoint_unavailable`

Nightly summary:

- `artifacts/mac-mini/reports/nightly-summary-20260403T015045Z.txt`

Recorded host-cutover failure:

- `host_cutover_summary=launchd_service_state=not-loaded live_port_owner_state=stale-listener live_port_owner_pid=25059 live_release_probe_http=000 live_release_id=missing expected_release_id=01a68f4:084EPflpJ9Tni2MpEG28o ownership_check=fail ownership_failures=launchd_not_loaded,non_launchd_port_owner,live_release_endpoint_unavailable`

## Conclusion

The host is not cut over correctly yet. A stale non-launchd `node` listener still owns port `3000`, and the launchd-managed PAT app is not loaded.

That is now a hard failure instead of an ambiguous host condition:

- `status.sh` exposes it
- `launchd-check.sh` fails on it
- `nightly-verify.sh` fails on it

Live ownership will only prove green once:

1. `launchd_service_state=loaded`
2. `live_port_owner_state=launchd-owned`
3. `live_release_id` matches `expected_release_id`
4. `ownership_check=pass`
