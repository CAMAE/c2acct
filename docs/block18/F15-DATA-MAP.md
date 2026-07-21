# F15 — C2Acct Data Integration · Data Map + Rulings

**Block 18 spine. Discovery-first: no schema/code lands before the checkpoint rulings below.**
Status: checkpoint rulings RECEIVED (Mythos, 2026-07-21). F15-0b live probe BLOCKED on credentials.

---

## 1. Current adapter reality (empirical)

The C2Acct integration is **outbound-scaffolded only** — there is **no inbound ingestion** and **no per-record provenance** yet.

- `lib/integrations/c2acct.ts` → `getC2AcctIntegrationState()`: provider `c2acct-six-site`, mode **`manual-fallback`** in this environment (`C2ACCT_SIX_SITE_BASE_URL` + `C2ACCT_SIX_SITE_TOKEN` both unset — confirmed empty in all env sources).
- `buildIntegrationEnvelope("firm-profile" | "vendor-profile", …)` (`firmPat.ts`, `vendorProfileAdapter.ts`) are **export** contracts (PAT → c2acct), not inbound readers.
- `vendorProfileAdapter` carries a profile-level `source: "manual-app-entry" | "c2acct-six-site"` tag — but only at the profile level.
- Write-path models (`SurveySubmission`, `Product`, `Company`) have **no** `source` / `externalId` / `ingestedAt` field. The only provenance today is `Company.dataBoundary` (PRODUCTION / PILOT / DEMO).

## 2. What real data would ground (thin-baseline → grounded)

| Surface | Current limit (file) | Effect of real ingested data |
|---|---|---|
| BattleCard fit-mix | N≥2 review floor (`battleCard.ts`) — the **F11 weak-heavy ceiling** (Meridian 0/0/6) | high/good bands populate; median-anchored mix becomes real |
| Benchmark suppression | N≥5 + 25%-dominance (`benchmarkSuppression.ts`) | real records clear the floor → unsuppressed peer distributions |
| Cohort depth | coarse real/demo pools (`benchmarks.ts`) | cohort N expands; p10–p90 anchors stabilize |

---

## 3. Checkpoint rulings (Mythos, 2026-07-21) — BINDING

### (1) BOUNDARY — new `INTEGRATED` boundary, distinct from PRODUCTION
Machine-ingested data **never pools with user-attested data** — same wall logic as demo/real. Pooling into PRODUCTION is **irreversible contamination**; a separate boundary is reversible (promotion may be ruled later, **per surface**). Cohort/suppression treatment of `INTEGRATED` is decided **per surface, not globally**.

### (2) PROVENANCE — per-record, read-only in PAT
Every ingested record carries: `source` enum (`C2ACCT_SIX_SITE`), `externalId`, `ingestedAt`, `syncBatchId`. Ingested records are **NOT user-mutable** — read-only in PAT; corrections happen **at the source and re-sync**. Identity resolution goes through an **explicit mapping table** (stable-id law / L1 — **never name-derived**, per the demo-rename orphan trap). `INTEGRATED` **never** enters demo pools; any benchmark blending PRODUCTION+INTEGRATED carries disclosure (see 4).

### (3) INBOUND CONTRACT — answer empirically via F15-0b (read-only probe)
With the boundary ruled, F15-0b probes the configured `C2ACCT_SIX_SITE` endpoint read-only: log the response **shape** only, no writes, no schema work, print the contract map. **BLOCKED:** the endpoint is not configured in this environment. The probe tool (`scripts/dev/probe-c2acct-contract.ts`) is ready and runs the moment `C2ACCT_SIX_SITE_BASE_URL` + `C2ACCT_SIX_SITE_TOKEN` are set (Cam's hands, like the Neon/Stripe credentials). Until then the contract shape is unanswered — no schema is guessed from memory.

### (4) TRUST / GOVERNANCE — honesty at the CELL level
Ingested data is always **visibly distinct** on customer surfaces: evidence columns say **"imported"** where they now say "scored" / "firm-reviewed"; ingested records are **never** presented as firm-attested reviews. `/methodology` gains an **ingested-data section** BEFORE any INTEGRATED data reaches a customer surface. The honesty law applies at the **cell level, not the page level**.

---

## 4. Sequenced F15 build (post-probe; each its own gate — NOT started)

- **F15-0b** — read-only endpoint probe → contract map. *(blocked on creds)*
- **F15-1** — `INTEGRATED` boundary + per-record provenance fields (`source`/`externalId`/`ingestedAt`/`syncBatchId`) + the identity **mapping table** (stable-id) — additive migration, LOCAL only, prod migrate = Cam's hands.
- **F15-2** — inbound adapter (activate `c2acct.ts` read path per the probed contract), read-only, INTEGRATED-tagged.
- **F15-3** — ingestion → records with full provenance + mapping resolution; idempotent per `syncBatchId`.
- **F15-4** — cell-level "imported" disclosure across surfaces + `/methodology` ingested-data section (BEFORE any customer exposure); per-surface cohort/suppression treatment of INTEGRATED.
- **F15-5** — grounding verification (fit-mix / suppression / cohort N move vs the §2 baseline).

Front pages OFF-LIMITS. Blocks 16+17 remain dark. Deploy = Cam's call.
