# PATALIGN status — 2026-06-02

## Demo accounts (Neon prod)
Four role accounts provisioned + populated with synthetic activity. Credentials in
`~/Documents/Documents - Cameron's Mac mini/PATALIGN-DEMO-CREDENTIALS.txt`.

| role | account | sign-in | dashboard |
|---|---|---|---|
| vendor | demo-vendor@patalign.test | ✅ | 4 products (2 completed, 1 in-progress, 1 untouched) |
| firm | demo-firm@patalign.test | ✅ | 3/5 modules + maturity + insights |
| consultant | demo-consultant@patalign.test | ✅ | "Demo Accounting Ecosystem" — see below |
| admin | demo-admin-2@patalign.test | ✅ | global agent-ops view |

## Sprint 2 Task A — consultant-facing data expansion (additive only)
Enriched the consultant's existing "Demo Accounting Ecosystem" (the `/consultants`
dashboard is scoped to the consultant's single 1:1 assignment, so extra/overlapping
ecosystems would be invisible — enriching the assigned ecosystem is what increases
visible richness).

Applied deltas (Neon, additive; re-run proven idempotent → 0 deltas):

| table | before | after | delta |
|---|---|---|---|
| companies | 85 | 90 | +5 (new member firms) |
| surveySubmission | 1092 | 1112 | +20 (12 alignment + 8 product reviews) |
| firmMaturityIndex | 65 | 70 | +5 |
| firmMaturitySnapshot | 65 | 88 | +23 (incl. 18 six-month trajectory points across 3 firms) |
| ecosystemFirm | 65 | 70 | +5 |
| ecosystems | 6 | 6 | +0 (reused existing) |

New firms span a 30–90 maturity spread: Brightpath Advisors (~32%), Summit Ledger
Group (~46%), Harbor & Co CPAs (~62%), Meridian Accounting (~76%), Apex Fiduciary
Partners (~88%).

### Consultant dashboard before → after
- Member firms: **3 → 8**
- Hot divergences: **2 → 9**
- Avg ecosystem score: **75 → 66** (reflects the wider maturity spread)
- Plus 6-month trajectory snapshots for the trend line.

Verified by headless sign-in + screenshot (`/consultants`, demo-consultant account).

## Constraints noted (unchanged from Sprint 1)
- `ConsultantAssignment` is strictly 1:1; `EcosystemFirm.firmCompanyId` and
  `Ecosystem.vendorCompanyId` are unique → true multi-ecosystem / overlapping
  membership requires a schema change (v2). Tracked, not done here.
- Existing benchmark data (vendors / products / firms / scored submissions) was not
  modified — all seeds are additive upserts keyed on `demo-acct-*`.
