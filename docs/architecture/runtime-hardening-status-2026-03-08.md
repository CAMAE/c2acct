RUNTIME HARDENING STATUS
Date: 2026-03-08

Completed:
- Protected page origin resolution unified through lib/request-origin.ts
- Protected module route no longer leaks server error detail
- Unused NEXTAUTH_SECRET removed from .env.local
- Smoke script DATABASE_URL aligned to localhost:5433/c2acct
- DATABASE_URL preview logging removed from scripts/whereAmI.js

Current audit truth:
- Remaining console.error hits are in scripts/dev utilities and prisma seed paths, not active app runtime routes
- Active app runtime env contract is:
  - AUTH_SECRET
  - AUTH_URL
  - AUTH_GITHUB_ID
  - AUTH_GITHUB_SECRET
  - DATABASE_URL

Next highest-value actions:
1. Rotate AUTH_SECRET and AUTH_GITHUB_SECRET
2. Create a scripts hygiene pass later (standardize script logging and error output)
3. Continue production-safety hardening without reopening stable outputs flow
