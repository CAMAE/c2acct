# Script Hygiene Pass

Date: 2026-03-08

Scope:
- One-off dev/debug scripts may use console logging.
- App runtime routes should avoid leaking internal error detail.
- Any script that touches DATABASE_URL should avoid printing connection-string previews.
- Production-impacting scripts should prefer explicit guards like prisma-safe.js.

Open cleanup backlog:
- Consolidate root-level one-off scripts into /scripts or /archive/scripts
- Standardize script success/error output format
- Remove stale duplicate helper scripts after verification
- Keep smoke scripts aligned to localhost:5433/c2acct unless intentionally overridden
