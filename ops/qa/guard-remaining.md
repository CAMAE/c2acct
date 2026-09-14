# Guard v2 remaining losses — HEAD vs ops/qa/baseline-inventory.json (0157d40f + production flags)

Generated 2026-09-14 from the guard's own logs (pnpm guard:doors): flags-off from the 08:05 run, flags-as-preview from the 09:23 run, both on the eea310c6 standalone, ops/qa/link-removals.json at 36 rulings (each quoting Cam 9/14 "all as recommended" or the prior ruling it applies). Dispositions used across box 2b: restore-by-composition, ruling-needed, vehicle.

## flags-off: GREEN — every production control survives (3 of 3 tests passed, 987 pairs compared, 38-minute crawl)

## flags-as-preview: GREEN — every production control survives (3 of 3 tests passed, 987 pairs compared, 39-minute crawl)

## What closed the box 2 queue

| group (box 2 count) | disposition applied |
|---|---|
| signed-out V7 nav menu (1,120) | restore-by-composition — SignedOutHeaderMenu on the V7 shell |
| "Open home" logo name (93) | restore — aria-label on the V7 logo link |
| Trust center link (63) | restore — TrustSurfacePage unconditional (flag-off), TrustSurfaceV7 header (flag-on); V7 pages wrapped in a main landmark |
| trust policy cards (8) | restore-by-composition — TrustSurfaceCards under the V7 /trust; voice rewrite normalized |
| sign-in form for signed-in identities (88) | vehicle — excluded on /sign-in routes for every identity |
| vendor list Completed/Existing drift, 404 cards, admin/consultant briefing lists, one-page toggles, home path cards, battlecard rows, Uneven maturity, FREE retirement, pilot rows, user-insight redirect, role sign-in redirects | rulings in ops/qa/link-removals.json, or normalization where the same door carries a new name |
| whole-page shell losses, blank captures, pool 500s | crawler retries and the shell-as-one-component rule; orphaned Prisma engines reaped before each set |
