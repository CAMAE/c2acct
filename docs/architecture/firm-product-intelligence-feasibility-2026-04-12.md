# Firm Product Intelligence Feasibility

Date: 2026-04-12

## Decision

Do not ship a separate firm product intelligence surface yet.

The current PAT codebase has enough truth to support:

- firm-side product assessments scoped to vendor-declared features
- vendor-side product intelligence built from vendor self-report plus firm review evidence

The current codebase does not yet have enough grounded, firm-specific contracts to support a distinct accounting-firm-facing product intelligence surface without inventing behavior.

## Current grounded inputs

- `app/firm/product-assessments/page.tsx` only opens firm product reviews after a completed vendor product assessment exists.
- `app/firm/product-assessments/[productId]/page.tsx` and `app/components/firm/FirmProductAssessmentClient.tsx` keep the firm review inside the product's declared feature scope and route submission back into the existing firm insight flow.
- `lib/firmPat.ts` builds firm product assessment plans from feature-scoped numeric questions only. The current firm product review path does not add open-ended product-intelligence prompts or a separate intelligence model.
- `lib/vendorProductInsightEngine.ts` is the live product-intelligence engine. It is vendor-facing and combines vendor product submissions with aggregated firm product review evidence for that product.
- `lib/membershipContent.ts` already states that current firm Pro and Elite scope does not unlock a broader firm product suite today.

## Why a separate firm surface is not honest yet

### 1. No firm-scoped product intelligence engine exists

The live engine is `lib/vendorProductInsightEngine.ts`. It is calibrated for vendor product intelligence, not a single firm's product-intelligence view.

Its current snapshot model blends:

- vendor self-reported product assessment evidence
- firm-reviewed evidence aggregated across firm submissions for the product

That is useful for a vendor-facing product readout, but it is not the same thing as a firm-specific product intelligence surface for one accounting firm.

### 2. The firm product review contract is too narrow

The current firm product assessment contract is feature-scoped numeric scoring only:

- no dedicated firm product-intelligence content definitions
- no firm-specific narrative/explanation contract
- no product-level drill-down model beyond the scored feature sections

That is enough to support product review and vendor-facing downstream signal. It is not enough to present a separate firm product intelligence page honestly.

### 3. The repo does not define firm-facing product dimensions yet

Potential dimensions like workflow fit, integration posture, controls/governance, implementation burden, and productivity support can be reasonable future targets, but they are not yet codified as a firm product insight contract in the current runtime.

Before shipping a new surface, PAT needs an explicit mapping from real firm product assessment evidence into named firm product insight dimensions.

### 4. Unlock and route truth do not exist yet

The current shipped firm surfaces are:

- firm alignment assessment
- firm alignment insights
- firm product assessments

There is no truthful current route, unlock rule, or membership promise for a distinct firm product intelligence surface.

## What new contracts are required before shipping

Create a dedicated firm-facing engine, for example `lib/firmProductInsightEngine.ts`, with a snapshot contract scoped to:

- one firm
- one product
- one latest firm product assessment submission
- the linked completed vendor product assessment, if PAT chooses to expose vendor self-report context

That engine should define exactly which evidence is allowed in a firm-facing product readout:

- the firm's own scored feature responses
- the vendor's completed product self-report, only if shown explicitly as vendor-declared context
- no cross-firm aggregation unless PAT intentionally designs and documents a benchmark-style layer later

Define grounded firm-facing product dimensions, each tied to real evidence from the current question bank or a future expanded bank. Candidate dimensions are acceptable only after PAT maps them to actual basis keys, sections, or scored clusters:

- workflow fit
- integration posture
- controls and governance fit
- implementation and change burden
- productivity support

Add firm-facing detail content definitions and drill-down rules comparable to the existing alignment insight surfaces:

- what the readout is
- why it matters
- how to use it
- which feature sections and scored evidence support it
- what confidence caveats apply

Add an explicit unlock and navigation contract:

- where the surface lives
- whether it is part of Free, Pro, or Elite
- how it differs from firm alignment insights
- how it differs from vendor product intelligence

## Honest ship criteria

A separate firm product intelligence surface becomes honest to ship only when all of the following are true:

1. A firm-specific product intelligence engine exists and is tested.
2. The surface uses only grounded evidence that PAT can explain per firm and per product.
3. The visible insight dimensions are mapped to real assessment evidence rather than improvised copy.
4. Unlock rules, route placement, and membership language are documented without implying a broader firm product suite than PAT currently supports.
5. The resulting page can distinguish clearly between:
   the firm's own product review,
   vendor-declared product context,
   and any future benchmark or cross-firm layer.

## Current repo guidance

Until those contracts exist:

- do not add `app/firm/product-intelligence/*`
- do not rename firm product assessments into firm product intelligence
- keep the current truth: firm product assessments feed the vendor product intelligence layer and the existing firm alignment insight flow
