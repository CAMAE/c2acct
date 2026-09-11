# Form fields by label · A2-fields → C-fields


Reading (Forge, 2026-09-11, box 1b item 2). A2-fields = 0157d40f + production flags (:3021); C-fields = HEAD e1dc9578 + Preview flags (:3023), both from bash launchers (a zsh launch leaves the flag list unsplit and every flag off — the first C-fields pass was discarded for that reason). The count rises 299 → 834 because PAT_ENABLE_FOLLOWUP_MC renders every follow-up option as a radio/checkbox field. The 17 MISSING fields fall into three groups, none of them crawler noise:
1. Survey open-ended textareas (5, /survey/firm_alignment_strategy_v1 · firm-pro): replaced by option sets under PAT_ENABLE_FOLLOWUP_MC — by design (register 6, Leslie's option-set decisions still pending). RULING NEEDED.
2. "Payment details" textarea [name=paymentDetails] (6: /firm/admin, /vendor/admin, /vendor/profile × pro/elite): absent flag-on. Not in ops/qa/intended-changes.json. RULING NEEDED — loss candidate.
3. Ask Pat bar input "Ask Pat…" (6: /create-account × 5 identities; /firm/product-assessments/demo-… × 1): absent flag-on on those routes only; the bar is present on every other route. RULING NEEDED — loss candidate (V7 public shell on /create-account?).

route × identity pairs compared: 112; fields in A2-fields: 299; in C-fields: 834; MISSING in C-fields: 17; RELABELED: 0

### /create-account · admin  (status 200 → 200; 1 fields → 0)
- MISSING in C-fields: text "ask pat…"

### /create-account · firm-elite  (status 200 → 200; 1 fields → 0)
- MISSING in C-fields: text "ask pat…"

### /firm/admin · firm-elite  (status 200 → 200; 11 fields → 12)
- MISSING in C-fields: textarea "payment details" [name=paymentDetails]

### /firm/product-assessments/demo-… · firm-elite  (status 404 → 404; 1 fields → 0)
- MISSING in C-fields: text "ask pat…"

### /create-account · firm-pro  (status 200 → 200; 1 fields → 0)
- MISSING in C-fields: text "ask pat…"

### /firm/admin · firm-pro  (status 200 → 200; 11 fields → 12)
- MISSING in C-fields: textarea "payment details" [name=paymentDetails]

### /survey/firm_alignment_strategy_v1 · firm-pro  (status 200 → 200; 6 fields → 61)
- MISSING in C-fields: textarea "describe the priority and where execution breaks down."
- MISSING in C-fields: textarea "name the point in the change cycle where momentum usually drops."
- MISSING in C-fields: textarea "explain the pressure and how it is changing current decisions."
- MISSING in C-fields: textarea "focus on the risk with the highest near-term consequence."
- MISSING in C-fields: textarea "describe the concrete signal or condition you would look for."

### /create-account · vendor-elite  (status 200 → 200; 1 fields → 0)
- MISSING in C-fields: text "ask pat…"

### /vendor/admin · vendor-elite  (status 200 → 200; 9 fields → 10)
- MISSING in C-fields: textarea "payment details" [name=paymentDetails]

### /vendor/profile · vendor-elite  (status 200 → 200; 9 fields → 10)
- MISSING in C-fields: textarea "payment details" [name=paymentDetails]

### /create-account · vendor-pro  (status 200 → 200; 1 fields → 0)
- MISSING in C-fields: text "ask pat…"

### /vendor/admin · vendor-pro  (status 200 → 200; 9 fields → 10)
- MISSING in C-fields: textarea "payment details" [name=paymentDetails]

### /vendor/profile · vendor-pro  (status 200 → 200; 9 fields → 10)
- MISSING in C-fields: textarea "payment details" [name=paymentDetails]

