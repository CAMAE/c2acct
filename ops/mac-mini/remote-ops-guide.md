# Remote Ops Guide

Operating model:

- Laptop: deep review, root-cause analysis, config changes, and launchd management.
- Phone: lightweight supervision through remote shell or file sync access.
- Mac mini: scheduled execution only.

Phone-friendly supervision path:

1. Open the latest JSON summary:
   - `artifacts/mac-mini/status/*.json`
   - `artifacts/mac-mini/heartbeats/*.json`
2. Open the latest stderr log for the failed job.
3. If the job is safe to retry, run the same script with `--dry-run` first.
4. If launchd must be paused on macOS:
   - `launchctl unload ~/Library/LaunchAgents/com.aae.c2acct.<job>.plist`
5. If launchd must be resumed:
   - `launchctl load ~/Library/LaunchAgents/com.aae.c2acct.<job>.plist`

Useful commands:

```bash
bash scripts/mac-mini/healthcheck.sh
bash scripts/mac-mini/last-run-summary.sh
bash scripts/mac-mini/run-nightly-verification.sh --dry-run
bash scripts/mac-mini/install-launch-agents.sh --dry-run
```

Truth boundary:

- This repo packages remote-supervision artifacts and commands.
- It does not prove live remote access or live launchd execution from this workspace.
