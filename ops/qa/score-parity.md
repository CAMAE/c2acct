# Score parity · production (ep-hidden-dream-ap558mrx.c-7.us-east-1.aws.neon.tech) vs preview (ep-wispy-snow-apevna3q.c-7.us-east-1.aws.neon.tech) · 2026-09-11T06:06:36.845Z

Firms in both: 140 (only production: 0; only preview: 0). Products in both: 94 (only production: 0; only preview: 0).
Firm differences: 12; product differences: 2; of which explained by a newer submission on preview: 0.

> Classification (Forge, 2026-09-11): every differing firm is a demo-bench boost firm (demo-bench-firm-*-1-60 … 1-71, the Bridgepath boost cohort) or Demo Company (pat-runtime seed), and both product differences are Bridgepath products reviewed by those firms. Newest-submission dates match on both sides because the 2026-09-10 demo ladder re-run on the preview branch UPSERTS submissions by deterministic id (createdAt kept) while regenerating answers on the v3 registry. Cause: ladder re-seed, not code. Consequence: the boost seed is not score-idempotent across the v2→v3 registry rewrite; deploy night's ladder will move these 12 demo firms' numbers the same way. No pilot/production-boundary row differs.


## Firm differences

| firm | index production→preview | modules | newest submission production / preview | cause |
|---|---|---|---|---|
| Marloch Advisory | 46 → 42 | operating_model: 32→27; automation_ai: 59→52; data_flow: 41→41; governance: 53→46; strategy: —→— | 2026-08-01 / 2026-08-01 | **defect?** |
| Northgate Vane | 47 → 46 | operating_model: 61→57; automation_ai: 43→41; data_flow: 53→53; governance: 32→32; strategy: —→— | 2026-08-01 / 2026-08-01 | **defect?** |
| Oakcliff Reed | 57 → 53 | operating_model: 66→62; automation_ai: 60→53; data_flow: 39→37; governance: 61→61; strategy: —→— | 2026-08-02 / 2026-08-02 | **defect?** |
| Pennywell CPAs | 55 → 54 | operating_model: 49→45; automation_ai: 39→39; data_flow: 67→67; governance: 66→66; strategy: —→— | 2026-08-02 / 2026-08-02 | **defect?** |
| Quarrenton LLP | 75 → 75 | operating_model: 81→81; automation_ai: 85→83; data_flow: 84→84; governance: 67→65; strategy: 60→60 | 2026-08-03 / 2026-08-03 | **defect?** |
| Redhill Marsh | 62 → 61 | operating_model: 46→46; automation_ai: 73→73; data_flow: 52→52; governance: 67→67; strategy: 72→65 | 2026-08-04 / 2026-08-04 | **defect?** |
| Selby Crane | 67 → 64 | operating_model: 72→72; automation_ai: 59→59; data_flow: 72→67; governance: 53→46; strategy: 79→74 | 2026-08-04 / 2026-08-04 | **defect?** |
| Thornwick Group | 69 → 68 | operating_model: 81→81; automation_ai: 74→74; data_flow: 53→53; governance: 79→72; strategy: 60→60 | 2026-08-05 / 2026-08-05 | **defect?** |
| Umberton Vale | 81 → 80 | operating_model: 80→73; automation_ai: 66→66; data_flow: 88→88; governance: 90→90; strategy: 83→83 | 2026-08-05 / 2026-08-05 | **defect?** |
| Westmere Kline | 74 → 72 | operating_model: 61→59; automation_ai: 85→81; data_flow: 66→66; governance: 79→72; strategy: 80→80 | 2026-08-06 / 2026-08-06 | **defect?** |
| Yardley Stone | 76 → 75 | operating_model: 84→84; automation_ai: 71→66; data_flow: 79→79; governance: 61→61; strategy: 83→83 | 2026-08-07 / 2026-08-07 | **defect?** |
| Demo Company | 69 → 79 | operating_model: 84→83; automation_ai: 60→72; data_flow: 59→85; governance: 72→66; strategy: —→90 | 2026-05-27 / 2026-05-27 | **defect?** |

## Product differences

| product | self % | firm-reviewed % | divergence | reviews | newest submission production / preview | cause |
|---|---|---|---|---|---|---|
| Bridgepath Suite · Bridgepath Collaborate | 61→61 | 55.2→54.7 | -5.8→-6.3 | 23→23 | 2026-08-07 / 2026-08-07 | **defect?** |
| Bridgepath Suite · Bridgepath Billing | 60→60 | 55→54.6 | -5→-5.4 | 22→22 | 2026-08-07 / 2026-08-07 | **defect?** |
