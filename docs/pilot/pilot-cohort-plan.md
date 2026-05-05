# June 1 Pilot Cohort Plan

This plan defines the controlled pilot boundary for PAT. It separates deterministic demo data, pilot provisioning, and production behavior so pilot readiness cannot be confused with demo route readiness or public-live customer proof.

## Cohort Source

- Seed data source: `data/pilotCohort.ts`
- Seed helper: `lib/pilotCohortSeed.ts`
- Health check: `lib/pilotCohortHealth.ts`
- Admin surface: `/admin/launch`
- Organization detail surface: `/admin/organizations/[companyId]`
- Seed version: `pat-june-1-pilot-cohort-v1`
- Expected cohort key: `june-1-pilot-2026`
- Expected start date: `2026-06-01T00:00:00.000Z`
- Required data boundary: `PILOT`

## Boundary Rules

- Demo data is synthetic review data and must stay labeled `DEMO`.
- Pilot data is controlled onboarding data and must stay labeled `PILOT`.
- Production data is real customer behavior and must stay labeled `PRODUCTION`.
- Demo counts may prove route readiness, but they do not prove pilot engagement.
- Pilot counts may prove provisioning readiness, but they do not prove public-live product usage.
- Public-live status remains `UNVERIFIED` unless a public/staging URL fingerprint artifact exists.

## Current Fixture Shape

The current deterministic June 1 fixture contains:

- 1 pilot cohort.
- 2 vendor organizations.
- 2 firm organizations.
- 3 user records, including one internal support operator.
- Owner contact fields for each organization and user.
- Support contact fields for each organization and user.
- Provisioning states across `INVITED`, `PROVISIONING`, and `ACTIVE`.

The fixture is safe for local/operator proof. Replace `.local` and `.example` addresses with real approved contacts before contacting external pilot participants.

## Provisioning States

| State | Meaning | Pilot handling |
| --- | --- | --- |
| `INVITED` | Participant has been identified but is not ready for full pilot use. | Do not count as active pilot usage. |
| `PROVISIONING` | Participant setup is in progress. | Verify auth, company boundary, and support owner before go. |
| `ACTIVE` | Participant is ready for controlled pilot access. | Include in active pilot QA only after support path is confirmed. |
| `BLOCKED` | Participant cannot proceed. | Blocks go if unresolved for required cohort minimums. |
| `ARCHIVED` | Participant removed from current pilot. | Do not count toward readiness. |

## Readiness Minimums

`getPilotCohortMinimums()` defines the minimum expected seed shape:

- At least 1 cohort.
- All configured June 1 organizations are present.
- All configured June 1 users are present.
- Vendor, firm, and user member counts match the fixture minimums.
- Every pilot cohort member has `dataBoundary: PILOT`.
- Demo boundary member count is 0.
- Production boundary member count is 0.

The admin launch plane should show pilot readiness as ready only when these minimums are met. A ready fixture is not the same thing as public-live customer proof.

## Operator Checks

Before approving pilot access:

- Run `pnpm launch:proof` and inspect the generated launch proof.
- Open `/admin/launch` as an admin.
- Confirm the pilot cohort row shows `June 1 Pilot Cohort`.
- Confirm the row boundary is `PILOT`.
- Confirm owner and support contact fields are assigned.
- Confirm member counts are expected.
- Confirm no demo members are included in the pilot cohort.
- Confirm no production members are included in the pilot cohort.
- Confirm checkout surfaces remain scaffold/no-live-charge unless Stripe provider proof is complete.
- Confirm support intake and escalation path are known to the operator.

## Support Path

Pilot support must be explicit before external pilot use.

- Internal owner: `Pilot Operations`
- Internal support surface: `/admin/launch`
- Cohort support field: `supportContactName` and `supportContactEmail`
- Participant support owner fields: `ownerContactName`, `ownerContactEmail`, `supportContactName`, and `supportContactEmail`

Do not expose placeholder `.local` or `.example` contacts to external participants. Treat placeholder contacts as local/operator proof only.

## Rollback

If pilot access is rejected or must be withdrawn:

1. Revert the prompt or release commit that enabled the pilot state.
2. Regenerate generated proof with `pnpm launch:proof`.
3. Keep release/source-integrity and startup dirty-tree guards enabled.
4. Do not hand-edit proof artifacts to hide failures.
5. Record the no-go reason in `docs/pilot/june-1-go-no-go.md` or the operator decision log.

