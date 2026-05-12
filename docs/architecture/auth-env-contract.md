# Runtime Auth / Env Contract

Date: 2026-04-01

This file is the source of truth for runtime auth env semantics.

Required runtime variables:
- AUTH_SECRET
- AUTH_URL
- DATABASE_URL
- PAT_PRODUCTION_DOMAIN

Production bootstrap password variables:
- PAT_BOOTSTRAP_DEFAULT_PASSWORD
- or PAT_BOOTSTRAP_VENDOR_PASSWORD / PAT_BOOTSTRAP_FIRM_PASSWORD / PAT_BOOTSTRAP_INDIVIDUAL_PASSWORD / PAT_BOOTSTRAP_ADMIN_PASSWORD
- Optional explicit bootstrap user emails:
  - PAT_BOOTSTRAP_VENDOR_EMAIL
  - PAT_BOOTSTRAP_FIRM_EMAIL
  - PAT_BOOTSTRAP_INDIVIDUAL_EMAIL
  - PAT_BOOTSTRAP_ADMIN_EMAIL
- Optional explicit bootstrap gate:
  - PAT_ENABLE_BOOTSTRAP_USERS=1

Local-only convenience variable:
- PAT_LOCAL_REVIEW_PASSWORD

Semantics and ownership:
- `AUTH_SECRET`: Auth.js signing secret for session/JWT integrity.
- `AUTH_URL`: canonical public app origin. For production launch this must be `https://patalign.com`.
- `PAT_PRODUCTION_DOMAIN`: canonical production domain. Current production value is `patalign.com`.
- `PAT_BOOTSTRAP_*_PASSWORD`: bootstrap credential inputs used only for the explicit `npm run seed:bootstrap-users` path.
- `PAT_BOOTSTRAP_*_EMAIL`: explicit provisioned bootstrap identities for vendor, firm, individual, and admin. They are ignored unless `PAT_ENABLE_BOOTSTRAP_USERS=1`.
- `PAT_LOCAL_REVIEW_PASSWORD`: explicit local/test password source for deterministic `review.*@pat.local` identities.

Local `.env.local` usage:
- Keep only active keys listed above for local development.
- `NEXTAUTH_SECRET` is only a fallback alias; prefer `AUTH_SECRET`.
- `NEXTAUTH_URL` is only a fallback alias; prefer `AUTH_URL`.
- `.env.example` should mirror the active required env surface.

Seed behavior contract:
- `npm run seed:baseline` and `npm run seed:pat-runtime` never create review users unless local-review mode is explicitly enabled.
- `npm run seed:bootstrap-users` is the only supported path for explicit production/shared bootstrap identities.
- `PAT_ENABLE_LOCAL_REVIEW_AUTH=1` without `PAT_LOCAL_REVIEW_PASSWORD` is invalid outside `NODE_ENV=test`.

Legacy review cleanup guidance:
- Inspect legacy review users:
  - `SELECT "email" FROM "User" WHERE "email" LIKE 'review.%@pat.local';`
- Delete legacy review users only after inspection:
  - `DELETE FROM "User" WHERE "email" LIKE 'review.%@pat.local';`
- Review demo companies before removing them:
  - `Demo Company`
  - `PAT Demo Vendor`
