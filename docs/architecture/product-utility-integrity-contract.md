# PAT Product Utility And Insight Integrity Contract

Date: 2026-04-01

## Current source of truth

The live implementation source of truth is:

- `lib/productUtilityRegistry.ts`
- `lib/vendorProductQuestionBank.ts`
- `lib/productAssessmentRuntime.ts`
- `lib/vendorProductInsightEngine.ts`
- `lib/vendorProductInsightCards.ts`

Note:

- The uploaded `PAT Vendor Product Utility Master.pages` artifact is still not present in this workspace.
- A literal artifact-to-runtime reconciliation therefore could not be performed on 2026-04-01.
- This contract reflects the implemented runtime and test-backed design currently in the repository, not verified line-by-line parity with the missing `.pages` source.

## Reconciliation status

This branch is reconciled as far as the environment currently allows:

- The live utility registry, assessment runtime, and vendor insight contract agree on the same utility-family architecture.
- Product-general and open-ended modules remain canonical and intentionally stable.
- Insight framing remains current-state only and keeps vendor self-reported signal separate from firm-reviewed signal.

Residual gap:

- The original `PAT Vendor Product Utility Master.pages` source is still unavailable in the workspace, so this branch cannot claim literal artifact-to-code parity.
- The remaining reconciliation gap is source availability, not an identified contradiction between the current registry, runtime, insight wording, and tests.
- See `docs/audit/PAT_Vendor_Product_Utility_Master_Artifact_Check_2026-04-01.md`.

Version decision:

- No registry-version bump was taken in this pass.
- Question IDs remain stable under `2026-03-product-utility-v2`.
- No saved-plan or draft migration is required from this pass because the question architecture and ID scheme were not changed.

## Core design

1. Utilities are scope declarations, not product rankings.
2. Each declared utility contributes four subcategories and five scored questions per subcategory.
3. Vendor product assessments include:
   - product-general profile capture
   - utility-scoped scored modules
   - open-ended narrative questions
4. Firm product assessments reuse the same utility family structure, but omit the product-general and open-ended modules.

## Evidence guardrails

1. PAT product insight is current-state only.
2. Vendor self-reported signal and firm-reviewed signal stay explicitly separate.
3. Confidence labels are not benchmark labels, market labels, or forecast labels.
4. Locked Elite product-insight cards must remain visibly staged and must not imply live benchmark, simulation, or projection support.
5. Utility selection must reflect what the product materially supports today, because it defines what PAT is allowed to assess.

## Operator usefulness rules

1. Product-general prompts should capture operating context, buyer context, and integration posture in plain language.
2. Open-ended prompts should surface strongest workflow, weakest workflow, major implementation risk, evidence gaps, and the next sensible action.
3. Exact assessment basis text should name:
   - vendor score
   - firm-reviewed average
   - utility scope
   - evidence counts where relevant
4. Confidence caveats should explain thin evidence, missing external confirmation, or missing utility scope rather than hiding those weaknesses.

## Stability rules

1. Question IDs remain stable unless the registry version intentionally changes.
2. Copy or framing improvements should prefer keeping the registry version stable when the underlying question architecture is unchanged.
3. Any future registry-version bump must include explicit migration reasoning for saved product-assessment plans and drafts.

## Literal-source rule

If `PAT Vendor Product Utility Master.pages` becomes available later:

1. verify that the file is the actual utility master and not a mislabeled export or derivative
2. compare utility families, subcategories, prompt wording, evidence framing, and caveat language directly
3. keep the registry version stable unless the artifact requires a real taxonomy or question-architecture shift
4. update this contract only after the literal artifact has been read
