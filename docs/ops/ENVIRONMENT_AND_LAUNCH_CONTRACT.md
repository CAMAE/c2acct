# Environment And Launch Contract

Generated: 2026-03-16

## Truth status

- Build contract: explicit and documentable
- Auth env contract: explicit and documentable
- Prisma schema contract: explicit and documentable
- Local bootstrap path: documented and scripted
- Full launch verification: blocked until a reachable Postgres instance exists and the launch seed has been applied

## Required runtime variables

### Required to build and boot the app

| Variable | Required? | Shape | Why |
| --- | --- | --- | --- |
| `DATABASE_URL` | Yes | `postgresql://USER:PASSWORD@HOST:PORT/DBNAME?schema=public` | Prisma datasource in `prisma/schema.prisma` requires PostgreSQL |
| `AUTH_SECRET` | Yes | strong random secret string | Auth.js session/JWT signing |
| `AUTH_URL` | Yes | absolute app origin, for example `http://localhost:3000` or `https://staging.example.com` | Auth callback/base URL stability |
| `AUTH_GITHUB_ID` | Yes for GitHub login | OAuth client id | GitHub provider in `auth.config.ts` |
| `AUTH_GITHUB_SECRET` | Yes for GitHub login | OAuth client secret | GitHub provider in `auth.config.ts` |

### Required for specific features

| Variable | Required? | Shape | Why |
| --- | --- | --- | --- |
| `INTERNAL_HEALTHCHECK_KEY` | Optional but recommended for staging | opaque shared secret | Allows headless access to `/api/health/db` without an admin browser session |
| `SEED_OWNER_EMAIL` | Optional | valid email | Overrides the fallback owner email used by `prisma/seed.ts` and `verify-launch-bootstrap.ts` |
| `SEED_OWNER_NAME` | Optional | display name string | Overrides the fallback seed owner name |
| `ENABLE_EXTERNAL_OBSERVED_SIGNALS` | Optional | `1`, `true`, `yes`, or equivalent truthy flag | Enables external observed-signal features |
| `ALLOW_PROD_DB_MIGRATIONS` | Required only when `NODE_ENV=production` and running Prisma schema changes | `1` | Safety gate in `scripts/prisma-safe.js` |

## Local contract

- App URL: `http://localhost:3000`
- Expected DB engine: PostgreSQL
- Default local bootstrap port used by repo scripts: `5433`
- Env loading truth:
  - Next.js reads `.env.local` during `npm run build` and `npm run dev`
  - `scripts/verify-launch-bootstrap.ts` explicitly reads `.env.local`
  - raw Prisma CLI commands such as `npx prisma validate` do not automatically read `.env.local`; they expect exported env vars or a `.env` file
  - `scripts/prisma-safe.js` now loads `.env.local` before invoking Prisma commands
- Expected local DB URL shape:

```text
postgresql://<user>:<password>@localhost:5433/<database>?schema=public
```

- `verify:launch` is not a generic boot check.
  - It requires:
    - reachable database
    - migrated schema
    - seeded launch company
    - seeded owner user attached to the launch company
    - seeded launch modules and questions
    - seeded badges and badge rules
    - seeded launch insights

## Staging contract

- `AUTH_URL` must be the public staging origin
- `DATABASE_URL` must point to a reachable direct PostgreSQL connection string
- If staging runs with `NODE_ENV=production`, `ALLOW_PROD_DB_MIGRATIONS=1` is required before `npm run prisma:migrate:deploy`
- `INTERNAL_HEALTHCHECK_KEY` should be set if the DB health route is used for non-browser monitoring
- OAuth callback settings in the GitHub app must match the staging `AUTH_URL`

## Repo evidence

- Prisma datasource: `prisma/schema.prisma`
- Prisma safety wrapper: `scripts/prisma-safe.js`
- Launch verifier: `scripts/verify-launch-bootstrap.ts`
- Auth provider config: `auth.config.ts`
- Auth session/db gating: `auth.ts`
- DB health route: `app/api/health/db/route.ts`
- NextAuth route: `app/api/auth/[...nextauth]/route.ts`

## Current blockers in this workspace

- Raw Prisma CLI validation is blocked unless env is exported into the current shell or duplicated into a `.env` file, because Prisma CLI does not automatically read `.env.local`.
- Full launch verification is not yet proven because reachability of the configured local PostgreSQL target is not guaranteed here.
- `verify:launch` depends on seeded launch data, not just a live schema.
- In this workspace, `verify:launch` currently fails after loading `.env.local` because Prisma Client rejects the configured datasource URL and reports that it expects `prisma://`.
- `npm run prisma:migrate:deploy` now reaches the local database but fails on migration `20260316160000_external_review_finalized_uniqueness` because duplicate finalized-review rows already exist and violate the new unique index.
- `npx prisma generate` is currently blocked in this workspace by a Windows file-lock `EPERM` rename failure on `query-engine-windows.exe`.
- A checked-in `.env.local` is present in the repo workspace. Treat it as sensitive material and rotate any real secrets if they are active elsewhere.
