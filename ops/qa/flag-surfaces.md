# PAT_ENABLE_* surface table (box 1b item 5; register B1/B2)

Production scope: PAT_ENABLE_ALIGNMENT_BOARD, PAT_ENABLE_BATTLECARD, PAT_ENABLE_CONSULTANT_ACCESS, PAT_ENABLE_PAT_ASSISTANT, PAT_ENABLE_PINGS, PAT_ENABLE_SELF_SIGNUP (all =1, derived). Preview scope: Production + PAT_ENABLE_NEW_FRONT_DOOR=1, PAT_ENABLE_FOLLOWUP_MC=1, PAT_ENABLE_REGISTRY_MEMO=1.

| flag | read sites (file:line) | surface gated | in Production | in Preview |
|---|---|---|---|---|
| PAT_ENABLE_ADAPTIVE_MODULES | lib/modules/unlock.ts:24 | lib gate (read by pages/components) | N | N |
| PAT_ENABLE_AGENT_NARRATIVES | lib/reportNarrative.ts:23 | lib gate (read by pages/components) | N | N |
| PAT_ENABLE_ALIGNMENT_BOARD | lib/alignmentBoard.ts:33 | lib gate (read by pages/components) | Y | Y |
| PAT_ENABLE_ASSOCIATION_PORTAL | lib/platformRollout.ts:52 | lib gate (read by pages/components) | N | N |
| PAT_ENABLE_BATTLECARD | lib/battleCard.ts:167 | lib gate (read by pages/components) | Y | Y |
| PAT_ENABLE_CONSULTANT_ACCESS | lib/consultantAccess.ts:11 | lib gate (read by pages/components) | Y | Y |
| PAT_ENABLE_DEV_PREVIEW | lib/devPreview.ts:5 | lib gate (read by pages/components) | N | N |
| PAT_ENABLE_ECOSYSTEM_MAP | lib/platformRollout.ts:48 | lib gate (read by pages/components) | N | N |
| PAT_ENABLE_FOLLOWUP_MC | lib/followUpMc.ts:10 | lib gate (read by pages/components) | N | Y |
| PAT_ENABLE_HIGHER_ED_PORTAL | lib/platformRollout.ts:51 | lib gate (read by pages/components) | N | N |
| PAT_ENABLE_HR_PORTAL | lib/platformRollout.ts:50 | lib gate (read by pages/components) | N | N |
| PAT_ENABLE_INDIVIDUAL_SURFACES | lib/pilotSurfaces.ts:1 | lib gate (read by pages/components) | N | N |
| PAT_ENABLE_INVITEE_ACCESS | lib/invitee/access.ts:71 | lib gate (read by pages/components) | N | N |
| PAT_ENABLE_INVITEE_SURFACES | lib/pilotSurfaces.ts:2 | lib gate (read by pages/components) | N | N |
| PAT_ENABLE_LOCAL_GITHUB_AUTH | lib/auth/env.ts:170<br>lib/auth/env.ts:198<br>lib/auth/runtime.ts:58 | lib gate (read by pages/components) | N | N |
| PAT_ENABLE_LOCAL_REVIEW_AUTH | app/(public)/sign-in/page.tsx:58<br>lib/auth/localReview.ts:11<br>lib/auth/runtime.ts:59 | lib gate (read by pages/components), page | N | N |
| PAT_ENABLE_MEDIA_PORTAL | lib/platformRollout.ts:53 | lib gate (read by pages/components) | N | N |
| PAT_ENABLE_MEMBER_BRIEFING | lib/platformRollout.ts:54 | lib gate (read by pages/components) | N | N |
| PAT_ENABLE_MEMBER_WORKSPACE | lib/platformRollout.ts:47 | lib gate (read by pages/components) | N | N |
| PAT_ENABLE_MODULE_ORDER_ROTATION | lib/moduleOrderRotation.ts:47 | lib gate (read by pages/components) | N | N |
| PAT_ENABLE_NEW_FRONT_DOOR | app/globals.css:889<br>lib/frontDoor.ts:8 | lib gate (read by pages/components), stylesheet | N | Y |
| PAT_ENABLE_PAT_ASSISTANT | app/components/pat/MeetPatContent.tsx:51<br>app/components/pat/MeetPatContent.tsx:84<br>lib/patAssistant/flags.ts:16 | component, lib gate (read by pages/components) | Y | Y |
| PAT_ENABLE_PAT_LADDER | lib/patAssistant/flags.ts:30 | lib gate (read by pages/components) | N | N |
| PAT_ENABLE_PAT_WEB_TIER | lib/patAssistant/flags.ts:40 | lib gate (read by pages/components) | N | N |
| PAT_ENABLE_PINGS | lib/patAssistant/flags.ts:17 | lib gate (read by pages/components) | Y | Y |
| PAT_ENABLE_PUBLIC_TIER | lib/patAssistant/flags.ts:53 | lib gate (read by pages/components) | N | N |
| PAT_ENABLE_REGISTRY_MEMO | lib/firmPat.ts:505 | lib gate (read by pages/components) | N | Y |
| PAT_ENABLE_SALES_CARD | lib/battleCard.ts:173 | lib gate (read by pages/components) | N | N |
| PAT_ENABLE_SELF_SIGNUP | lib/selfSignup.ts:30 | lib gate (read by pages/components) | Y | Y |
| PAT_ENABLE_STALENESS_ALERTS | lib/patAssistant/flags.ts:20 | lib gate (read by pages/components) | N | N |
| PAT_ENABLE_TALENT_PORTAL | lib/platformRollout.ts:49 | lib gate (read by pages/components) | N | N |
| PAT_ENABLE_VENDOR_CORE | lib/platformRollout.ts:46 | lib gate (read by pages/components) | N | N |
| PAT_ENABLE_VERTICAL_PACKS | lib/verticals/flag.ts:19 | lib gate (read by pages/components) | N | N |

## DECISION NEEDED — flags read in code but present in neither scope (fail-closed today)

- PAT_ENABLE_ADAPTIVE_MODULES: lib/modules/unlock.ts
- PAT_ENABLE_AGENT_NARRATIVES: lib/reportNarrative.ts
- PAT_ENABLE_ASSOCIATION_PORTAL: lib/platformRollout.ts
- PAT_ENABLE_DEV_PREVIEW: lib/devPreview.ts
- PAT_ENABLE_ECOSYSTEM_MAP: lib/platformRollout.ts
- PAT_ENABLE_HIGHER_ED_PORTAL: lib/platformRollout.ts
- PAT_ENABLE_HR_PORTAL: lib/platformRollout.ts
- PAT_ENABLE_INDIVIDUAL_SURFACES: lib/pilotSurfaces.ts
- PAT_ENABLE_INVITEE_ACCESS: lib/invitee/access.ts
- PAT_ENABLE_INVITEE_SURFACES: lib/pilotSurfaces.ts
- PAT_ENABLE_LOCAL_GITHUB_AUTH: lib/auth/env.ts, lib/auth/runtime.ts
- PAT_ENABLE_LOCAL_REVIEW_AUTH: app/(public)/sign-in/page.tsx, lib/auth/localReview.ts, lib/auth/runtime.ts
- PAT_ENABLE_MEDIA_PORTAL: lib/platformRollout.ts
- PAT_ENABLE_MEMBER_BRIEFING: lib/platformRollout.ts
- PAT_ENABLE_MEMBER_WORKSPACE: lib/platformRollout.ts
- PAT_ENABLE_MODULE_ORDER_ROTATION: lib/moduleOrderRotation.ts
- PAT_ENABLE_PAT_LADDER: lib/patAssistant/flags.ts
- PAT_ENABLE_PAT_WEB_TIER: lib/patAssistant/flags.ts
- PAT_ENABLE_PUBLIC_TIER: lib/patAssistant/flags.ts
- PAT_ENABLE_SALES_CARD: lib/battleCard.ts
- PAT_ENABLE_STALENESS_ALERTS: lib/patAssistant/flags.ts
- PAT_ENABLE_TALENT_PORTAL: lib/platformRollout.ts
- PAT_ENABLE_VENDOR_CORE: lib/platformRollout.ts
- PAT_ENABLE_VERTICAL_PACKS: lib/verticals/flag.ts
