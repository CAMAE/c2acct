# Anchor import validation (R67, item 2), 2026-10-14

Importer dry runs (parse and validate only, no database write) on the seven bank files after the paste. The importer checks: every item parses (code, tier, four options, one key, bracketed source); the flagged anchors equal the header pool; every tagged cell names an item of the stated tier; a code appears once; one code per cell; every source classified against the bank's vertical pack authorities (an unclassified citation fails).

## legal operating-model
```
Items parsed: 97
  Difficulty: E 30 / M 45 / H 22
  Anchor items: 19 (A2, A3, A16, A20, A21, A25, A26, A27, B3, B8, B19, B23, B24, B25, B26, B27, C16, C21, D4)
  Anchor pool: 19 tagged cells (A2:D1:E, D4:D1:M, A20:D1:H, B23:D2:E, A3:D2:M, B8:D2:H, C21:D3:E, C16:D3:M, B24:D3:H, A26:D4:E, A25:D4:M, B25:D4:H, B19:D5:E, A21:D5:M, B26:D5:H, B27:D6:E, A16:D6:M, A27:D6:H, B3:R:M)
Validation OK: 97 items, mix 30/45/22, all sourced.
```

## legal automation-ai
```
Items parsed: 95
  Difficulty: E 31 / M 45 / H 19
  Anchor items: 19 (A2, A20, B3, B10, B13, B20, B23, B27, C16, C21, C23, D8, D11, D13, D17, D20, D21, D22, D23)
  Anchor pool: 19 tagged cells (A2:D1:E, B13:D1:M, B23:D1:H, B3:D2:E, C16:D2:M, D20:D2:H, B27:D3:E, B20:D3:M, C23:D3:H, D21:D4:E, D8:D4:M, A20:D4:H, D22:D5:E, D13:D5:M, D17:D5:H, D23:D6:E, D11:D6:M, C21:D6:H, B10:R:M)
Validation OK: 95 items, mix 31/45/19, all sourced.
```

## legal data-flow
```
Items parsed: 98
  Difficulty: E 30 / M 46 / H 22
  Anchor items: 19 (A1, A3, A6, A23, A24, A25, A26, A27, A28, A29, A30, B6, B11, B14, B21, C19, D7, D18, D21)
  Anchor pool: 19 tagged cells (A1:D1:E, A6:D1:M, A25:D1:H, A26:D2:E, B14:D2:M, A27:D2:H, C19:D3:E, B6:D3:M, B21:D3:H, A28:D4:E, A23:D4:M, A29:D4:H, D7:D5:E, D21:D5:M, A24:D5:H, A30:D6:E, A3:D6:M, B11:D6:H, D18:R:M)
Validation OK: 98 items, mix 30/46/22, all sourced.
```

## legal governance
```
Items parsed: 98
  Difficulty: E 30 / M 46 / H 22
  Anchor items: 19 (A2, A4, A9, A11, A12, A23, A24, A25, A26, A27, B8, B17, C8, C18, C25, C26, D13, D18, D19)
  Anchor pool: 19 tagged cells (A2:D1:E, B17:D1:M, D18:D1:H, A23:D2:E, A12:D2:M, A24:D2:H, B8:D3:E, A25:D3:M, A26:D3:H, D13:D4:E, A9:D4:M, C25:D4:H, A27:D5:E, A4:D5:M, A11:D5:H, C26:D6:E, C18:D6:M, D19:D6:H, C8:R:E)
Validation OK: 98 items, mix 30/46/22, all sourced.
```

## legal strategy
```
Items parsed: 94
  Difficulty: E 28 / M 45 / H 21
  Anchor items: 19 (A1, A9, A14, A15, A17, A18, A19, A23, C6, C13, D1, D2, D4, D5, D13, D16, D25, D26, D27)
  Anchor pool: 19 tagged cells (A1:D1:E, A17:D1:M, A9:D1:H, D5:D2:E, A14:D2:M, C6:D2:H, D1:D3:E, A19:D3:M, D25:D3:H, D16:D4:E, D4:D4:M, A23:D4:H, D2:D5:E, A15:D5:M, A18:D5:H, D26:D6:E, D13:D6:M, D27:D6:H, C13:R:M)
Validation OK: 94 items, mix 28/45/21, all sourced.
```

## accounting governance
```
Items parsed: 92
  Difficulty: E 28 / M 46 / H 18
  Anchor items: 19 (A5, A9, A22, A24, B8, B9, B23, B24, C4, C7, C8, C19, C23, D1, D4, D6, D15, D16, D17)
  Anchor pool: 19 tagged cells (C7:D1:E, B8:D1:M, B23:D1:H, C4:D2:E, A9:D2:M, A22:D2:H, D1:D3:E, D6:D3:M, D15:D3:H, A5:D4:E, C8:D4:M, A24:D4:H, D4:D5:E, B9:D5:M, D17:D5:H, C23:D6:E, B24:D6:M, D16:D6:H, C19:R:H)
Validation OK: 92 items, mix 28/46/18, all sourced.
```

## accounting integration
```
Items parsed: 93
  Difficulty: E 28 / M 46 / H 19
  Anchor items: 20 (A1, A2, A5, A8, A12, A13, A21, A26, A27, A28, B5, B9, B19, B21, C17, D4, D8, D16, D17, D19)
  Anchor pool: 20 tagged cells (A1:D1:E, A13:D1:M, D19:D1:H, A26:D2:E, A12:D2:M, B19:D2:H, B5:D3:E, B9:D3:M, B21:D3:H, A5:D4:E, A27:D4:M, A28:D4:H, D4:D5:E, D8:D5:M, D17:D5:H, A2:D6:E, A8:D6:M, A21:D6:H, C17:R:M, D16:R:H)
Validation OK: 93 items, mix 28/46/19, all sourced.
```
