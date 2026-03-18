# Mac Mini Automation Operations Notes

Accessed: 2026-03-16

## Official-source facts

- Apple recommends `launchd` as the preferred mechanism for daemons and user agents on macOS. Source: https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingLaunchdJobs.html
- Apple also states that timed background jobs should prefer `launchd` over `cron`, and older job mechanisms are deprecated. Source: https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/ScheduledJobs.html
- Apple distinguishes system daemons from per-user agents and ties them to `/Library/LaunchDaemons` and `/Library/LaunchAgents`. Source: https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CreatingLaunchdJobs.html
- Apple notes that login/logout scripts are deprecated and that `launchd` jobs should be used instead. Source: https://developer.apple.com/library/archive/documentation/MacOSX/Conceptual/BPSystemStartup/Chapters/CustomLogin.html

## Repo implications

- The repo’s `scripts/mac-mini/` and `ops/mac-mini/launchd/` layout is directionally correct for Apple Silicon automation.
- Headless wrappers should continue to preserve:
  - explicit exit codes
  - structured log paths
  - stdout/stderr capture
  - timeout wrappers
  - artifact directories
- `launchd` labels should stay stable and descriptive because they are the operating handle for remote supervision.
- Any background job intended for a logged-in admin should be a LaunchAgent.
- Any job intended to run regardless of GUI login should be packaged as a LaunchDaemon only if permissions and host policy justify it.

## Design recommendations

- Keep Mac mini as the execution backbone, not the primary review station.
- Keep laptop as the deep review/admin station.
- Keep phone workflows limited to status, retry, pause, rerun, and alert response.
- Prefer idempotent scripts over ad hoc shell sessions.
- Preserve artifact-producing nightly jobs rather than silent background tasks.

## Source-backed operating principle

The repo’s stated model remains sound:
- Admin directs.
- Mac mini executes.
- Ownership decides.
