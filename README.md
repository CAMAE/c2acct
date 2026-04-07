# C2Acct

C2Acct is the active PAT product repo. "AAE" still appears in some historical filenames, archive docs, and compatibility notes, but PAT is the current runtime/build truth.

## What is live now

The clean PAT path is:

1. `/`
2. `/sign-in`
3. role workspace: `/vendor`, `/firm`, `/user`, `/admin`, or assigned consultant `/consultants` when `PAT_ENABLE_CONSULTANT_ACCESS=1`
4. role-specific assessment, insights, membership, admin, and briefing surfaces

Current active runtime entrypoints:

- `/`
- `/sign-in`
- `/vendor`
- `/firm`
- `/user`
- `/admin`
- `/consultants` when `PAT_ENABLE_CONSULTANT_ACCESS=1`
- `/survey` -> compatibility redirect to `/firm/alignment-assessment`
- `/survey/[key]`
- `/login` -> compatibility redirect to `/sign-in`
- `/results` -> compatibility redirect to canonical PAT insight interpretation
- `/outputs` -> compatibility redirect to canonical PAT insight interpretation

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

## Bootstrap a fresh checkout

Use `pnpm` as the canonical package manager. CI, lockfiles, and local bootstrap all assume `pnpm`; `npm` is not the active maintenance path for this repo.

Safe fresh-checkout bootstrap:

```bash
pnpm bootstrap:repo
```

Equivalent manual path:

```bash
pnpm install
pnpm prisma:generate
```

This bootstrap path is intentionally narrow. It installs dependencies and generates the Prisma client without assuming Docker, seed data, or local runtime env vars are already ready.

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
pnpm bootstrap:repo
pnpm dev
```

Stable validation commands:

```bash
pnpm lint
pnpm typecheck
pnpm build
```

Operator truth:

- `pnpm start`: canonical packaged runtime start using `node .next/standalone/server.js`
- `pnpm start:next`: non-canonical framework server path for debugging only
- `pnpm standalone:local`: local standalone launcher that pins honest loopback auth env

Deterministic local PAT validation against Docker Postgres on `localhost:5433`:

```bash
pnpm db:recreate
pnpm validate:db
```

One-command launch verification from a clean local DB:

```bash
pnpm validate:launch
```

Validation truth:

- `pnpm validate:launch`: full repo/runtime/browser validation path
- `pnpm release:prelaunch`: narrower release-artifact and PAT surface proof
- `pnpm validate:release-surfaces`: explicit alias for `release:prelaunch`

Canonical local standalone runtime:

```bash
pnpm build
pnpm standalone:local
```

`pnpm standalone:local` loads repo-root `.env.local` first, then `.env`, and supplies local-only loopback defaults for `AUTH_URL`, `NEXTAUTH_URL`, `AUTH_SECRET`, `PAT_ENABLE_LOCAL_REVIEW_AUTH`, and `PAT_LOCAL_REVIEW_PASSWORD` so the standalone sign-in surface does not boot into the missing-secret path.

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

`validate:launch` now includes DB validation, build, standalone startup proof, typecheck, unit tests, and Playwright local-review browser coverage.

`release:prelaunch` is intentionally narrower. It proves the release artifact and rendered PAT surface contract, but it is not a substitute for `validate:launch`.

## Local review auth

GitHub remains the primary production auth provider.

For deterministic local manual review, PAT can expose a development-only Auth.js Credentials path when all of the following are true:

- `NODE_ENV !== "production"`
- `PAT_ENABLE_LOCAL_REVIEW_AUTH=1`
- `PAT_LOCAL_REVIEW_PASSWORD` is set
- `AUTH_SECRET` or `NEXTAUTH_SECRET` is set so Auth.js can sign a real session

Deterministic local review identities:

- `review.vendor@pat.local`
- `review.firm@pat.local`
- `review.individual@pat.local`
- `review.admin@pat.local`
- `review.consultant@pat.local`

Seed with the flag enabled so those users exist in the local DB with canonical role/company bindings:

```bash
PAT_ENABLE_LOCAL_REVIEW_AUTH=1 pnpm seed:baseline
PAT_ENABLE_LOCAL_REVIEW_AUTH=1 pnpm seed:pat-runtime
```

This local review path is never exposed in production and does not replace GitHub auth there.

Exact local manual review sequence:

```bash
pnpm db:recreate
pnpm prisma:migrate:local
PAT_ENABLE_LOCAL_REVIEW_AUTH=1 pnpm seed:baseline
PAT_ENABLE_LOCAL_REVIEW_AUTH=1 pnpm seed:pat-runtime
PAT_ENABLE_LOCAL_REVIEW_AUTH=1 PAT_LOCAL_REVIEW_PASSWORD=pat-local-review AUTH_SECRET=pat-local-auth-secret pnpm dev
```

Equivalent local standalone review sequence:

```bash
pnpm db:recreate
pnpm validate:db
pnpm build
pnpm standalone:local
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
5. `/sign-in?view=consultant`
   Use `review.consultant@pat.local` and `pat-local-review`
   Only enable this when `PAT_ENABLE_CONSULTANT_ACCESS=1` for explicit proof. Then verify the sign-in surface itself, add a consultant profile and firm assignment from `/admin/consultants`, and only then expect `/consultants` briefing access to open cleanly

## Safe repo handoff

Use the sanitized export script when handing off the codebase for review, launch prep, or external packaging.

```bash
pnpm handoff:preflight
pnpm export:safe -- /tmp/c2acct-export
```

What it excludes by default:

- `.git` and `.git/`
- `.env*`
- `.next`
- `node_modules`
- `artifacts/mac-mini/*`
- `logs`
- `playwright-report`, `test-results`, `blob-report`, `coverage`
- temporary files and local scratch state
- archive files such as `.zip`, `.tar`, `.tgz`

Operator rule: never hand off the repo by zipping the working tree directly. Do not export `.git`, `.env`, `.env.local`, build output, Mac mini artifacts, or any other local secrets/runtime residue.

Pre-handoff checklist:

1. `pnpm secrets:scan`
2. `pnpm build`
3. `pnpm typecheck`
4. `pnpm export:safe -- /tmp/c2acct-export`
5. Confirm the export tree excludes `.git`, `.env*`, `.next`, `node_modules`, `logs`, `artifacts/mac-mini`, and temp files before creating a zip

If `gitleaks` is not installed locally, `pnpm secrets:scan` falls back to Docker with the repo `.gitleaks.toml`.

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
pnpm prisma:generate
pnpm build
pnpm ops:mac-mini:launchd:install
```

For handoff or audit packaging, export from the sanitized script above rather than copying the live working tree or any ops artifact directory.
