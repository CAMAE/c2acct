#!/bin/bash
set -euo pipefail

cat <<'EOF'
AAE/C2Acct runtime contract

Required to boot:
- DATABASE_URL=postgresql://USER:PASSWORD@HOST:PORT/DBNAME?schema=public
- AUTH_SECRET=<strong-random-secret>
- AUTH_URL=http://localhost:3000 (local) or https://<staging-host>
- AUTH_GITHUB_ID=<github-oauth-client-id>
- AUTH_GITHUB_SECRET=<github-oauth-client-secret>

Prisma CLI note:
- npx prisma validate does not automatically read .env.local
- export env vars first or maintain a local .env file
- npm run prisma:migrate:deploy loads .env.local through scripts/prisma-safe.js

Optional but recommended:
- INTERNAL_HEALTHCHECK_KEY=<shared-secret-for-headless-db-health>
- SEED_OWNER_EMAIL=<override-demo-owner-email>
- SEED_OWNER_NAME=<override-demo-owner-name>
- ENABLE_EXTERNAL_OBSERVED_SIGNALS=1

Required only for production Prisma schema changes:
- ALLOW_PROD_DB_MIGRATIONS=1

Launch verification adds these requirements:
- database reachable
- migrations applied
- npm run seed:launch completed
- launch company, owner, modules, badges, and insights present
EOF
