# Runtime Auth / Env Contract

Date: 2026-03-08

Required runtime variables:
- AUTH_SECRET
- AUTH_URL
- AUTH_GITHUB_ID
- AUTH_GITHUB_SECRET
- DATABASE_URL

Notes:
- NEXTAUTH_SECRET is not used anywhere in the current repo and was removed from .env.local.
- AUTH_GITHUB_SECRET and AUTH_SECRET must be rotated because they were exposed in terminal output.
- .env.example already matches the active required env surface.
