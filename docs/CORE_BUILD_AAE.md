# CORE BUILD AAE (Index)

## Current source-of-truth docs
- Audit report: docs/audit/AAE_Codebase_Audit_and_Platform_Hardening_Report_2026-03-05.md
- Two-week plan: docs/plan/two-week-plan_pre-mac-mini_2026-03-05.md

## End-of-session workflow
- Run: powershell -NoProfile -ExecutionPolicy Bypass -File scripts/end-session.ps1
- Output: docs/audit/audit_*.md + docs/audit/session_*.md
- Plan auto-updated with pointers

## CI / hardening milestone commit
- CI hardening PR: 1ca6f26 (gitleaks + build checks + smoke hardening)
