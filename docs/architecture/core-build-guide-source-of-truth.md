# Core Build Guide Source Of Truth

## Current rule

Canonical current-state truth lives in the repo:

- `docs/CORE_BUILD_AAE.md`
- `docs/active-repo-map.md`
- `docs/audit/PAT_Launch_Readiness_Audit_2026-04-01.md`
- `docs/audit/PAT_Release_Candidate_Ship_Report_2026-04-01.md`

The uploaded `Core Build AAE Guide.pages` file is not currently present in this workspace, so it could not be re-read or re-verified directly on 2026-04-01.

That means:

- do not treat the missing `.pages` artifact as live canonical truth
- do not silently inherit its wording into current docs
- use the in-repo audit trail for dated historical progression until the original `.pages` file is available again

## How to interpret the `.pages` guide when available

If `Core Build AAE Guide.pages` is reintroduced and verified:

- use it as historical build-direction context and scar-tissue context
- compare its dates and assumptions against the newer repo docs before acting on it
- prefer current repo truth when the guide conflicts with implemented runtime behavior

The repo has moved materially since the earlier audit period:

- `/admin` is now a live operator control plane
- membership pages and membership cards now exist
- vendor product assessment and dynamic product plans now exist
- consultant/operator briefings now exist under `/admin/briefings`
- member briefing still remains staged until person-side maturity is ready

## Verified 2026-04-01

The best currently verifiable dated progression is:

- 2026-03-05: `docs/audit/AAE_Codebase_Audit_and_Platform_Hardening_Report_2026-03-05.md`
  - pre-launch audit/hardening guidance
  - emphasizes auth, route protection, scoring alignment, and historical debris cleanup
- 2026-04-01: `docs/audit/GitHub_Main_Reconciliation_2026-04-01.md`
  - verifies which claimed launch changes were actually on `origin/main`, branch `HEAD`, or only local worktree
- 2026-04-01: `docs/audit/PAT_Launch_Readiness_Audit_2026-04-01.md`
  - PAT-specific launch readiness audit after auth and ops work
- 2026-04-01: `docs/audit/PAT_Release_Candidate_Ship_Report_2026-04-01.md`
  - current release-candidate truth and cutover conditions

## Operator rule

- Use `docs/CORE_BUILD_AAE.md` for current implementation truth.
- Use the dated audit docs for historical progression and older risk framing.
- Only use `Core Build AAE Guide.pages` as a historical source after the actual file is present and identity-verified.
