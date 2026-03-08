# Script Hygiene Pass

Date: 2026-03-08

Scope:
- One-off dev/debug scripts may use console logging.
- App runtime routes should avoid leaking internal error detail.
- Any script that touches DATABASE_URL should avoid printing connection-string previews.
- Production-impacting scripts should prefer explicit guards like prisma-safe.js.

Open cleanup backlog:
- Consolidate root-level one-off scripts into /scripts or /archive/scripts
- Standardize script success/error output format
- Remove stale duplicate helper scripts after verification
- Keep smoke scripts aligned to localhost:5433/c2acct unless intentionally overridden

## 2026-03-08 Root-Level Duplicate Candidates
Review now:
- getModuleId.js -> overlaps with scripts/getModuleId.js
- get-company.js -> likely overlaps with scripts/get-company-id.js
- seed-question.js -> likely overlaps with scripts/seedQuestion.js
- seed-questions-v1.js -> candidate for scripts consolidation
- submit-via-api.js -> candidate for scripts consolidation
- verify-survey-submissions.js -> candidate for scripts consolidation
- backfill-survey-submissions.js -> candidate for scripts consolidation

Rule:
- Prefer /scripts as canonical location for executable utilities.
- Keep repo root limited to app/runtime/build config files unless a root script is intentionally user-facing.

## 2026-03-08 Duplicate Review Notes
Observed differences:
- get-company.js returns raw first company object including type
- scripts/get-company-id.js prints labeled id/name fields
- seed-question.js creates TEXT question tech_stack_maturity
- scripts/seedQuestion.js creates SCALE question vision_clarity

Decision:
- These are not true duplicates yet; they are overlapping one-off utilities.
- Keep for now, but mark both root-level files as migration candidates into /scripts or /archive/scripts once a canonical seeded-question workflow is chosen.

