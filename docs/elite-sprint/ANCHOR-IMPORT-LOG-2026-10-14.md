# Anchor import on preview (R67, items 4 to 6), 2026-10-14

Target: the preview database (host printed by the shell; no env value appears below). The seven -pool DRAFT templates from Box D are replaced by the grown banks (same keys, upsert); the five APPROVED legal templates are not touched. Then the read-only continuity script prints the served six per template for three seeds and the APPROVED six beside the DRAFT twin's.

---- anchor pool drafts (preview, --apply) ----
================ ANCHOR POOL DRAFTS — --apply ================
db host: ep-wispy-snow-apevna3q-pooler.c-7.us-east-1.aws.neon.tech
---- legal operating-model (qbank-legal-operating-model-v1-pool) ----
================ IMPORT QBANK v1 — APPLY ================
Items parsed: 97
  Anchor pool: 19 tagged cells (A2:D1:E, D4:D1:M, A20:D1:H, B23:D2:E, A3:D2:M, B8:D2:H, C21:D3:E, C16:D3:M, B24:D3:H, A26:D4:E, A25:D4:M, B25:D4:H, B19:D5:E, A21:D5:M, B26:D5:H, B27:D6:E, A16:D6:M, A27:D6:H, B3:R:M)
Validation OK: 97 items, mix 30/45/22, all sourced.
Import complete: template + 97 items + 105 source rows (all DRAFT).
---- legal automation-ai (qbank-legal-automation-ai-v1-pool) ----
================ IMPORT QBANK v1 — APPLY ================
Items parsed: 95
  Anchor pool: 19 tagged cells (A2:D1:E, B13:D1:M, B23:D1:H, B3:D2:E, C16:D2:M, D20:D2:H, B27:D3:E, B20:D3:M, C23:D3:H, D21:D4:E, D8:D4:M, A20:D4:H, D22:D5:E, D13:D5:M, D17:D5:H, D23:D6:E, D11:D6:M, C21:D6:H, B10:R:M)
Validation OK: 95 items, mix 31/45/19, all sourced.
Import complete: template + 95 items + 97 source rows (all DRAFT).
---- legal data-flow (qbank-legal-data-flow-v1-pool) ----
================ IMPORT QBANK v1 — APPLY ================
Items parsed: 98
  Anchor pool: 19 tagged cells (A1:D1:E, A6:D1:M, A25:D1:H, A26:D2:E, B14:D2:M, A27:D2:H, C19:D3:E, B6:D3:M, B21:D3:H, A28:D4:E, A23:D4:M, A29:D4:H, D7:D5:E, D21:D5:M, A24:D5:H, A30:D6:E, A3:D6:M, B11:D6:H, D18:R:M)
Validation OK: 98 items, mix 30/46/22, all sourced.
Import complete: template + 98 items + 111 source rows (all DRAFT).
---- legal governance (qbank-legal-governance-v1-pool) ----
================ IMPORT QBANK v1 — APPLY ================
Items parsed: 98
  Anchor pool: 19 tagged cells (A2:D1:E, B17:D1:M, D18:D1:H, A23:D2:E, A12:D2:M, A24:D2:H, B8:D3:E, A25:D3:M, A26:D3:H, D13:D4:E, A9:D4:M, C25:D4:H, A27:D5:E, A4:D5:M, A11:D5:H, C26:D6:E, C18:D6:M, D19:D6:H, C8:R:E)
Validation OK: 98 items, mix 30/46/22, all sourced.
Import complete: template + 98 items + 112 source rows (all DRAFT).
---- legal strategy (qbank-legal-strategy-v1-pool) ----
================ IMPORT QBANK v1 — APPLY ================
Items parsed: 94
  Anchor pool: 19 tagged cells (A1:D1:E, A17:D1:M, A9:D1:H, D5:D2:E, A14:D2:M, C6:D2:H, D1:D3:E, A19:D3:M, D25:D3:H, D16:D4:E, D4:D4:M, A23:D4:H, D2:D5:E, A15:D5:M, A18:D5:H, D26:D6:E, D13:D6:M, D27:D6:H, C13:R:M)
Validation OK: 94 items, mix 28/45/21, all sourced.
Import complete: template + 94 items + 108 source rows (all DRAFT).
---- accounting governance (qbank-gov-v1-pool) ----
================ IMPORT QBANK v1 — APPLY ================
Items parsed: 92
  Anchor pool: 19 tagged cells (C7:D1:E, B8:D1:M, B23:D1:H, C4:D2:E, A9:D2:M, A22:D2:H, D1:D3:E, D6:D3:M, D15:D3:H, A5:D4:E, C8:D4:M, A24:D4:H, D4:D5:E, B9:D5:M, D17:D5:H, C23:D6:E, B24:D6:M, D16:D6:H, C19:R:H)
Validation OK: 92 items, mix 28/46/18, all sourced.
Import complete: template + 92 items + 115 source rows (all DRAFT).
---- accounting integration (qbank-int-v1-pool) ----
================ IMPORT QBANK v1 — APPLY ================
Items parsed: 93
  Anchor pool: 20 tagged cells (A1:D1:E, A13:D1:M, D19:D1:H, A26:D2:E, A12:D2:M, B19:D2:H, B5:D3:E, B9:D3:M, B21:D3:H, A5:D4:E, A27:D4:M, A28:D4:H, D4:D5:E, D8:D5:M, D17:D5:H, A2:D6:E, A8:D6:M, A21:D6:H, C17:R:M, D16:R:H)
Validation OK: 93 items, mix 28/46/19, all sourced.
Import complete: template + 93 items + 137 source rows (all DRAFT).
Anchor pool drafts complete (--apply). Every template above is DRAFT with the -pool suffix; the approved templates are untouched.
---- apply exit: 0 ----

---- continuity (preview, read only) ----
db host: ep-wispy-snow-apevna3q-pooler.c-7.us-east-1.aws.neon.tech · templates: 12

== served six per template, three seeds ==
qbank-gov-v1-pool · DRAFT · 92 items · 19 cells
  seed coverage  → C7:D1:E A9:D2:M D6:D3:M A5:D4:E B9:D5:M D16:D6:H · E2 M3 H1 · one per driver · shortfall E0 M0 H0
  seed firm#1    → B8:D1:M A22:D2:H D6:D3:M C8:D4:M D4:D5:E C23:D6:E · E2 M3 H1 · one per driver · shortfall E0 M0 H0
  seed firm#2    → B23:D1:H C4:D2:E D6:D3:M C8:D4:M D4:D5:E B24:D6:M · E2 M3 H1 · one per driver · shortfall E0 M0 H0
qbank-int-v1-pool · DRAFT · 93 items · 20 cells
  seed coverage  → A1:D1:E A12:D2:M B9:D3:M A5:D4:E D8:D5:M A21:D6:H · E2 M3 H1 · one per driver · shortfall E0 M0 H0
  seed firm#1    → A13:D1:M B19:D2:H B9:D3:M A27:D4:M D4:D5:E A2:D6:E · E2 M3 H1 · one per driver · shortfall E0 M0 H0
  seed firm#2    → D19:D1:H A26:D2:E B9:D3:M A27:D4:M D4:D5:E A8:D6:M · E2 M3 H1 · one per driver · shortfall E0 M0 H0
qbank-legal-automation-ai-v1 · APPROVED · 90 items · untagged
  seed coverage  → A2:E B3:E B20:M D8:M D11:M D17:H · E2 M3 H1 · uncovered D1,D2,D3,D4,D5,D6 · shortfall E0 M0 H0
  seed firm#1    → A2:E B3:E B20:M D8:M D11:M D17:H · E2 M3 H1 · uncovered D1,D2,D3,D4,D5,D6 · shortfall E0 M0 H0
  seed firm#2    → A2:E B3:E B20:M D8:M D11:M D17:H · E2 M3 H1 · uncovered D1,D2,D3,D4,D5,D6 · shortfall E0 M0 H0
qbank-legal-automation-ai-v1-pool · DRAFT · 95 items · 19 cells
  seed coverage  → A2:D1:E C16:D2:M B20:D3:M D21:D4:E D13:D5:M C21:D6:H · E2 M3 H1 · one per driver · shortfall E0 M0 H0
  seed firm#1    → B13:D1:M D20:D2:H B20:D3:M D8:D4:M D22:D5:E D23:D6:E · E2 M3 H1 · one per driver · shortfall E0 M0 H0
  seed firm#2    → B23:D1:H B3:D2:E B20:D3:M D8:D4:M D22:D5:E D11:D6:M · E2 M3 H1 · one per driver · shortfall E0 M0 H0
qbank-legal-data-flow-v1 · APPROVED · 90 items · untagged
  seed coverage  → A1:E A23:M A24:H B6:M B11:H B14:M · E1 M3 H2 · uncovered D1,D2,D3,D4,D5,D6 · shortfall E1 M0 H0
  seed firm#1    → A1:E A23:M A24:H B6:M B11:H B14:M · E1 M3 H2 · uncovered D1,D2,D3,D4,D5,D6 · shortfall E1 M0 H0
  seed firm#2    → A1:E A23:M A24:H B6:M B11:H B14:M · E1 M3 H2 · uncovered D1,D2,D3,D4,D5,D6 · shortfall E1 M0 H0
qbank-legal-data-flow-v1-pool · DRAFT · 98 items · 19 cells
  seed coverage  → A1:D1:E B14:D2:M B6:D3:M A28:D4:E D21:D5:M B11:D6:H · E2 M3 H1 · one per driver · shortfall E0 M0 H0
  seed firm#1    → A6:D1:M A27:D2:H B6:D3:M A23:D4:M D7:D5:E A30:D6:E · E2 M3 H1 · one per driver · shortfall E0 M0 H0
  seed firm#2    → A25:D1:H A26:D2:E B6:D3:M A23:D4:M D7:D5:E A3:D6:M · E2 M3 H1 · one per driver · shortfall E0 M0 H0
qbank-legal-governance-v1 · APPROVED · 90 items · untagged
  seed coverage  → A2:E A9:M A11:H A12:M B8:E C18:M · E2 M3 H1 · uncovered D1,D2,D3,D4,D5,D6 · shortfall E0 M0 H0
  seed firm#1    → A2:E A9:M A11:H A12:M B8:E C18:M · E2 M3 H1 · uncovered D1,D2,D3,D4,D5,D6 · shortfall E0 M0 H0
  seed firm#2    → A2:E A9:M A11:H A12:M B8:E C18:M · E2 M3 H1 · uncovered D1,D2,D3,D4,D5,D6 · shortfall E0 M0 H0
qbank-legal-governance-v1-pool · DRAFT · 98 items · 19 cells
  seed coverage  → A2:D1:E A12:D2:M A25:D3:M D13:D4:E A4:D5:M D19:D6:H · E2 M3 H1 · one per driver · shortfall E0 M0 H0
  seed firm#1    → B17:D1:M A24:D2:H A25:D3:M A9:D4:M A27:D5:E C26:D6:E · E2 M3 H1 · one per driver · shortfall E0 M0 H0
  seed firm#2    → D18:D1:H A23:D2:E A25:D3:M A9:D4:M A27:D5:E C18:D6:M · E2 M3 H1 · one per driver · shortfall E0 M0 H0
qbank-legal-operating-model-v1 · APPROVED · 90 items · untagged
  seed coverage  → A2:E A3:M A16:M A25:M B19:E C16:M · E2 M4 H0 · uncovered D1,D2,D3,D4,D5,D6 · shortfall E0 M0 H1
  seed firm#1    → A2:E A3:M A16:M A25:M B19:E C16:M · E2 M4 H0 · uncovered D1,D2,D3,D4,D5,D6 · shortfall E0 M0 H1
  seed firm#2    → A2:E A3:M A16:M A25:M B19:E C16:M · E2 M4 H0 · uncovered D1,D2,D3,D4,D5,D6 · shortfall E0 M0 H1
qbank-legal-operating-model-v1-pool · DRAFT · 97 items · 19 cells
  seed coverage  → A2:D1:E A3:D2:M C16:D3:M A26:D4:E A21:D5:M A27:D6:H · E2 M3 H1 · one per driver · shortfall E0 M0 H0
  seed firm#1    → D4:D1:M B8:D2:H C16:D3:M A25:D4:M B19:D5:E B27:D6:E · E2 M3 H1 · one per driver · shortfall E0 M0 H0
  seed firm#2    → A20:D1:H B23:D2:E C16:D3:M A25:D4:M B19:D5:E A16:D6:M · E2 M3 H1 · one per driver · shortfall E0 M0 H0
qbank-legal-strategy-v1 · APPROVED · 90 items · untagged
  seed coverage  → A1:E A14:M A15:M A19:M D13:M D16:E · E2 M4 H0 · uncovered D1,D2,D3,D4,D5,D6 · shortfall E0 M0 H1
  seed firm#1    → A1:E A14:M A15:M A19:M D13:M D16:E · E2 M4 H0 · uncovered D1,D2,D3,D4,D5,D6 · shortfall E0 M0 H1
  seed firm#2    → A1:E A14:M A15:M A19:M D13:M D16:E · E2 M4 H0 · uncovered D1,D2,D3,D4,D5,D6 · shortfall E0 M0 H1
qbank-legal-strategy-v1-pool · DRAFT · 94 items · 19 cells
  seed coverage  → A1:D1:E A14:D2:M A19:D3:M D16:D4:E A15:D5:M D27:D6:H · E2 M3 H1 · one per driver · shortfall E0 M0 H0
  seed firm#1    → A17:D1:M C6:D2:H A19:D3:M D4:D4:M D2:D5:E D26:D6:E · E2 M3 H1 · one per driver · shortfall E0 M0 H0
  seed firm#2    → A9:D1:H D5:D2:E A19:D3:M D4:D4:M D2:D5:E D13:D6:M · E2 M3 H1 · one per driver · shortfall E0 M0 H0

== continuity: APPROVED served six beside the DRAFT -pool twin (seed coverage) ==
qbank-legal-automation-ai-v1 (APPROVED, E2 M3 H1): A2:E B3:E B20:M D8:M D11:M D17:H
  qbank-legal-automation-ai-v1-pool (DRAFT, E2 M3 H1): A2:D1:E C16:D2:M B20:D3:M D21:D4:E D13:D5:M C21:D6:H
  change: +C16,D21,D13,C21 -B3,D8,D11,D17
qbank-legal-data-flow-v1 (APPROVED, E1 M3 H2): A1:E A23:M A24:H B6:M B11:H B14:M
  qbank-legal-data-flow-v1-pool (DRAFT, E2 M3 H1): A1:D1:E B14:D2:M B6:D3:M A28:D4:E D21:D5:M B11:D6:H
  change: +A28,D21 -A23,A24
qbank-legal-governance-v1 (APPROVED, E2 M3 H1): A2:E A9:M A11:H A12:M B8:E C18:M
  qbank-legal-governance-v1-pool (DRAFT, E2 M3 H1): A2:D1:E A12:D2:M A25:D3:M D13:D4:E A4:D5:M D19:D6:H
  change: +A25,D13,A4,D19 -A9,A11,B8,C18
qbank-legal-operating-model-v1 (APPROVED, E2 M4 H0): A2:E A3:M A16:M A25:M B19:E C16:M
  qbank-legal-operating-model-v1-pool (DRAFT, E2 M3 H1): A2:D1:E A3:D2:M C16:D3:M A26:D4:E A21:D5:M A27:D6:H
  change: +A26,A21,A27 -A16,A25,B19
qbank-legal-strategy-v1 (APPROVED, E2 M4 H0): A1:E A14:M A15:M A19:M D13:M D16:E
  qbank-legal-strategy-v1-pool (DRAFT, E2 M3 H1): A1:D1:E A14:D2:M A19:D3:M D16:D4:E A15:D5:M D27:D6:H
  change: +D27 -D13
env file deleted
