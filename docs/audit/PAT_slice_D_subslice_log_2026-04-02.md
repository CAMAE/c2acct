# PAT Slice D Sub-Slice Log — 2026-04-02

## Scope

Prompt 3.3 required Slice D recovery in sub-slices no larger than one coherent concern, with validation after each landing and no protected PAT route drift.

Authoritative branch during this work:

- `recovery/pat-2026-03-31-baseline`

Protected PAT routes held fixed throughout:

- `/`
- `/sign-in`
- `/vendor`
- `/firm`
- `/user`
- `/admin`
- `/login` compatibility shim only

## Landed Sub-Slices

### Sub-slice 1 — Product Utility Registry / Integrity

Commit:

- `c7f90aa` — `Recover Slice D product utility registry`

Files:

- `lib/productUtilityRegistry.ts`
- `tests/product-utility-integrity.contract.test.ts`

Outcome:

- restored grounded product utility registry guidance
- tightened product-general and open-ended prompt wording around operator usefulness and evidence honesty
- kept registry semantics aligned with PAT utility scope rather than rankings
- added contract coverage for registry integrity

Validation:

- `npm run test:unit -- tests/product-utility-integrity.contract.test.ts`
- no PAT protected-route source drift introduced

### Sub-slice 2 — Vendor Product Insight Runtime

Commit:

- `9dea36b` — `Recover Slice D vendor product insight runtime`

Files:

- `lib/productAssessmentRuntime.ts`
- `lib/vendorProductAssessmentPlan.ts`
- `lib/vendorProductInsightEngine.ts`
- `tests/vendor-product-insight.contract.test.ts`
- `tests/vendor-product.contract.test.ts`
- `scripts/smoke-vendor-product-signal.ts`

Outcome:

- normalized stored-scale answer handling for product-assessment inputs
- restored utility-scope labeling into vendor product insight snapshots
- made vendor and firm evidence handling explicit about score scale bounds
- strengthened insight caveats when utility coverage or evidence density is thin
- updated vendor product fixtures and smoke assertions to match the recovered runtime contract

Validation:

- `npm run test:unit -- tests/vendor-product-insight.contract.test.ts tests/vendor-product.contract.test.ts tests/vendor-product-assessment.contract.test.ts`
- no PAT protected-route source drift introduced

## Full Validation On Current Slice D Head

Current head:

- `9dea36bd5fddf08c886471958e9cf2b0e300777f`

Passed:

- `npm run typecheck`
- `npm run build`
- `npm run test:unit -- tests/product-utility-integrity.contract.test.ts tests/vendor-product-insight.contract.test.ts tests/vendor-product.contract.test.ts tests/vendor-product-assessment.contract.test.ts`
- `node scripts/release/verify-approved-pat-markers.mjs --root .`
- `node scripts/release/validate-pat-surfaces.mjs --root /Users/camerongarrett/work/c2acct-live --port 3310`

Rendered PAT proof on current head:

- `/` returned `200`
- `/sign-in` returned `200`
- `/vendor` returned canonical `307` to `/sign-in?callbackUrl=%2Fvendor&view=vendor`
- `/firm` returned canonical `307` to `/sign-in?callbackUrl=%2Ffirm&view=firm`
- `/user` returned canonical `307` to `/sign-in?callbackUrl=%2Fuser&view=individual`
- `/admin` returned canonical `307` to `/sign-in?callbackUrl=%2Fadmin&view=admin`
- `/login` returned compatibility-only `307` into `/sign-in`
- browser, API, and operator fingerprints matched release `9dea36b:FwTQn8a_QEhaOq90CuMoo`
- no AAE markers appeared on protected routes

Blocked by unrelated pre-existing dirty state:

- `node scripts/release/validate-source-integrity.mjs --root /Users/camerongarrett/work/c2acct-live`

Reason source integrity is still red:

- unrelated host-cutover and rebuild-doc work remains uncommitted in the tree
- critical dirty files are `scripts/mac-mini/nightly-verify.sh` and `scripts/mac-mini/status.sh`
- warnings also show the recorded state file still points at the earlier clean head until those unrelated changes are reconciled

This source-integrity failure is not caused by the landed Slice D sub-slices.

## Current Re-Verification On Recovery HEAD

Current authoritative HEAD:

- `252b7f39ec77b5459c26791769410b87c4048cec`

Re-verified in this track:

- `node scripts/release/verify-approved-pat-markers.mjs --root .` -> passed
- `npm run test:unit -- tests/product-utility-integrity.contract.test.ts tests/vendor-product-insight.contract.test.ts tests/vendor-product.contract.test.ts tests/vendor-product-assessment.contract.test.ts` -> passed (`4` files, `10` tests)

Current full prelaunch result on this dirty/sandboxed tree:

- `npm run release:prelaunch` -> failed

Failure cause was not Slice D regression:

- `sourceIntegrity.ok: false` because unrelated critical dirty files are still present in:
  - `scripts/mac-mini/common.sh`
  - `scripts/mac-mini/nightly-verify.sh`
  - `scripts/mac-mini/status.sh`
- `patSurfaces.ok: false` because the sandbox could not bind the isolated validator runtime on `127.0.0.1:3310`:
  - `listen EPERM: operation not permitted 127.0.0.1:3310`

Decision from this re-verification:

- no additional Slice D subslices were landed
- the two already landed Slice D subslices remain the only validated prelaunch-safe Slice D recoveries

## Deferred Sub-Slices

Deferred for later explicit review:

- membership / billing
- telemetry / support modules
- vendor activation UX changes outside the recovered product insight/runtime scope

Reason for deferral:

- they are not needed to recover the validated product utility runtime
- they touch broader user flows and would add pre-merge risk without improving PAT top-level launch proof

## Rejected Work

Rejected from the quarantined mixed release copy:

- any top-level PAT shell, homepage, layout, header, or auth surface changes that could reintroduce AAE/PAT mixing

## Conclusion

Slice D has been partially recovered in two audited, validated sub-slices:

- product utility registry / integrity
- vendor product insight runtime

No protected PAT top-level route drift was introduced. Remaining Slice D work stays deferred pending separate review.
