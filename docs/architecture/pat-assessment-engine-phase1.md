# PAT Assessment Engine Phase 1

## Why this slice exists

The old survey path mixed three concerns:

- module data retrieval
- client-side rendering behavior
- server-side submit validation

That made the current beta fragile. The client only truly supported sliders, while the schema already advertised additional input types.

Phase 1 fixes the contract without a risky schema rewrite.

## Implemented now

- `SurveyQuestion.meta` is the canonical place for runtime metadata.
- `lib/assessmentRuntime.ts` normalizes module and question records into a typed runtime payload.
- `/api/survey/module/[key]` returns normalized sections, question validation metadata, and staged feature flags.
- `/api/survey/submit` validates answers by question type and metadata on the server.
- `/survey/[key]` renders supported question types through one module client instead of ad hoc page logic.
- The five-module PAT firm assessment now seeds a concrete capability layer through `CapabilityNode`, `ModuleCapability`, and `SurveyQuestionCapability` so the live firm model is explainable at the module and question level.

## Supported runtime types

- `SLIDER`
- `TEXT`
- `BOOLEAN`
- `NUMBER`
- `SELECT` when `meta.options` is present
- `MULTISELECT` when `meta.options` is present

Questions that require metadata but do not have it are returned as `status = "unsupported"` and render as intentional blocked states instead of failing silently.

## Metadata contract

Current question metadata keys:

- `section`
- `helpText`
- `placeholder`
- `groupKey`
- `slider`
- `number`
- `text`
- `options`
- `branching`
- `roleVariants`

This keeps branching and role variants visible in the module contract now, while the live runtime still treats them as staged phase-2 behavior.

## Phase 2 direction

- resolve module variants by PAT audience and subject context
- evaluate `branching.visibleWhen` rules dynamically during render and submit
- add open-group and repeating section semantics
- move score calculation from numeric-only normalization to capability-aware scoring by question strategy
