# AAE Two-Week Plan (Now → Mac Mini Ready) — 2026-03-05

## Source of truth
- Audit/Hardening report: docs/audit/AAE_Codebase_Audit_and_Platform_Hardening_Report_2026-03-05.md

## Non-negotiable demos by Mac mini day
- Auth-gated: Home → Survey → Submit → Results/Outputs
- Tenant boundary: user can only access their org/company scope
- Admin is protected (OWNER/ADMIN)
- Score semantics stable (0–100 thresholds; UI scale aligned)

## Two-lane execution
### Ship lane (user-visible)
1) Fix /survey experience (redirect to /survey/firm_alignment_v1 or module picker)
2) Fix submit payload contract
3) Results/Outputs clarity + locked insight affordances
4) Company selection (seeded dropdown)
5) Org context in URLs or tenant switcher

### Hardening lane (existential)
1) Delete/contain backups + tighten .gitignore
2) Remove empty/placeholder routes (or auth-gate + roadmap doc)
3) Encoding cleanup (UTF-8 no BOM) + trust polish
4) Auth foundation (Auth.js+Prisma or managed)
5) Enforce membership/RBAC in every company-scoped handler
6) Rate limit submit + anti-abuse basics
7) Prisma integrity defaults plan (@updatedAt, id defaults) + transaction boundaries

## Day-by-day (14 days)
### Days 1–2: Golden path repair
- /survey works end-to-end → submission → results
- Scale mismatch fixed (UI domain matches server; final clamp 0–100)

### Days 3–5: Repo cleanup + trust polish
- Remove backups/debris
- Fix encoding artifacts
- Remove/contain dead scripts and broken routes

### Days 6–9: Auth + protect data boundary
- Add auth
- Protect /admin + all company-scoped APIs
- Membership/RBAC enforcement everywhere

### Days 10–12: Multi-tenant UX
- Org context routes or tenant switcher
- Confirm BOLA prevention with simple tests

### Days 13–14: Mac mini readiness
- Nightly checks + audit doc generation
- Prepare runner safety rails + observability starter

## Risks to watch
- Data pollution risk until auth+RBAC ships
- Score semantics drift if UI scale and server scoring diverge again
- Hidden time sinks from outdated scripts/seed paths

## Session Log Entry (2026-03-05 15:08)
- Audit: docs/audit/audit_2026-03-05_1508.md
- Session log: docs/audit/session_2026-03-05_1508.md

## Session Log Entry (2026-03-05 15:12)
- Audit: docs/audit/audit_2026-03-05_1512.md
- Session log: docs/audit/session_2026-03-05_1512.md
