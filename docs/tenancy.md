# Consultant tenancy invariants

PAT enforces consultant data isolation at three layers. Every contributor must understand these before adding any consultant-facing route or aggregator.

## Invariant 1: Assignment lookup is the first prisma call

Every exported function whose name ends in `…ForConsultant` MUST make its first prisma call to `consultantAssignment.findFirst` (or `findMany` for list routes), filtered by `{ consultantProfileId, active: true }`. No other prisma read or write may precede it. This ensures a cross-tenant request fails fast with a `null` return — never a partial render that leaks data.

Enforced by: `tests/tenancy-invariant.test.ts` (static guard).

## Invariant 2: Cross-tenant returns `notFound()`, never 403 or 500

When the assignment lookup returns null, the aggregator returns `null`. The page-level route component handles null with `notFound()` from `next/navigation`. This produces a 404 — indistinguishable from a missing resource. We do NOT return 403 (would confirm the resource exists) and we do NOT allow a 500 (which would surface as partial render).

## Invariant 3: BriefEditChoice writes resolve through consultant assignment

`BriefEditChoice.briefId` is a logical reference, not a Prisma `@relation`. Any server action that upserts a `BriefEditChoice` MUST first resolve the target brief through `consultantAssignment` for the calling consultant. Never trust a raw `briefId` from the client.

Enforced by: Day-17 `BriefEditChoice` API tests (cross-consultant denial test).

## Invariant 4: assertEcosystemPair signature

`assertEcosystemPair(vendorCompanyId, firmCompanyId)` — vendor first, firm second, always. Defense-in-depth check inside per-firm fan-out, after the assignment lookup has passed.

## Pilot uniqueness constraints (documentation only)

- One `ConsultantAssignment` per consultant per ecosystem (`@@unique([consultantProfileId, ecosystemId])`).
- One `Ecosystem` per firm (firm-to-ecosystem is 1:1 in pilot).

These are intentional pilot-shape constraints. If multi-consultant or multi-ecosystem firm membership becomes a requirement, relax these unique constraints and add new tenancy tests.
