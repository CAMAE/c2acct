# AUDIT-WS9-001 — Batch per-firm aggregators

**Status:** Open, P1 for WS10
**Filed:** 2026-05-17 during WS9-EMERGENCY
**Branch where filed:** fix/local-review-signin-hotfix at HEAD 74d4712b + WS9 deltas

## Problem

Three consultant-facing pages still fan out N parallel per-firm queries even
after WS9's read-path cleanup. Each per-firm aggregator opens its own Prisma
transaction. At demo-bench scale (15 firms in the focal ecosystem, 47 across
all benchmark ecosystems) this is the dominant cost in warm dev-mode renders
of `/consultants/ecosystems/[id]`.

Measured WS9 warm dev timing for ecosystem detail: 4.4–5.6s per render
(median ~4.7s). Production build will be faster but the per-firm fan-out
remains O(N) where it should be O(1) batched.

## Affected aggregators (file:line anchors at HEAD 74d4712b)

- `getAdminCompanyBriefing(firmId)` — called 15× from `lib/ecosystem.ts:256`,
  `lib/ecosystem.ts:567`, and `lib/briefs.ts:489`.
- `getFirmAssessmentProgress(firmId)` — called 15× from `lib/ecosystem.ts:261`,
  `lib/ecosystem.ts:572`, `lib/firmBriefs.ts:504`, and `lib/firmBriefs.ts:513`.
- `getFirmProductCatalog(firmId)` — called 15× from `lib/ecosystem.ts:579`
  and `lib/firmBriefs.ts:505`.

## Proposed shape

Rewrite each into a batched `companyIds[]`-accepting variant that runs O(1)
queries with `findMany({ where: { companyId: { in: ids } } })` plus in-memory
bucketing, returning a `Map<companyId, AggregateResult>`. Call sites then
become a single `await` plus a `.get(firmId)` per row.

## Out of scope for WS9

WS9 was triaged as an emergency block-removal pass. This refactor changes
function signatures across at least three call-site files and warrants its
own session with the full test matrix.
