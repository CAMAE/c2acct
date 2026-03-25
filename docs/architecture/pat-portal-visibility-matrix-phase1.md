# PAT Portal Visibility Matrix Phase 1

## Purpose

Phase 1 gives PAT a real portal shell without pretending all portal audiences are already live. The implementation separates:

- public corporate surface: `C2Acct`
- authenticated institutional workspace: `PAT Platform`

## Current resolver

The live resolver maps current runtime data into a first portal audience safely:

- `Company.type = FIRM` -> `firm`
- `Company.type = VENDOR` -> `vendor`
- no company-backed assessment context -> `individual`

This is deliberate. The platform now knows about broader audiences, but it does not fake assignments for `talent`, `hr`, `higher_ed`, `associations`, or `media` until the repo has real identity rules for them.

## Phase 1 matrix

### Firm
- Live now: workspace, survey, results, outputs, profiles
- Hidden: talent, HR, higher-ed, association, media-specific modules
- Planned but shown intentionally: ecosystem map

### Vendor
- Live now: workspace, survey, results, outputs, profiles
- Hidden: firm-irrelevant ecosystem surfaces
- Planned but shown intentionally: ecosystem map

### Individual / Member
- Live now: workspace shell only
- Restricted: no survey/results/outputs unless a company-backed PAT subject exists
- Planned but shown intentionally: member briefing

### Talent
- Planned shell target only
- Planned modules: talent readiness console, member briefing

### HR
- Planned shell target only
- Planned modules: talent readiness console

### Higher Ed
- Planned shell target only
- Planned modules: education-to-practice bridge

### Associations
- Planned shell target only
- Planned modules: ecosystem map, education-to-practice bridge, market intelligence
- Admin may later coexist here, but that is not auto-assigned today

### Media / Influencers
- Planned shell target only
- Planned modules: ecosystem map, market intelligence

## Runtime rules implemented now

- `/platform` is a protected PAT workspace route.
- Enabled nav links are derived from the same visibility matrix used for cards.
- Admin links are only shown to `ADMIN` and `OWNER`.
- Assessment routes remain intact and only appear as enabled when the actor has a company-backed PAT subject.
- Irrelevant surfaces are hidden; relevant but unavailable surfaces are shown as controlled `planned` or `restricted` states.

## Validation note

The root landing page supports audience preview through `/?audience=<portal>` so the visibility matrix can be reviewed without inventing fake routes for unfinished portals.
