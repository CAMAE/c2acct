# AUDIT-WS11-001 — Action Roadmap vendor-actionable library

**Status:** Closed in WS11-F on 2026-05-18.
**Filed:** 2026-05-17 during WS10-A.

## Problem

Vendor brief Section 6 currently renders actions like "Get more individual PAT submissions" — PAT-meta tasks that ask the consultant to do PAT work, not vendor-aligned actions that help the vendor better align their product with their firms. Cam's framing: "this should be in the focus, in the frame of helping the vendor better align their product."

## Fix

Rebuild `lib/actionRoadmapLibrary.ts` (which doesn't exist yet — only `lib/perFirmQuestionLibrary.ts` did the WS5 work for Section 4). Author ~20-30 vendor-actionable templates keyed by score-delta band + capability area. Each template returns a 30/60/90/Q4 action that the vendor (not the consultant, not PAT) could take to better serve the firm.

Examples of good vendor-actionable templates:
- "Schedule pre-renewal call with {firm} to walk through {capability} delta evidence"
- "Roadmap {capability} integration depth for {firm}'s rollout plan by {date}"
- "Bring {firm}'s specific {capability} concerns into the next quarterly product review"

Examples of bad PAT-meta templates (current state):
- "Get more individual PAT submissions" (asks PAT to do PAT work)
- "Re-run the integrated PAT briefing" (asks PAT to do PAT work)

## Estimated effort

3-5 hours: author library, integrate, validate. Defer to post-demo.

## Acceptance

Section 6 unmuted in `app/consultants/ecosystems/[ecosystemId]/vendor-brief/page.tsx` (re-enable the `ActionRoadmap` import + render). Add the Section 6 entry back to `BriefTOC.tsx`. Each rendered action has a vendor verb in the title (Schedule / Roadmap / Bring / Reach out / Document / etc.) and references a specific capability + firm context.

## Where the muting happens

- `app/consultants/ecosystems/[ecosystemId]/vendor-brief/page.tsx` — import commented out at the top of the file; render commented out inside the section list.
- `app/consultants/ecosystems/[ecosystemId]/vendor-brief/_components/BriefTOC.tsx` — Section 6 entry removed from `TOC_ENTRIES`. (BriefTOC.tsx itself was later deleted in WS11-C when the brief switched to the canonical PortalPanelSelector toggle.)
- The component itself (`ActionRoadmap.tsx`) is untouched and still exists; only its mount points are muted.

## Closure (2026-05-18, WS11-F)

Section 6 re-enabled with vendor-actionable template library.

**Architecture surprise during Block A discovery:** the "library" the audit
doc anticipated was not a separate `lib/actionRoadmapLibrary.ts`. The
templates live in a single function, `buildBriefingActionPlan` in
`lib/adminBriefingEngine.ts:647-685`, called per-firm from
`getAdminCompanyBriefing` (line 1226). `lib/briefs.ts:buildActionRoadmap`
is a pure pass-through that aggregates per-firm `nextActions` into a single
Q1/Q2/Q3 board with signal-strength derived from how many firms triggered
the same action. So the rebuild was an in-place rewrite of 6 title+detail
strings inside one function — no new file, no signature changes, no
aggregator changes.

**PAT-meta phrases removed from the library:**

- 30-day title (missing-user branch): "Close the person-level evidence gap" →
  "Schedule firm-side individual evidence outreach"
- 30-day detail (missing-user branch): "Get more individual PAT submissions
  in place..." → "Reach out to firm contacts to capture individual operating
  evidence..."
- 30-day title (else branch): "Stabilize the weakest operating section" →
  `Refresh self-report on ${weakestModuleTitle ?? "the weakest capability area"}`
- 30-day detail (else branch): "Use the weakest firm module... as the first
  operating workstream" → "Firms are rating your product below your stated
  position... Calibrate the self-report before the next operating review..."
- 60-day title: "Work through product-stack friction" →
  `Stage a product review on ${weakestProductTitle}` or
  "Open a firm-side product review channel"
- 60-day detail: "Use {product} as the priority product review and
  remediation track, then compare the next firm review against the current
  PAT readout." → "Bring {product} into the next quarterly operating review
  with the firms reviewing it now..."
- 90-day title: "Re-run the integrated PAT briefing" →
  "Refresh public positioning after remediation lands"
- 90-day detail: "Refresh the briefing after the next round of firm, user,
  and product submissions..." → "Once the next round of firm responses
  arrives, restate your public position on the products and capabilities
  that have shifted..."

Voice shift across all 6: titles now lead with a vendor verb (Schedule,
Refresh, Stage), details anchor to the specific data point driving the
action (weakest module name, weakest product name), and the framing is
"what should the vendor do next to better align with firms in this
ecosystem" rather than "what PAT submission cadence does the briefing
need."

**Surface re-mount work:**

- `app/consultants/ecosystems/[ecosystemId]/vendor-brief/page.tsx` —
  ActionRoadmap import uncommented; `VendorBriefPanelKey` union and
  `VENDOR_BRIEF_PANELS` array gained `"roadmap"` between `"product"` and
  `"pat"`; toggle options array gained `{ key: "roadmap", label: "Action
  roadmap" }`; panel switch gained the roadmap branch with
  `data-testid="vendor-brief-roadmap-panel"`. Toggle now has 8 options
  total.
- `VendorBriefHelpContent.tsx` — "What is hidden right now" card replaced
  with "How the action roadmap reads"; section-by-section paragraph
  extended with the Action roadmap entry.
- `e2e/consultant-flow.spec.ts` — vendor-brief hero count assertion bumped
  from 7 to 8; happy-path test added a navigation + visibility assertion
  for the new roadmap panel.

No new aggregator additions. No new brief fields. No new Prisma queries.
