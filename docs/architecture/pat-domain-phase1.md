# PAT Domain Phase 1

## Diagnosis

The current beta assumes one dominant worldview:

- actor access is anchored to `User.companyId`
- the assessed thing is always `Company`
- live outputs are read back from company-scoped tables
- `Product` exists, but products and future PAT portals do not have a first-class assessment subject model

That blocks PAT growth in two ways:

1. Access and assessment are fused.
   `User.companyId` currently means both "what this person belongs to" and "what this person is allowed to assess."
2. `Company` is carrying two jobs.
   It is both the institutional organization record and the root identity for every current score, badge, submission, and result.

## PAT-ready domain shape

PAT should separate five concepts:

- Actor: authenticated person who takes action in the platform. Current implementation: `User`.
- Organization: institution such as firm, vendor, association, higher-ed body, media entity, or employer. Current implementation: `Company` in phase 1.
- Subject: the thing a PAT flow evaluates, benchmarks, or unlocks against. Phase 1 implementation: new `Subject`.
- Product: a product or solution surface that may later become assessable independently. Current implementation: `Product`, with an optional future `Subject` attachment.
- Portal: the audience-specific PAT surface that determines which flows are exposed. Phase 1 implementation: new `Portal`.
- Membership: actor-to-subject access relation. Phase 1 implementation: new `SubjectMembership`.

## Phase 1 decision

`Company` does not get renamed out of the system yet.

Instead:

- `Company` remains the operational organization record for the live golden path.
- `Subject` becomes the broader PAT identity layer.
- a company-backed PAT subject is represented as `Subject.kind = ORGANIZATION` plus `Subject.companyId = Company.id`
- `SubjectMembership` becomes the forward path for authorization and active scope resolution

This avoids a reckless rewrite while removing the assumption that all future assessable things are companies.

## What is implemented now

Phase 1 schema slice:

- `Subject`
- `SubjectMembership`
- `Portal`
- optional `subjectId` on `SurveySubmission`
- optional `subjectId` on `CompanyBadge`

Phase 1 runtime slice:

- current result, badge, insight, and submit APIs now resolve an assessment subject context first
- if a PAT subject membership exists, the APIs use it
- if only a company-backed PAT subject exists, the APIs use that
- if neither exists, they fall back to the legacy company scope
- the current assessment flow still requires a company-backed subject

This means current firm/vendor company flows still work, but the repo is no longer structurally forced to treat `User.companyId` as the only model for access.

## Migration shape

Near-term migration order:

1. Backfill one `Subject` row for every existing `Company`.
2. Start creating `SubjectMembership` rows for operators instead of relying only on `User.companyId`.
3. Dual-write `subjectId` and `companyId` on live assessment tables.
4. Add subject-native score tables for capabilities, maturity, and benchmarks once non-company subjects are live.
5. When all live readers use subject scope, make `companyId` a compatibility/profile relation rather than the root identity.

## Future attachment model

- Survey submissions: attach to `Subject`; keep `companyId` only while company-backed flows are still live.
- Capability scores: migrate from company-only score records to subject-native score records keyed by `subjectId + nodeId + scoreVersion`.
- Insights: remain rule-driven off capabilities, but unlock decisions should evaluate against subject-native score context.
- Benchmarks: benchmark cohorts and runs should target subject-compatible cohorts, not only `CompanyType`.

## Explicit non-goals in phase 1

- no big-bang `Company` rename
- no immediate rewrite of all benchmark/capability tables
- no multi-subject UI switcher yet
- no portal-specific routing changes yet

Phase 1 is intentionally a coexistence layer, not theater.
