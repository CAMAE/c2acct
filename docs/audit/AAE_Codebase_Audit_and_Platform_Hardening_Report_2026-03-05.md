# AAE Codebase Audit and Platform Hardening Report (2026-03-05)

## Immediate risk register

The codebase snapshot shows a strong core direction (surveys → submissions → scoring → badges/unlocks), but it is currently vulnerable to data pollution, broken first-run UX, and “maintenance debt traps” that will consume time and credibility later.

The highest-leverage path is to secure the data boundary (auth + authorization), repair the primary UX path (survey → submit → results), and delete/contain historical debris (backup files + outdated scripts), while keeping iteration speed high by using proven patterns for Next.js route handlers and Prisma.

### Risk register (summary)
- **Critical:** No authentication / authorization on company-scoped APIs (/api/survey/submit, /api/results, /api/badges/earned, /api/insights/unlocked, /admin) → BOLA + broken auth risk
- **Critical:** Primary user path broken (Home → /survey, but app/survey/page.tsx doesn’t return working UI / payload mismatch)
- **Critical:** Score scale mismatch (UI 1–5, server 0–5) → distorted unlocks/benchmarks/FMI/vendor-fit
- **High:** Admin panel public + can mutate data (server action creates Company)
- **High:** Outdated Prisma seed/scripts reference non-existent models → onboarding/time sink
- **High:** In-repo backups (*.bak*, _bak/) → accidental deploy + cognitive load + leakage risk
- **Medium:** Inconsistent PrismaClient creation (new PrismaClient vs shared singleton)
- **Medium:** Empty/broken routes (/api/users import-only; 501 handlers) → drift/scanner noise
- **Medium:** Encoding artifacts in UI (Â© / â—) → trust hit

## Architecture and code quality audit

Strong structural theme: repo mixes “current product code” with historical attempts (backup variants + old scripts). This creates hidden drag.

High-leverage consolidations:
1) One Prisma client entry point (use shared singleton everywhere).
2) One canonical “submit survey” contract aligned across UI, API, smoke tests, scoring; then version it (scoreVersion/moduleVersion).
3) Remove in-repo backups; Git is the history.

## Data model and integrity audit

Missing “integrity defaults” that prevent dev mistakes from becoming prod failures:
- Prefer **@updatedAt** for timestamps to reduce fragile coupling.
- Prefer **@default(uuid())** (Prisma-level) or **dbgenerated("gen_random_uuid()")** (DB-level) depending on insertion paths.
- Align scoring scale to UI domain; validate/clamp inputs; clamp final score to [0,100] and keep unlock rules in 0–100.

Atomicity:
- Submission + badge awards should be consistent; use short DB-local transaction for award upserts.

Future-proofing:
- Platform will score multiple “subjects” (firm/vendor/product/individual). Consider unified **Profile/Subject** abstraction and point submissions/badges/capability scores to profileId.

## Security and privacy hardening blueprint

Existential: enforce the **data boundary** (who can read/write which company’s information). OWASP API risks strongly map here (BOLA/broken auth).

Auth options:
- Managed auth with org primitives + org slugs in URLs + org switching
- Auth.js + Prisma adapter + middleware protection

Must-have:
- Once authenticated, every request referencing companyId must verify membership/role for that company.
- Protect /admin behind OWNER/ADMIN role checks.

Anti-abuse:
- Rate limit /api/survey/submit and other sensitive flows; consider basic integrity flags over time.

Logging discipline:
- Sanitize tokens/session identifiers/connection strings; avoid sensitive values.
- Use cache controls like Cache-Control: no-store for session-sensitive responses.

## Platform best practices (pragmatic)

- Accessibility: keep survey interactions keyboard-safe; follow ARIA slider patterns when custom.
- Performance: keep survey page lightweight; prefer SSR for results/outputs; avoid layout shift.
- Observability: start with structured logs + request IDs; add tracing when background jobs arrive (benchmarks/FMI/vendor-fit scoring).
- Reliability discipline: protect “must not break” flows (auth gate, submit path, results page) and track lightweight DORA-style stability signals.

## Roadmap and execution schedule (2-lane)

### Next few days
Ship: Make /survey a working experience (redirect to /survey/[key] or real module picker). Repair submit payload. Align scoring scale to inputs.
Hardening: delete/move backups; tighten .gitignore; remove empty routes; fix encoding artifacts.

Outcome: clean demo Home → Survey → Submit → Results.

### First week
Ship: company selection (dropdown seeded from DB). Submit from /survey/[key].
Hardening: introduce auth foundation; protect /admin and all company-scoped APIs.

Outcome: signed-in users can submit/view company results; admin not public.

### Second week
Ship: org context in URLs (/orgs/[slug]/survey/[key]) or tenant switcher.
Hardening: membership/RBAC enforced in every handler to prevent BOLA.

Outcome: multi-tenant demo: user can only see their org, can switch org context.

### After two weeks
Ship: build capability dashboards / vendor-fit views on secure primitives.
Hardening/Mac mini lane: observability, background recomputation jobs, stricter CI as tooling stabilizes.

Note: If adopting unified Profile/Subject abstraction, do it right after auth/membership or set a hard cutoff before onboarding external firms/vendors.
