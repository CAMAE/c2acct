# C2Acct

C2Acct is the current AAE institutional alignment application. The live product is intentionally narrow today, but the repo is structured around company-scoped survey submission, scoring, results, and unlocked outputs rather than a one-off single-firm prototype.

## What is live now

The protected golden path is:

1. `sign-in`
2. `survey`
3. `submit`
4. `results`
5. `outputs`

Current active runtime entrypoints:

- `/sign-in`
- `/login` -> compatibility redirect to `/sign-in`
- `/survey` -> compatibility redirect to `/firm/alignment-assessment`
- `/firm/alignment-assessment`
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

Authentication is first-party credentials based, not self-service. A user must already exist in the `User` table with a provisioned `passwordHash`.

Authorization is company-bound:

- the session carries `user.id`, `role`, and `companyId`
- protected APIs derive company authority from the session, not from client payloads
- submit/results/badges/insights are scoped to the session company
- company selection is persisted in the `aae_companyId` cookie but cannot cross the session company boundary

If you are bootstrapping a new environment, seed the bootstrap users with explicit passwords before handing the runtime to operators or reviewers.

## Canonical data bootstrap

The repo previously contained multiple stale seed paths. The current source of truth is:

- `prisma/seed.ts`
- `scripts/seed-pat-runtime.ts`

It seeds:

- the canonical five-module PAT firm alignment system
- 100 live PAT firm questions across those five modules
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

- `node scripts/seed-firm-alignment.mjs` (`/firm` assessment compatibility wrapper around the canonical PAT runtime seed)
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

Canonical sign-in route:

- `/sign-in`
- `/login` remains compatibility-only for older inbound links and immediately redirects to `/sign-in`

Deterministic local PAT validation against Docker Postgres on `localhost:5433`:

```bash
pnpm db:recreate
pnpm validate:db
```

One-command launch verification from a clean local DB:

```bash
pnpm validate:launch
```

What `validate:db` covers:

- local Docker Postgres availability
- Prisma migrations
- canonical baseline seed
- PAT runtime seed
- five PAT firm modules with 20 questions each
- DB-backed module and question capability mappings
- DB-backed company capability score writes
- DB-backed firm insight unlock checks
- vendor alignment engine smoke coverage

If the DB is unavailable, the DB validation scripts fail with an explicit `db:up` and `db:wait` recovery path instead of ambiguous Prisma output.

`validate:launch` now includes build, typecheck, unit tests, production-style auth boundary checks, production seed-hygiene checks, and local-review browser coverage after the DB-backed PAT runtime checks.

## Auth bootstrap and local review

PAT now uses the same credentials provider in local and production.

Required auth env:

- `AUTH_URL`
- `AUTH_SECRET`

Bootstrap password env:

- `PAT_BOOTSTRAP_DEFAULT_PASSWORD` for one shared bootstrap password
- or role-specific `PAT_BOOTSTRAP_VENDOR_PASSWORD`, `PAT_BOOTSTRAP_FIRM_PASSWORD`, `PAT_BOOTSTRAP_INDIVIDUAL_PASSWORD`, `PAT_BOOTSTRAP_ADMIN_PASSWORD`

Explicit production bootstrap user path:

- `PAT_ENABLE_BOOTSTRAP_USERS=1`
- one or more explicit emails:
  - `PAT_BOOTSTRAP_VENDOR_EMAIL`
  - `PAT_BOOTSTRAP_FIRM_EMAIL`
  - `PAT_BOOTSTRAP_INDIVIDUAL_EMAIL`
  - `PAT_BOOTSTRAP_ADMIN_EMAIL`
- then run `npm run seed:bootstrap-users`

Deterministic local review mode remains available when:

- `NODE_ENV !== "production"`
- `PAT_ENABLE_LOCAL_REVIEW_AUTH=1`
- `PAT_LOCAL_REVIEW_PASSWORD` is set

Deterministic local review identities:

- `review.vendor@pat.local`
- `review.firm@pat.local`
- `review.individual@pat.local`
- `review.admin@pat.local`

Seed so those users exist in the local DB with canonical role/company bindings:

```bash
PAT_ENABLE_LOCAL_REVIEW_AUTH=1 PAT_LOCAL_REVIEW_PASSWORD=pat-local-review npm run seed:baseline
PAT_ENABLE_LOCAL_REVIEW_AUTH=1 PAT_LOCAL_REVIEW_PASSWORD=pat-local-review npm run seed:pat-runtime
```

Exact local manual review sequence:

```bash
npm run db:recreate
npm run prisma:migrate:local
PAT_ENABLE_LOCAL_REVIEW_AUTH=1 PAT_LOCAL_REVIEW_PASSWORD=pat-local-review npm run seed:baseline
PAT_ENABLE_LOCAL_REVIEW_AUTH=1 PAT_LOCAL_REVIEW_PASSWORD=pat-local-review npm run seed:pat-runtime
PAT_ENABLE_LOCAL_REVIEW_AUTH=1 PAT_LOCAL_REVIEW_PASSWORD=pat-local-review AUTH_SECRET=pat-local-auth-secret npm run dev
```

Legacy cleanup guidance for environments that already contain deterministic review users:

```sql
SELECT "email" FROM "User" WHERE "email" LIKE 'review.%@pat.local';
DELETE FROM "User" WHERE "email" LIKE 'review.%@pat.local';
```

Then review these browser paths with the seeded local review identities:

1. `/sign-in?view=vendor`
   Use `review.vendor@pat.local` and `pat-local-review`
   Verify `/vendor`, `/vendor/membership`, `/vendor/product-assessment`, product creation, utility branching, final open-ended responses, submit, and `/vendor/product-insight/[productId]`
2. `/sign-in?view=firm`
   Use `review.firm@pat.local` and `pat-local-review`
   Verify `/firm`, `/firm/admin`, and `/firm/membership`
3. `/sign-in?view=individual`
   Use `review.individual@pat.local` and `pat-local-review`
   Verify `/user`, `/user/profile`, and `/user/membership`
4. `/sign-in?view=admin`
   Use `review.admin@pat.local` and `pat-local-review`
   Verify `/admin`

Invitee access is no longer part of the live production sign-in path.

## Safe repo handoff

Use the sanitized export script when handing off the codebase for review, launch prep, or external packaging.

```bash
npm run handoff:preflight
npm run export:safe -- /tmp/c2acct-export
```

What it excludes by default:

- `.env*`
- `.next`
- `node_modules`
- `artifacts/mac-mini/*`
- `logs`
- `playwright-report`, `test-results`, `blob-report`, `coverage`
- temporary files and local scratch state
- archive files such as `.zip`, `.tar`, `.tgz`

Operator rule: never hand off the repo by zipping the working tree directly. Do not export `.env`, `.env.local`, build output, Mac mini artifacts, or any other local secrets/runtime residue.

Pre-handoff checklist:

1. `npm run secrets:scan`
2. `npm run build`
3. `npm run typecheck`
4. `npm run export:safe -- /tmp/c2acct-export`
5. Confirm the export tree excludes `.env*`, `.next`, `node_modules`, `logs`, `artifacts/mac-mini`, and temp files before creating a zip

If `gitleaks` is not installed locally, `npm run secrets:scan` falls back to Docker with the repo `.gitleaks.toml`.

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

For handoff or audit packaging, export from the sanitized script above rather than copying the live working tree or any ops artifact directory.
