# C2Acct

C2Acct is the authoritative PAT product repo rooted at `/Users/camerongarrett/work/c2acct-live`. "AAE" still appears in historical filenames, archive docs, and compatibility notes, but PAT is the current source and runtime truth in this repo.

## Source of truth

- The canonical PAT repo root is `/Users/camerongarrett/work/c2acct-live`. Current branch and commit truth come from `git branch --show-current` and `git rev-parse HEAD`, with `docs/active-repo-map.md` as the repo map.
- Release dirty-tree truth comes from `node --import tsx scripts/release/read-release-git-dirty.ts --format state`. It uses `ops/release/release-critical-files.json` so quarantined generated evidence paths do not make a clean release look dirty, while real source and release-critical changes still block launch.
- The current attached build id must be read from `.next/BUILD_ID`, `/api/release-fingerprint`, or `pnpm standalone:local:check` rather than from this doc.
- `README.md` and `docs/active-repo-map.md` are the current repo-level source-of-truth docs. The rebuild, audit, and release docs dated 2026-04-02 remain historical evidence only.
- Dated audit and release docs are historical evidence snapshots. They do not by themselves prove that any external host is live today.
- A dirty release tree means launch readiness is unproven even if older snapshots were green.
- Generated proof outputs under `artifacts/audit/`, `artifacts/release/`, and `artifacts/visual/` are quarantine-only evidence files. Keep them out of release-decision dirt; do not use broad ignore rules to hide real source or release-critical changes.
- `/sign-in` is the canonical PAT sign-in route. `/login` is compatibility-only and must redirect into `/sign-in`.
- `origin/main`, quarantined mixed-copy roots, and comparison-only working-tree exports are not authoritative for release decisions. See `docs/release/comparison-only-working-tree-exports.md`.

## Current PAT route contract in source

This section describes the route and runtime contract implemented in source. Use the release and host proof docs before claiming that any deployed environment is live.

Canonical PAT path in source:

1. `/`
2. `/sign-in`
3. role workspace: `/vendor`, `/firm`, `/user`, `/admin`, or assigned consultant `/consultants` when `PAT_ENABLE_CONSULTANT_ACCESS=1`
4. role-specific assessment, insights, membership, admin, and briefing surfaces

Current PAT routes in source:

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

Current PAT APIs in source:

- `/api/auth/[...nextauth]`
- `/api/company/default`
- `/api/company/select`
- `/api/survey/module/[key]`
- `/api/survey/submit`
- `/api/results`
- `/api/badges/earned`
- `/api/insights/unlocked`
- `/api/health/db`

Intentional explicit `404` placeholders remain in place for future surfaces that are not wired into the PAT runtime yet:

- `/api/fmi`
- `/api/fmi/momentum`
- `/api/users`
- `/api/engagements/[id]/score`
- `/api/surveys/[moduleId]`

## Current PAT product truth in source

- PAT product-facing UI copy uses `feature` and `features` where that improves user comprehension. Internal registries, API payloads, and persistence contracts may still use `utilityKey` or `utilityKeys` where those identifiers remain the authoritative runtime contract.
- Core signed-in PAT assessment and insight surfaces are currently `Pro`-gated with honest membership upgrade paths. PAT does not gate `/sign-in`, workspace entry, or membership overview behind that requirement.
- Elite insight and membership surfaces remain visible where staged, but visible Elite cards or checkout options do not by themselves prove that a richer premium layer is fully live.
- Membership checkout routes are provider-backed only when `PAT_BILLING_ENABLED=1`, `STRIPE_SECRET_KEY`, and the audience/plan `STRIPE_PRICE_*` env var are present. Without that proof, checkout copy must say scaffold/no live charge.
- PAT never stores raw card numbers, security codes, or bank account numbers. Stripe-hosted checkout collects payment details; PAT stores provider customer, checkout session, subscription, invoice, webhook-event refs, and reconciliation timestamps.

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

## Billing and subscription truth

Stripe is the only provider-backed billing path in source. Configure it with:

- `PAT_BILLING_ENABLED=1`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_VENDOR_PRO`, `STRIPE_PRICE_VENDOR_ELITE`
- `STRIPE_PRICE_FIRM_PRO`, `STRIPE_PRICE_FIRM_ELITE`
- `STRIPE_PRICE_INDIVIDUAL_PRO`, `STRIPE_PRICE_INDIVIDUAL_ELITE` or the user aliases `STRIPE_PRICE_USER_PRO`, `STRIPE_PRICE_USER_ELITE`

Provider routes:

- `POST /api/billing/webhooks`: verifies Stripe signatures, persists webhook events idempotently, reconciles subscription/invoice state, and records processing proof.
- `POST /api/billing/portal`: redirects signed-in users to Stripe customer portal when a provider customer exists.

Billing-sensitive routes require explicit account-holder confirmation and durable DB-backed rate limits. The customer portal route is limited per signed-in user and client IP. Stripe webhooks are signature-verified and rate-limited per client IP before reconciliation.

Subscription entitlement truth comes from provider reconciliation. `active` and `trialing` Stripe subscription states can grant entitlement; `past_due`, `canceled`, `incomplete`, `unpaid`, and `payment_action_required` do not. Checkout session creation only marks `PENDING_CHECKOUT` until signed webhook proof reconciles the provider subscription.

Live provider roundtrip remains `UNVERIFIED` unless Stripe keys/CLI or a signed fixture run proves the route. Local fixture tests are acceptable local-only proof; they are not public-live billing proof.

## Bootstrap a fresh checkout

Use `pnpm` as the canonical package manager and validation standard. This repo ships `pnpm-lock.yaml`, `pnpm-workspace.yaml`, a `packageManager` field, and bootstrap/package scripts that call `pnpm`. Do not mix `npm install` into the maintained repo workflow unless you are doing a one-off compatibility check in a disposable environment.

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
- 100 scored PAT firm slider questions plus 25 open-ended follow-up prompts across those five modules
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

Canonical validation commands:

```bash
pnpm install
pnpm lint
pnpm typecheck
pnpm exec vitest run tests/release-surface-validator.test.ts
pnpm build
```

`pnpm validate:launch` remains the full repo/runtime/browser proof path. `pnpm release:prelaunch` remains the narrower release-artifact and PAT surface proof.

Current release status:

- attached checkout build id is intentionally not pinned in this doc; read it from the current release-proof artifacts and fingerprint surfaces
- attached checkout dirty state is intentionally not pinned in this doc; read it with `node --import tsx scripts/release/read-release-git-dirty.ts --format state`
- host cutover proof is still required before any live or launch-ready claim is credible

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

Release fingerprint truth:

- Canonical root: `ops/release/canonical-root.json` declares `/Users/camerongarrett/work/c2acct-live`.
- Package manager: `pnpm`, pinned by `packageManager` and `pnpm-lock.yaml`.
- Build command: `pnpm build`, which runs `next build --webpack` and `scripts/release/prepare-standalone-runtime.mjs`.
- Start command: `pnpm start`, which launches `node .next/standalone/server.js` through `scripts/startup-guard.ts`.
- Auth mode: production/operator runtime uses `github`; local-review auth is development-only and loopback-only.
- Fingerprint fields: `releaseId`, `branch`, `commitSha`, `commitShort`, `buildId`, `buildTimestamp`, `authMode`, `buildSourceType`, `canonicalRootName`, `releaseFingerprintSeed`, `startCommand`, and `gitDirty`; operator-only JSON also includes full `canonicalRoot`.
- Artifact chain: `canonical-root.json`, `release-state.env`, `expected-live-release.json`, `last-known-good-release.json`, `/api/release-fingerprint`, `/api/health/db`, `status.sh`, `port-owner-proof.sh`, `release:prelaunch`, and `validate:launch` must agree on branch, commit, build id, build timestamp, root identity, start command, auth mode, and dirty state.
- `last-known-good-release.json` is promoted from `expected-live-release.json` only after prelaunch/nightly proof succeeds. Startup and strict source-integrity validation fail if it is missing, stale, or disagrees with the expected release.
- Public-live release state remains `UNVERIFIED` unless there is a reachable public live URL proof; loopback-only proof is local QA only.

Canonical local standalone runtime:

```bash
pnpm build
pnpm standalone:local
```

`pnpm standalone:local` loads repo-root `.env.local` first, then `.env`, and supplies local-only loopback defaults for `AUTH_URL`, `NEXTAUTH_URL`, `AUTH_SECRET`, `PAT_ENABLE_LOCAL_REVIEW_AUTH`, and `PAT_LOCAL_REVIEW_PASSWORD` so the standalone sign-in surface does not boot into the missing-secret path. It prefers `127.0.0.1:3000` for local proof, automatically falls forward to the next free loopback port when `3000` is busy, and still allows an explicit loopback port via `--port` or `PAT_LOCAL_STANDALONE_PORT=`.

`pnpm standalone:local:check` is the explicit served-build identity proof. It fails closed if the homepage marker probe or `/api/release-fingerprint` agreement does not match the current repo build fingerprint.

What `validate:db` covers:

- local Docker Postgres availability
- Prisma migrations
- canonical baseline seed
- PAT runtime seed
- DB-backed module and question capability mappings
- DB-backed company capability score writes
- DB-backed firm insight unlock checks
- vendor alignment engine smoke coverage
- five PAT firm modules with 20 scored slider questions and five open-ended follow-up prompts each

If the DB is unavailable, the DB validation scripts fail with an explicit `db:up` and `db:wait` recovery path instead of ambiguous Prisma output.

`validate:launch` now includes DB validation, build, standalone startup proof, typecheck, unit tests, Playwright local-review browser coverage, and Playwright release-integrity browser coverage.

`release:prelaunch` is intentionally narrower. It proves the release artifact and rendered PAT surface contract, but it is not a substitute for `validate:launch`.

## Local review auth

GitHub remains the primary production auth provider.

For deterministic local manual review, PAT can expose a development-only Auth.js Credentials path when all of the following are true:

- `PAT_ENABLE_LOCAL_REVIEW_AUTH=1`
- `PAT_LOCAL_REVIEW_PASSWORD` is set
- `AUTH_SECRET` or `NEXTAUTH_SECRET` is set so Auth.js can sign a real session
- every configured app origin used by the auth runtime is loopback-only (`localhost`, `127.0.0.1`, or `::1`)

The local-review policy checks `AUTH_URL`, `NEXTAUTH_URL`, `PAT_LOCAL_ORIGIN`, `MAC_MINI_PUBLIC_ORIGIN`, `NEXT_PUBLIC_APP_URL`, and `PAT_PUBLIC_BASE_URL`. Any public/non-loopback origin disables the credentials provider and blocks `review.*@pat.local` accounts even if those rows already exist in the database. A production-mode standalone loopback proof can use local review only when the flag is set and all configured origins remain loopback.

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

This local review path is never exposed on public production origins and does not replace GitHub auth there.

Exact local manual review sequence:

```bash
pnpm db:recreate
pnpm prisma:migrate:local
PAT_ENABLE_LOCAL_REVIEW_AUTH=1 pnpm seed:baseline
PAT_ENABLE_LOCAL_REVIEW_AUTH=1 pnpm seed:pat-runtime
pnpm dev:proof
```

`pnpm dev:proof` is the explicit browser-review entrypoint. It binds only to loopback, injects the local-review auth env safely, prefers `127.0.0.1:3001`, falls forward through `3010` when needed, and reuses an already running PAT proof dev server instead of failing on `.next/dev/lock`. Use `--port` or `PAT_LOCAL_PROOF_PORT=` only when you need a specific loopback port.

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
   Verify `/vendor`, `/vendor/membership`, `/vendor/product-assessment`, product creation, feature branching, final open-ended responses, submit, and `/vendor/product-insight/[productId]`
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
- `docs/architecture/core-build-guide-source-of-truth.md`
- `docs/release/comparison-only-working-tree-exports.md`
- `docs/CORE_BUILD_AAE.md` (historical filename, still useful for PAT build-order context)

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
