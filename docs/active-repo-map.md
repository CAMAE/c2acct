# Active Repo Map

## Release-root classification
- `/Users/camerongarrett/work/c2acct-live`: canonical PAT recovery root and only candidate live root.
- `/Users/camerongarrett/work/c2acct`: development-only workspace, non-live.
- `/private/tmp/c2acct-main-auth`: mixed release copy, quarantined, non-live.

## Runtime path
- `app/page.tsx`: canonical PAT homepage on the 2026-03-31 rollback baseline.
- `app/layout.tsx`: canonical PAT shell/header/nav on the 2026-03-31 rollback baseline.
- `app/sign-in/page.tsx`: canonical PAT sign-in hub on the 2026-03-31 rollback baseline.
- `app/login/page.tsx`: legacy first-class auth page preserved by the 2026-03-31 rollback baseline; not final PAT launch truth.
- `app/survey/page.tsx`: compatibility redirect to the canonical firm assessment hub.
- `app/firm/alignment-assessment/page.tsx`: canonical five-module PAT firm assessment entry.
- `app/survey/[key]/page.tsx`: live survey UI for active modules.
- `app/api/survey/module/[key]/route.ts`: module + question payload for survey rendering.
- `app/api/survey/submit/route.ts`: authenticated, company-bound submission path.
- `app/results/page.tsx`: compatibility redirect to canonical role-specific interpretation.
- `app/outputs/page.tsx`: compatibility redirect to canonical role-specific insight surfaces.
- `app/profiles/page.tsx`: compatibility redirect to canonical role-specific profile/admin surfaces.
- `app/api/results/route.ts`: latest submission readback.
- `app/api/badges/earned/route.ts`: badge state API for canonical PAT surfaces.
- `app/api/insights/unlocked/route.ts`: unlocked insight API for canonical PAT surfaces.

## Canonical role surfaces
- `app/firm/*`: live firm portal, firm assessment, firm insights, firm admin, firm membership.
- `app/vendor/*`: live vendor portal, vendor product assessment, vendor alignment insights, vendor product insight, vendor admin, vendor membership.
- `app/user/*`: live individual portal, user assessment scaffold, user insights, user profile, user membership.
- `app/admin/*`: active C2Core operator control plane and consultant/operator briefing layer.

## Auth and company boundary
- `auth.ts` and `auth.config.ts`: NextAuth wiring and user-claim hydration.
- `proxy.ts`: protected PAT page/API gate using the shared resolved auth-secret path.
- `lib/auth/session.ts`: session-user lookup.
- `lib/authz.ts`: role and authorization helpers.
- `app/api/company/select/route.ts` and `app/api/company/default/route.ts`: selected-company context.

## Rollback-state notes
- `next.config.ts`: baseline config at `078a41f6816e81e599b94423faf501d10c2aa70c`; no standalone runtime hardening is active on this rollback branch.
- `scripts/mac-mini/app-start.sh`, `scripts/mac-mini/common.sh`, and `scripts/mac-mini/launchd-install.sh`: baseline Mac mini runtime scripts restored to the 2026-03-31 state.
- `ops/release/pat-surface-manifest.json`: baseline PAT surface marker seed captured from the rollback source of truth. This is an audit artifact, not yet a release gate.

## Data contract
- `prisma/schema.prisma`: current source of truth for models and enums.
- `prisma/migrations/`: migration history.
- `lib/scoring.ts` and `lib/signalIntegrity.ts`: score and integrity semantics used on submit.
- `SurveySection`: first-class layer between module and question for section-aware pacing and evidence.
- `MembershipSubscription`: subject-aware membership state with free fallback.
- `OperatorAuditEvent`: audit log for admin mutations.

## Canonical seed and smoke path
- `prisma/seed.ts`: baseline seed for the five PAT firm modules, their 100 questions, tier-1 content, and demo company.
- `scripts/seed-pat-runtime.ts`: canonical PAT runtime seed for firm, vendor, and user scaffolding.
- `scripts/seed-firm-alignment.mjs`: compatibility wrapper that delegates to the canonical PAT runtime seed.
- `scripts/seed-tier1-badges-insights.mjs`: compatibility wrapper that delegates to the canonical PAT runtime seed.
- `scripts/seed-demo-company.mjs`: demo company seed.
- `scripts/smoke-golden-path.ps1`: browser-assisted smoke helper for the protected path using the canonical PAT firm module keys.
- `scripts/validate-db.ts` and `scripts/validate-launch.ts`: canonical DB-backed and launch-readiness validation entrypoints.

## Explicit placeholders that should stay placeholders
- `app/api/fmi/route.ts`
- `app/api/fmi/momentum/route.ts`
- `app/api/users/route.ts`
- `app/api/engagements/[id]/score/route.ts`
- `app/api/surveys/[moduleId]/route.ts`

## Compatibility-only helpers
- `lib/patDashboard.ts`: legacy generic dashboard helper types and narratives kept only for compatibility.
- `lib/patUnlocks.ts`: compatibility constants for older dashboard shells; canonical unlock rules now live in PAT insight runtime/evaluators.

## Archive locations
- `scripts/archive/`: obsolete or one-off scripts kept only for history.
- `docs/archive/`: archived generated logs and superseded operational debris.
