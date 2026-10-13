# Anchor pool DRAFT re-import on preview (R66, item 7), 2026-10-13

Target: the preview database (host printed by the shell; no env value appears below). Seven templates with the -pool key suffix, all DRAFT; the five APPROVED legal templates untouched. Migration 20261013120000_module_template_anchor_pool applied first (one additive nullable column, ModuleTemplate.anchorPool).

---- migrate status (preview) ----
Datasource "db": PostgreSQL database "neondb", schema "public" at "ep-wispy-snow-apevna3q-pooler.c-7.us-east-1.aws.neon.tech"
61 migrations found in prisma/migrations
Following migration have not yet been applied:
20261013120000_module_template_anchor_pool
To apply migrations in development run prisma migrate dev.
To apply migrations in production run prisma migrate deploy.

---- migrate deploy (preview) ----
Datasource "db": PostgreSQL database "neondb", schema "public" at "ep-wispy-snow-apevna3q-pooler.c-7.us-east-1.aws.neon.tech"
61 migrations found in prisma/migrations
Applying migration `20261013120000_module_template_anchor_pool`
The following migration(s) have been applied:
migrations/
  └─ 20261013120000_module_template_anchor_pool/
    └─ migration.sql
All migrations have been successfully applied.
---- migrate deploy exit: 0 ----

---- anchor pool drafts (preview) ----
================ ANCHOR POOL DRAFTS — --apply ================
db host: ep-wispy-snow-apevna3q-pooler.c-7.us-east-1.aws.neon.tech
---- legal operating-model (qbank-legal-operating-model-v1-pool) ----
================ IMPORT QBANK v1 — APPLY ================
  Anchor items: 7 (A2, A3, A16, A25, B3, B19, C16)
  Anchor pool: 7 tagged cells (A2:D1:E, A3:D2:M, C16:D3:M, A25:D4:M, B19:D5:E, A16:D6:M, B3:R:M)
Validation OK: 90 items, mix 27/45/18, all sourced.
Import complete: template + 90 items + 95 source rows (all DRAFT).
---- legal automation-ai (qbank-legal-automation-ai-v1-pool) ----
================ IMPORT QBANK v1 — APPLY ================
  Anchor items: 7 (A2, B3, B10, B20, D8, D11, D17)
  Anchor pool: 7 tagged cells (A2:D1:E, B3:D2:E, B20:D3:M, D8:D4:M, D17:D5:H, D11:D6:M, B10:R:M)
Validation OK: 90 items, mix 27/45/18, all sourced.
Import complete: template + 90 items + 91 source rows (all DRAFT).
---- legal data-flow (qbank-legal-data-flow-v1-pool) ----
================ IMPORT QBANK v1 — APPLY ================
  Anchor items: 7 (A1, A23, A24, B6, B11, B14, D18)
  Anchor pool: 7 tagged cells (A1:D1:E, B14:D2:M, B6:D3:M, A23:D4:M, A24:D5:H, B11:D6:H, D18:R:M)
Validation OK: 90 items, mix 27/45/18, all sourced.
Import complete: template + 90 items + 100 source rows (all DRAFT).
---- legal governance (qbank-legal-governance-v1-pool) ----
================ IMPORT QBANK v1 — APPLY ================
  Anchor items: 7 (A2, A9, A11, A12, B8, C8, C18)
  Anchor pool: 7 tagged cells (A2:D1:E, A12:D2:M, B8:D3:E, A9:D4:M, A11:D5:H, C18:D6:M, C8:R:E)
Validation OK: 90 items, mix 27/45/18, all sourced.
Import complete: template + 90 items + 101 source rows (all DRAFT).
---- legal strategy (qbank-legal-strategy-v1-pool) ----
================ IMPORT QBANK v1 — APPLY ================
  Anchor items: 7 (A1, A14, A15, A19, C13, D13, D16)
  Anchor pool: 7 tagged cells (A1:D1:E, A14:D2:M, A19:D3:M, D16:D4:E, A15:D5:M, D13:D6:M, C13:R:M)
Validation OK: 90 items, mix 27/45/18, all sourced.
Import complete: template + 90 items + 103 source rows (all DRAFT).
---- accounting governance (qbank-gov-v1-pool) ----
================ IMPORT QBANK v1 — APPLY ================
  Anchor items: 6 (A9, B8, C8, C19, D6, D17)
  Anchor pool: 6 tagged cells (B8:D1:M, A9:D2:M, D6:D3:M, C8:D4:M, D17:D5:H, C19:R:H)
Validation OK: 90 items, mix 27/45/18, all sourced.
Import complete: template + 90 items + 111 source rows (all DRAFT).
---- accounting integration (qbank-int-v1-pool) ----
================ IMPORT QBANK v1 — APPLY ================
  Anchor items: 6 (A12, B9, C13, C17, D8, D16)
  Anchor pool: 6 tagged cells (C13:D1:M, A12:D2:M, B9:D3:M, D8:D5:M, C17:R:M, D16:R:H)
Validation OK: 90 items, mix 27/45/18, all sourced.
Import complete: template + 90 items + 131 source rows (all DRAFT).
Anchor pool drafts complete (--apply). Every template above is DRAFT with the -pool suffix; the approved templates are untouched.
---- apply exit: 0 ----

---- probe (preview, read only) ----
db host: ep-wispy-snow-apevna3q-pooler.c-7.us-east-1.aws.neon.tech · templates: 12
qbank-gov-v1-pool · DRAFT · accounting · items 90 · isAnchor 6 (A9, B8, C8, C19, D6, D17) · pool B8:D1:M A9:D2:M D6:D3:M C8:D4:M D17:D5:H C19:R:H
qbank-int-v1-pool · DRAFT · accounting · items 90 · isAnchor 6 (A12, B9, C13, C17, D8, D16) · pool C13:D1:M A12:D2:M B9:D3:M D8:D5:M C17:R:M D16:R:H
qbank-legal-automation-ai-v1 · APPROVED · legal · items 90 · isAnchor 6 (A2, B3, B20, D8, D11, D17) · pool untagged (null)
qbank-legal-automation-ai-v1-pool · DRAFT · legal · items 90 · isAnchor 7 (A2, B3, B10, B20, D8, D11, D17) · pool A2:D1:E B3:D2:E B20:D3:M D8:D4:M D17:D5:H D11:D6:M B10:R:M
qbank-legal-data-flow-v1 · APPROVED · legal · items 90 · isAnchor 6 (A1, A23, A24, B6, B11, B14) · pool untagged (null)
qbank-legal-data-flow-v1-pool · DRAFT · legal · items 90 · isAnchor 7 (A1, A23, A24, B6, B11, B14, D18) · pool A1:D1:E B14:D2:M B6:D3:M A23:D4:M A24:D5:H B11:D6:H D18:R:M
qbank-legal-governance-v1 · APPROVED · legal · items 90 · isAnchor 6 (A2, A9, A11, A12, B8, C18) · pool untagged (null)
qbank-legal-governance-v1-pool · DRAFT · legal · items 90 · isAnchor 7 (A2, A9, A11, A12, B8, C8, C18) · pool A2:D1:E A12:D2:M B8:D3:E A9:D4:M A11:D5:H C18:D6:M C8:R:E
qbank-legal-operating-model-v1 · APPROVED · legal · items 90 · isAnchor 6 (A2, A3, A16, A25, B19, C16) · pool untagged (null)
qbank-legal-operating-model-v1-pool · DRAFT · legal · items 90 · isAnchor 7 (A2, A3, A16, A25, B3, B19, C16) · pool A2:D1:E A3:D2:M C16:D3:M A25:D4:M B19:D5:E A16:D6:M B3:R:M
qbank-legal-strategy-v1 · APPROVED · legal · items 90 · isAnchor 6 (A1, A14, A15, A19, D13, D16) · pool untagged (null)
qbank-legal-strategy-v1-pool · DRAFT · legal · items 90 · isAnchor 7 (A14, A1, A15, A19, C13, D13, D16) · pool A1:D1:E A14:D2:M A19:D3:M D16:D4:E A15:D5:M D13:D6:M C13:R:M
env file deleted
