# PAT Beta to Institutional Rollout Roadmap

## Purpose

This roadmap exists to stop the repo from drifting into a second rewrite trap.

The current product is real enough to demo and operate:

- login
- company-backed assessment
- submit
- results
- outputs
- profile shell
- operator console

It is not yet a stable institutional platform. The migration path has to preserve the protected beta while forcing future PAT work through explicit stages.

## Current truth

What is live now:

- company-backed firm and vendor assessment flow
- PAT workspace shell
- subject-aware assessment reads and writes with `companyId` fallback
- badge and insight unlock path
- taxonomy ingestion substrate

What is still beta-only:

- assessment, badges, insights, and results require a company-backed subject
- `User.companyId` still acts as a compatibility fallback when `SubjectMembership` is missing
- company selection still relies on a compatibility cookie bridge
- capability scores, FMI snapshots, and benchmarks are still company-rooted writes
- non-firm portals are staged off even when previewed in docs or workspace shells

## Stages

### Stage 0: Protected Beta

Keep:

- current login -> survey -> submit -> results -> outputs path
- firm and vendor company-backed operation
- company-rooted score and benchmark tables

Do not do:

- non-company assessment flows
- subject-native capability score writes without dual-read support
- talent, HR, higher-ed, association, media, or member live routes without access rules and flags

### Stage 1: PAT Phase 1

Target:

- company-backed firms and vendors coexist under PAT identity
- `Subject` becomes the forward assessment identity
- `SubjectMembership` becomes the preferred access model
- PAT shell exposes staged but controlled future surfaces

Required compatibility bridges:

- dual-read company selection cookie:
  - `pat_companyId`
  - `aae_companyId`
- `User.companyId` fallback while memberships are incomplete
- dual-key assessment scope:
  - `companyId`
  - `subjectId`

Implemented now in code:

- rollout contract in `lib/platformRollout.ts`
- portal surface gating through rollout flags
- company selection cookie bridge through `pat_companyId` plus legacy `aae_companyId`

### Stage 2: Subject-Native Assessment Core

Required before live expansion:

- subject-native capability score table
- subject-native benchmark strategy
- dual-read compatibility layer for company-rooted historical data
- operator tooling to inspect subject coverage and migration completeness

Do not remove yet:

- `companyId` on live assessment records
- legacy company cookie support
- `User.companyId` fallback

Retire only when:

- all live readers resolve scope from `SubjectMembership` or company-backed `Subject`
- seeded and demo data are backfilled
- dashboards no longer require company-only joins

### Stage 3: Additional Role Portals

Entry order:

1. associations / higher ed
2. talent / HR
3. media
4. individual member flows

Gate for each new portal:

- identity model exists
- authorization model exists
- one real data-backed surface exists
- feature flag exists
- operator visibility exists

If any of those are missing, the portal remains staged off.

## Safe now vs dangerous now

Safe now:

- more PAT shell and dashboard work on top of the current company-backed path
- more subject-aware reads that preserve company fallback
- migration helpers and backfills that do not change runtime authority
- feature-flagged portal scaffolding that defaults off

Dangerous now:

- removing `companyId` dependencies from write paths before subject-native replacements exist
- adding new portals by route only
- making individual/member flows live while submit/results still require company-backed scope
- treating vendor, talent, higher-ed, and media as the same access pattern

## Vendor + firm coexistence

Current rule:

- both are supported through `Company.type`
- both can map to a company-backed `Subject`
- both use the same protected assessment path today

Near-term direction:

- keep shared runtime where the workflow is truly shared
- differentiate portal surfaces and later module variants through explicit role and rollout rules
- do not fork the whole platform by company type

## Compatibility bridges that must stay explicit

- `pat_companyId` and `aae_companyId` are both written during transition
- `pat_subjectId` remains the forward subject cookie key
- `User.companyId` remains a fallback access hint, not the long-term identity model
- company-rooted score tables remain canonical until subject-native equivalents exist

## Legacy AAE retirement sequence

Retire deliberately in this order:

1. legacy naming in active runtime
2. legacy company cookie reads after `pat_companyId` saturation is confirmed
3. `User.companyId` as runtime authority after `SubjectMembership` coverage is complete
4. company-rooted score authority after subject-native dual-read has shipped

## Operator rule

No new PAT feature should ship unless it can answer all of these:

- what subject does it attach to
- what access model authorizes it
- whether it is beta-only or phase-1 live
- what compatibility bridge it depends on
- how it will be retired later
