# Guard v2 remaining losses — HEAD vs ops/qa/baseline-inventory.json (0157d40f + production flags)

Generated 2026-09-14 (final: flags-off from the 08:05 run, flags-as-preview from the 09:23 run, both on the eea310c6 standalone with ops/qa/link-removals.json at 36 rulings) from the guard's own log (pnpm guard:doors). Dispositions: restore-by-composition, ruling-needed, vehicle.

## flags-off: GREEN — every production control survives (3 of 3 tests passed, 987 pairs compared, 38 min crawl)

## flags-as-preview: 10 controls lost on 10 route × identity pairs, 10 (identity, control) groups, 987 pairs compared

Totals by disposition: ruling-needed 10

| routes | identity | control | disposition | reading |
|---|---|---|---|---|
| 1 (e.g. /sign-in/firm) | admin | link "Membership" → /firm/membership [shell] | ruling-needed | unclassified — see route |
| 1 (e.g. /sign-in/vendor) | admin | link "Membership" → /vendor/membership [shell] | ruling-needed | unclassified — see route |
| 1 (e.g. /sign-in/firm) | consultant | link "Membership" → /firm/membership [shell] | ruling-needed | unclassified — see route |
| 1 (e.g. /sign-in/vendor) | consultant | link "Membership" → /vendor/membership [shell] | ruling-needed | unclassified — see route |
| 1 (e.g. /sign-in/vendor) | firm-elite | link "Membership" → /vendor/membership [shell] | ruling-needed | unclassified — see route |
| 1 (e.g. /sign-in/vendor) | firm-pro | link "Membership" → /vendor/membership [shell] | ruling-needed | unclassified — see route |
| 1 (e.g. /sign-in/firm) | public | link "Membership" → /firm/membership [shell] | ruling-needed | unclassified — see route |
| 1 (e.g. /sign-in/vendor) | public | link "Membership" → /vendor/membership [shell]: expected [ …(10) ] to deeply equal [] | ruling-needed | unclassified — see route |
| 1 (e.g. /sign-in/firm) | vendor-elite | link "Membership" → /firm/membership [shell] | ruling-needed | unclassified — see route |
| 1 (e.g. /sign-in/firm) | vendor-pro | link "Membership" → /firm/membership [shell] | ruling-needed | unclassified — see route |
