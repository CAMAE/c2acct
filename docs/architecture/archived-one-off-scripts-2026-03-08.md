# Archived One-Off Scripts

Date: 2026-03-08

Moved from repo root to scripts/archive:
- submit-via-api.js
- verify-survey-submissions.js
- backfill-survey-submissions.js

Reason:
- stale or risky one-off utilities
- root-level script clutter
- backfill-survey-submissions.js is especially dangerous because it writes score fields in bulk using an outdated contract

Policy:
- keep canonical active utilities under /scripts
- keep risky historical one-offs in /scripts/archive until explicitly deleted
