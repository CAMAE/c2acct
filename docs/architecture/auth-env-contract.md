# Runtime Auth / Env Contract

Date: 2026-03-08

This file is the source of truth for runtime auth env semantics.

Required runtime variables:
- AUTH_SECRET
- AUTH_URL
- AUTH_GITHUB_ID
- AUTH_GITHUB_SECRET
- DATABASE_URL

Semantics and ownership:
- `AUTH_SECRET`: Auth.js signing secret for local session/JWT integrity.
- `AUTH_GITHUB_SECRET`: GitHub OAuth client secret used with `AUTH_GITHUB_ID`.
- GitHub OAuth app secret rotation is an external provider action and must be mirrored in local/runtime env values.

Local `.env.local` usage:
- Keep only active keys listed above for local development.
- `NEXTAUTH_SECRET` is not used in this repo and should stay removed.
- `.env.example` should mirror the active required env surface.
