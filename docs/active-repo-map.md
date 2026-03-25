# Active Repo Map

## Runtime path
- `app/login/page.tsx`: auth entrypoint.
- `app/survey/page.tsx`: protected golden-path redirect to `firm_alignment_v1`.
- `app/survey/[key]/page.tsx`: live survey UI for active modules.
- `app/api/survey/module/[key]/route.ts`: module + question payload for survey rendering.
- `app/api/survey/submit/route.ts`: authenticated, company-bound submission path.
- `app/results/page.tsx` and `app/api/results/route.ts`: latest submission readback.
- `app/outputs/page.tsx`, `app/api/badges/earned/route.ts`, `app/api/insights/unlocked/route.ts`: post-submit outputs surface.

## Auth and company boundary
- `auth.ts` and `auth.config.ts`: NextAuth wiring and user-claim hydration.
- `lib/auth/session.ts`: session-user lookup.
- `lib/authz.ts`: role and authorization helpers.
- `app/api/company/select/route.ts` and `app/api/company/default/route.ts`: selected-company context.

## Data contract
- `prisma/schema.prisma`: current source of truth for models and enums.
- `prisma/migrations/`: migration history.
- `lib/scoring.ts` and `lib/signalIntegrity.ts`: score and integrity semantics used on submit.

## Canonical seed and smoke path
- `prisma/seed.ts`: baseline seed for module, questions, tier-1 content, and demo company.
- `scripts/seed-firm-alignment.mjs`: module/question-only seed.
- `scripts/seed-tier1-badges-insights.mjs`: badge rule + unlocked insights seed.
- `scripts/seed-demo-company.mjs`: demo company seed.
- `scripts/smoke-golden-path.ps1`: browser-assisted smoke helper for the protected path.

## Explicit placeholders that should stay placeholders
- `app/api/fmi/route.ts`
- `app/api/fmi/momentum/route.ts`
- `app/api/users/route.ts`
- `app/api/engagements/[id]/score/route.ts`
- `app/api/surveys/[moduleId]/route.ts`

## Archive locations
- `scripts/archive/`: obsolete or one-off scripts kept only for history.
- `docs/archive/`: archived generated logs and superseded operational debris.
