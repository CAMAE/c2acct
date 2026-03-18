# Local And Staging Bootstrap

Generated: 2026-03-16

## Local bootstrap

### 1. Tooling

- Node.js and npm must be installed
- Docker Desktop or another Docker-compatible runtime is the scripted local DB path in this repo

### 2. Prepare env

Copy `.env.example` to `.env.local` and set at minimum:

```dotenv
AUTH_SECRET=<strong-random-secret>
AUTH_URL=http://localhost:3000
AUTH_GITHUB_ID=<github-oauth-client-id>
AUTH_GITHUB_SECRET=<github-oauth-client-secret>
DATABASE_URL=postgresql://<user>:<password>@localhost:5433/<database>?schema=public
INTERNAL_HEALTHCHECK_KEY=<optional-shared-secret>
SEED_OWNER_EMAIL=<optional-override-email>
SEED_OWNER_NAME=<optional-override-name>
```

### 3. Start local Postgres

Shell:

```bash
./scripts/ops/bootstrap-local-db.sh
```

PowerShell:

```powershell
.\scripts\ops\bootstrap-local-db.ps1
```

These scripts:
- expect Docker to be available
- start a PostgreSQL 16 container on `localhost:5433`
- create a local `c2acct` database
- do not run migrations automatically

### 4. Validate env contract

```bash
./scripts/ops/verify-env-contract.sh
```

Important:
- raw Prisma CLI commands do not automatically read `.env.local`
- either export the variables into your current shell first or maintain a local `.env` file for Prisma CLI compatibility
- `npm run prisma:migrate:deploy` is less ambiguous because `scripts/prisma-safe.js` loads `.env.local`

### 5. Install packages and validate Prisma schema

```bash
npm install
set -a; source .env.local; set +a
npx prisma validate
```

### 6. Apply schema and seed launch data

```bash
npm run prisma:migrate:deploy
npm run seed:launch
```

### 7. Build and verify launch

```bash
npm run build
npm run verify:launch
```

### 8. Run app

```bash
npm run dev
```

Optional DB health check:

- Browser session path: log in as a platform admin, then hit `/api/health/db`
- Headless path: send header `x-aae-internal-health-key` matching `INTERNAL_HEALTHCHECK_KEY`

## Staging bootstrap

### Required inputs

- Reachable PostgreSQL instance
- Direct `DATABASE_URL`
- Real `AUTH_SECRET`
- Correct `AUTH_URL`
- Real GitHub OAuth client id/secret with callback aligned to staging origin
- `INTERNAL_HEALTHCHECK_KEY` if headless health probing is needed

### Order

1. Set staging secrets and env vars
2. Run `./scripts/ops/print-runtime-contract.sh`
3. Run `./scripts/ops/verify-env-contract.sh`
4. Export env vars into the current shell or provide a local `.env`, then run `npx prisma validate`
5. Run `npm run build`
6. If schema changes are intended and `NODE_ENV=production`, set `ALLOW_PROD_DB_MIGRATIONS=1`
7. Run `npm run prisma:migrate:deploy`
8. Run `npm run seed:launch` if the staging environment is intended to support `verify:launch`
9. Run `npm run verify:launch`

## Failure interpretation

- `npx prisma validate` failure:
  - bad Prisma schema or missing/invalid `DATABASE_URL`
- `npm run build` failure:
  - app or type/runtime build issue
- `npm run prisma:migrate:deploy` failure:
  - missing `DATABASE_URL`, unreachable DB, auth to DB failed, production safety gate blocked, or existing data violates a new migration invariant
- `npm run verify:launch` failure:
  - env contract invalid, Prisma client/runtime mismatch, DB not reachable, or launch seed data not present

## Truth boundary

- Boot-ready means env contract is valid, database is reachable, schema is migrated, and the app builds.
- `verify:launch` adds a stronger seeded-demo contract on top of boot readiness.
- Do not mark launch verified unless both the build and the seeded launch verification pass.
