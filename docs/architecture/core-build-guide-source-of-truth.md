# Core Build Guide Source Of Truth

The uploaded build guide remains the editorial source note:

- `Core Build AAE Guide.pages`

The in-repo implementation order and launch-readiness guide now lives in:

- `docs/CORE_BUILD_AAE.md`

Current rule:

- Use `Core Build AAE Guide.pages` for intent and direction.
- Use `docs/CORE_BUILD_AAE.md` for current repo reality, launch order, and rollback-state classification.

Canonical release-root rule as of 2026-04-02:

- `/Users/camerongarrett/work/c2acct-live` is the only candidate release root.
- `/Users/camerongarrett/work/c2acct` is development-only and must not be used as a live root.
- `/private/tmp/c2acct-main-auth` is a mixed release copy and must not be used as a live root.

Current rollback-state rule:

- The repo has been restored to the last known-good PAT baseline at `078a41f6816e81e599b94423faf501d10c2aa70c`.
- PAT home, PAT shell/nav, and the PAT sign-in hub are the baseline source of truth.
- Any post-2026-03-31 hardening or runtime work must be recovered later from the preserved dirty patch and file inventory, not assumed to be live truth now.

This is necessary because the repo has moved materially since the earlier audit period:

- `/admin` is now a live operator control plane.
- membership pages and membership cards now exist.
- vendor product assessment and dynamic product plans now exist.
- consultant/operator briefings now exist under `/admin/briefings`.
- member briefing still remains staged until person-side maturity is ready.
