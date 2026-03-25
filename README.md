# C2Acct

C2Acct is the current AAE institutional alignment application. The live product is intentionally narrow today, but the repo is structured around company-scoped survey submission, scoring, results, and unlocked outputs rather than a one-off single-firm prototype.

## What is live now

The protected golden path is:

1. `login`
2. `survey`
3. `submit`
4. `results`
5. `outputs`

Current active runtime entrypoints:

- `/login`
- `/survey` -> redirects to `/survey/firm_alignment_v1`
- `/survey/[key]`
- `/results`
- `/outputs`
- `/admin`

Current active APIs:

- `/api/auth/[...nextauth]`
- `/api/company/default`
- `/api/company/select`
- `/api/survey/module/[key]`
- `/api/survey/submit`
- `/api/results`
- `/api/badges/earned`
- `/api/insights/unlocked`
- `/api/health/db`

Intentional explicit 404 placeholders remain in place for future surfaces that are not live yet:

- `/api/fmi`
- `/api/fmi/momentum`
- `/api/users`
- `/api/engagements/[id]/score`
- `/api/surveys/[moduleId]`

## Stack

- Next.js App Router
- React 19
- NextAuth v5 beta
- Prisma + PostgreSQL
- TypeScript
- Tailwind CSS v4

## Auth and company boundary

Authentication is allow-list based, not self-service. A user must already exist in the `User` table for the normalized email returned by the auth provider.

Authorization is company-bound:

- the session carries `user.id`, `role`, and `companyId`
- protected APIs derive company authority from the session, not from client payloads
- submit/results/badges/insights are scoped to the session company
- company selection is persisted in the `aae_companyId` cookie but cannot cross the session company boundary

If you are bootstrapping a new environment, create the operator `User` row directly in the database after seeding baseline data.

## Canonical data bootstrap

The repo previously contained multiple stale seed paths. The current source of truth is:

- `prisma/seed.ts`

It seeds:

- the active `firm_alignment_v1` survey module
- the live survey questions
- tier-1 badge rule and unlocked insight content
- a `Demo Company`

Run baseline seed:

```bash
pnpm seed:baseline
```

Or via Prisma:

```bash
pnpm exec prisma db seed
```

Focused seed helpers remain available when you only need one slice:

- `node scripts/seed-firm-alignment.mjs`
- `node scripts/seed-tier1-badges-insights.mjs`
- `node scripts/seed-demo-company.mjs`

Historical or broken one-off seed/repair utilities were moved under `scripts/archive/`.

## Local development

Install and run:

```bash
pnpm install
pnpm dev
```

Stable validation commands:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

## Repo map

Start here:

- `docs/active-repo-map.md`
- `docs/CORE_BUILD_AAE.md`

Primary source-of-truth code areas:

- `app/`
- `lib/`
- `prisma/schema.prisma`
- `scripts/`
- `ops/mac-mini/`

Archived material:

- `scripts/archive/`
- `docs/archive/`

## Mac mini ops

The Mac mini operating layer is in `ops/mac-mini/README.md`.

Short remote commands:

```bash
pnpm ops:mac-mini:status
pnpm ops:mac-mini:health
pnpm ops:mac-mini:launchd:check
pnpm ops:mac-mini:verify
pnpm ops:mac-mini:launchd:install
```

Normal deploy flow on the Mac mini:

```bash
git pull
pnpm install
pnpm build
pnpm ops:mac-mini:launchd:install
```
