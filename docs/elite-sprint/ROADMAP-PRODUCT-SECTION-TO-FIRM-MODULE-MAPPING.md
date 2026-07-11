# Roadmap ticket — Product-section → Firm-module taxonomy mapping

**Filed:** 2026-07-09 (Cam, P0 Sandbox radar decision)
**Type:** reviewable content artifact (CPA-founder approvable, like the question
banks / QBANK governance). NOT code-only — the mapping itself is the deliverable
and must be blessed before it can drive any UI.
**Priority:** post-P0 roadmap (unblocks the "familiar axes" version of the radar).

## Why this exists

The Alignment Sandbox radar (P0) was re-axised to the **five product-fit
dimensions** the product review actually carries evidence for:

| Dimension | Product-review basis sections |
|---|---|
| Workflow Fit | `workflow-fit`, `adoption-ease` |
| Integration & Data | `integration-readiness`, `reporting-visibility` |
| Implementation | `implementation-friction`, `configuration-depth`, `training-onboarding` |
| Support & Trust | `support-trust`, `operational-dependence` |
| Value Clarity | `value-clarity` |

We did this because there is **no stored evidence** mapping a product to the
firm's five *assessment* modules (`operating-model`, `automation-ai`,
`data-flow`, `governance`, `strategy` — `FIRM_MODULE_DEFINITIONS`). Projecting a
product swap onto those firm-module axes would be invented data (esp.
`automation-ai`, which has no product-review basis at all). Cam's no-fake rule
forbids that.

## The deliverable

Author a reviewable **product-section (basis) → firm-module** crosswalk:

- Input taxonomy: the 10 `ProductQuestionBasisKey` values
  (`lib/productUtilityRegistry.ts`).
- Output taxonomy: the 5 `FIRM_MODULE_DEFINITIONS` `sectionKey`s
  (`lib/firmPat.ts`).
- Each basis → one-or-more firm modules with a weight, plus a written rationale
  per edge (the CPA-founder accuracy signature applies, same as question banks).
- Explicitly flag firm modules with **no** honest product-evidence source
  (today: `automation-ai`) so the UI can render them as "no product signal"
  rather than faking movement.

## What it unblocks

Once the mapping exists and `reviewStatus` is blessed, the Sandbox radar (and any
projected firm-module shape) can honestly render **firm-module axes** — the
familiar five-module alignment language — by pushing each product's per-section
evidence through the blessed crosswalk. That is the path back to the familiar
axes without inventing data.

## Related
- P0 build: `lib/alignmentBoard.ts` (per-dimension evidence), `app/components/firm/AlignmentBoardClient.tsx`, `app/components/firm/AlignmentRadar.tsx`.
- Evidence source: `buildVendorSectionEvidence` / firm-section evidence in `lib/vendorProductInsightEngine.ts`.
