# Pilot Incident Template

Use this template for first-week pilot incidents. For release identity, wrong root, dirty tree, or fingerprint mismatch, also fill out `docs/incidents/PAT_release_integrity_incident_template.md`.

## Summary

- Incident ID:
- Opened at:
- Reporter:
- Operator:
- Severity: `P0` / `P1` / `P2` / `P3`
- Issue type: `billing` / `auth` / `vendor assessment` / `firm assessment` / `insight overclaim` / `runtime/deployment` / `support`
- Current status: `open` / `mitigated` / `resolved` / `monitoring`

## Environment

- Root: `/Users/camerongarrett/work/c2acct-live`
- URL or route:
- Audience: `vendor` / `firm` / `user` / `admin` / `consultant`
- Account email or company:
- Data boundary: `DEMO` / `PILOT` / `PRODUCTION` / `unknown`
- Release ID:
- Branch:
- Commit:
- Build ID:
- Git dirty:
- Auth mode:
- Payment mode:

## Evidence

- Admin launch control notes:
- Release fingerprint evidence:
- Health route evidence:
- Failed webhook row:
- Assessment route/module/product:
- Insight route/surface:
- Screenshot or copied error:
- Logs or command output:
- Related support ticket:

## Impact

- Users affected:
- Pilot cohort affected:
- Workflow blocked:
- Entitlement or billing affected:
- Data loss risk:
- Overclaim risk:
- Public-live risk:

## Immediate Checks

```bash
pnpm ops:mac-mini:status
pnpm ops:mac-mini:health
pnpm launch:proof
```

Run when release or runtime state is involved:

```bash
pnpm ops:mac-mini:verify
pnpm validate:launch
```

## Triage

- Reproduced by operator:
- Expected behavior:
- Actual behavior:
- First suspected layer:
- Workaround available:
- Owner assigned:
- Next update time:

## Escalation Decision

- Escalate to billing owner:
- Escalate to auth owner:
- Escalate to vendor assessment owner:
- Escalate to firm assessment owner:
- Escalate to insight/content owner:
- Escalate to runtime/deployment owner:
- Rollback considered:
- Rollback approved by:

## Resolution

- Fix commit:
- Config or seed change:
- Proof regenerated:
- Validation commands run:
- User communication sent:
- Follow-up owner:
- Follow-up due date:

## Post-Incident Guardrail

- Missing test:
- Missing monitor:
- Missing copy guard:
- Missing support documentation:
- Release/source-integrity impact:
- Pilot go/no-go impact:

