# Agent System — Operations

Production runtime (Blueprint §3): the **Mac mini** runs the agent supervisor
under launchd, writing to **Neon**; the **Vercel** `/admin` console reads the same
Neon. Local docker postgres is for ad-hoc dev runs from the repo only.

## Supervisor (Mac mini, launchd)

Service: `com.patalign.agent-supervisor` → `scripts/agents/supervisor.ts`.

**Env / secrets.** The repo plist (`ops/launchd/com.patalign.agent-supervisor.plist`)
ships **placeholders** — no secrets in git. Render the real local copy before loading:

```bash
# Substitute DATABASE_URL/DIRECT_URL from .env.prod (Neon) and the secrets from
# .env.local into ~/Library/LaunchAgents/com.patalign.agent-supervisor.plist.
# (See the render snippet in this repo's deploy history; values are XML-escaped.)
```

`applyRepoEnv()` only fills **absent** vars, so the launchd-provided `DATABASE_URL`
(Neon) wins over `.env.local`'s docker URL — production runs hit Neon.

**Start / stop / restart:**

```bash
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.patalign.agent-supervisor.plist   # start
launchctl bootout   gui/$(id -u)/com.patalign.agent-supervisor                                # stop
launchctl kickstart -k gui/$(id -u)/com.patalign.agent-supervisor                             # restart
launchctl list | grep patalign                                                                # status (col 1 = PID)
```

**Logs:**

```bash
tail -f ~/Library/Logs/patalign-agent-supervisor.log       # stdout (startup, runs, heartbeat)
tail -f ~/Library/Logs/patalign-agent-supervisor.err.log   # stderr
```

Cadence: qa-smoke `0 * * * *`, cloudflare-watcher `0 */2 * * *`, pilot-ops `0 8 * * *`
(hello-world disabled). The scheduler fires crons in local time.

**Heartbeat / silent-DB watchdog (2026-06-10, after the June 9 17-hour silent
DB-auth outage).** Every trigger-poll cycle that successfully reaches Neon
records a heartbeat (in-memory + `artifacts/agents/supervisor-heartbeat.json`).
A watchdog tick (every 60s) sends a Telegram alert when the heartbeat has been
silent longer than `PAT_HEARTBEAT_ALERT_AFTER_MS` (default 15 min), re-alerts
every `PAT_HEARTBEAT_REALERT_MS` (default 60 min) while the outage continues,
and sends a recovery message when polls succeed again. Telegram does not depend
on the DB, so the alert path survives exactly the failure it watches for. While
a claimed trigger is running (e.g. blocked hours on an approval card) the
supervisor counts as healthy. Code: `lib/agents/heartbeat.ts` +
`scripts/agents/supervisor.ts`.

## Manual agent run

**Dev / Mac mini (works today):**

```bash
# Against Neon (production data):
DATABASE_URL="$(grep '^DATABASE_URL=' .env.prod | cut -d= -f2- | tr -d '"')" \
  pnpm exec tsx scripts/agents/run-agent.ts qa-smoke
# Against local docker (ad-hoc dev):
pnpm agent:run qa-smoke
```

**Production via /admin command bar — WIRED (Phase 2.5 #5, Neon-backed trigger
queue).** In production, `POST /api/agents/[key]/run` enqueues an
`AgentTriggerRequest` row (status `pending`) instead of spawning; the Mac-mini
supervisor polls Neon every `PAT_TRIGGER_POLL_MS` (default 5s), claims the row
(conditional update — never double-runs), applies the per-run env overrides
from `taskEnv` (PAT_PILOT_TASK / PAT_PILOT_FIRM / PAT_KNOWLEDGE_QUERY), runs
the agent in-process, and marks the trigger `completed` / `failed`. Pending
triggers older than `PAT_TRIGGER_TTL_MS` (default 15 min) are marked `expired`
so a supervisor outage never replays a stale backlog. Local dev keeps the
direct spawn for instant feedback; set `PAT_AGENT_TRIGGER_QUEUE=1` to exercise
the queue path locally. Code: `lib/agents/triggerQueue.ts`,
`app/api/agents/[agentKey]/run/route.ts`, `scripts/agents/supervisor.ts`.
Requires migration `20260605030000_add_agent_trigger_queue` and a supervisor
restart after deploy (`launchctl kickstart -k gui/$UID/com.patalign.agent-supervisor`).

## Approvals

Gated tools (e.g. pilot-ops `gmail.draft`, `neon.write:User`,
`provisioning.create_account`) raise an approval. The **Telegram poller**
(separate process, owns the bot token — see `project_telegram_bot_ownership`
memory) and the `/admin/approvals` page both write to the same `AgentApproval`
table.

**Account provisioning (2026-06-10).** One shared seam,
`lib/provisioning/account.ts` (`provisionOrganizationAccount`), creates a firm or
vendor Company + Subject + OWNER user with a temporary credential
(`mustChangePassword: true`, first-login update enforced by proxy.ts). Two
surfaces call it:
- `/admin/organizations` → "Provision account" form (admin types the temp
  password; operator audit records the actor).
- Telegram `/provision <firm|vendor> <owner-email> <Org Name> [| Owner Name]` →
  enqueues a pilot-ops `provision-account` trigger; the supervisor runs it behind
  the `provisioning.create_account` approval card (blast radius high). The agent
  generates the temp password, keeps it out of all audit/step rows, and delivers
  it to the operator chat directly after approval.

> **TODO (prod /admin approvals):** the browser approve/deny path verifies an HMAC
> using `AGENT_APPROVAL_HMAC_SECRET`. That secret is **not yet in Vercel's env**, so
> approving from production `/admin` will fail until it's added
> (`vercel env add AGENT_APPROVAL_HMAC_SECRET production`, same value as `.env.local`).
> The dashboard, agent list, runs, and audit views work without it.

## Add a new agent

1. `agents/<key>.yaml` — cadence, model, hard caps, tools, hooks, approval_rules,
   `vertical_id`.
2. `scripts/agents/<key>.ts` — implement the `AgentHandler`, `registerAgent("<key>", …)`.
3. `import "./<key>";` in `scripts/agents/register-agents.ts`.
4. (If it reads `agents/`/`verticals/` from a Vercel route) ensure those dirs are in
   `next.config.ts` `outputFileTracingIncludes` so /admin can render it.
5. `pnpm typecheck && pnpm lint:test && pnpm agent:eval:<key>` (if it has an eval).
6. Restart the supervisor (`launchctl kickstart -k …`) and deploy to Vercel so
   `/admin` lists it.

## Known prod notes

- **TODO — AUTH_URL temporarily points at the `.vercel.app` URL.** Vercel prod
  `AUTH_URL`/`NEXTAUTH_URL` were set to `https://patalign.com` (LAUNCH-001), but
  patalign.com does not resolve yet (Cloudflare nameserver ticket), so Auth.js
  redirected every sign-in to a dead host. They now point at
  `https://pat-c2acct-live.vercel.app`. **Revert to `https://patalign.com` once
  the Cloudflare nameserver issue resolves and patalign.com DNS is live.**
- **/admin auth:** local-review auth is loopback-only (CLAUDE.md), so it cannot
  authorize `/admin` on the public domain. Production `/admin` needs a real admin
  session (GitHub OAuth — LAUNCH-002, or a provisioned admin account). An admin is
  provisioned (cameron@garrettandgarrett.info, role ADMIN, scrypt passwordHash).
- **Phase 2.5 — prod /admin sign-in (Server-Action bug):** the "Continue with
  provisioned account" form produces zero network activity on click in prod — a
  client-side Server-Action invocation problem, NOT auth gating. The Credentials
  provider is unconditional and the pilot path verifies the scrypt password, so
  the credential is valid; the form's action isn't firing in the browser.
  Workaround: operate via the Telegram bot (working) + direct SQL/CLI. The /admin
  web UI is observability, not load-bearing for ops.
- **Release fingerprint on `--archive` deploys:** `vercel deploy --archive=tgz`
  uploads no `.git`, so `/api/release-fingerprint` falls back to the state-file
  commit and may not reflect the just-deployed commit. qa-smoke's commit-drift
  check is limited accordingly until fingerprint resolves the real deployed commit.
- **Phase 3 preliminary — provision `ANTHROPIC_API_KEY`.** No LLM key is configured
  anywhere, so every agent is deterministic. Provisioning Claude unlocks: LLM
  *synthesis* for the Internal Knowledge agent (generative cited answers instead of
  extractive passages — see docs/agents/internal-knowledge.md) AND Claude reasoning
  for all future agents (Customer Comms drafts, Support Triage, etc.). Add to
  `.env.local` + the launchd plist + Vercel env.
  *Plumbing landed 2026-06-10:* `lib/agents/llm.ts` reads the key from the
  supervisor env (presence-only logging — the value is never logged or persisted);
  agents opt in per-config with `llm: { enabled: true }` in their YAML. Flag
  without key (or vice versa) degrades to scripted behavior, so the credential
  can be provisioned without a code change.

### Phase 2.5 cleanup backlog (consolidated)
1. ~~Prod /admin sign-in Server-Action bug.~~ **RESOLVED (2026-05-29, commits
   9a55060e + e0e650fd).** Two distinct things were tangled here:
   (a) The Server Action POST itself works (Playwright: POST → 303 → session
   cookie set). The "click does nothing" report was an ADMIN account rejected by
   the role-specific paths + a missed error banner. `serverActions.allowedOrigins`
   added defensively for the Cloudflare/patalign.com origin (keep it).
   (b) **The real bug:** `proxy.ts` (Routing Middleware) called `getToken()`
   without `secureCookie`, so under https it couldn't decode
   `__Secure-authjs.session-token` (Auth.js v5 salts the JWE with the cookie
   name) → returned null → 307-bounced every authenticated user back to /sign-in.
   Fixed by deriving `secureCookie` from the request protocol. All four demo
   roles (`demo-*@patalign.test`, provisioned to Neon) now render their portals.
9. **Sign-in error banner is too easy to miss (UX polish).** On a failed pilot
   sign-in the server 303-redirects back to `/sign-in?...&error=pilot_password_invalid`
   and an inline rose banner renders (app/sign-in/page.tsx `describeAuthError`),
   but on a quick retry cycle users don't notice it (this caused a false "sign-in
   is broken" alarm on 2026-05-29). Make the failure unmissable: a toast/sticky
   banner, and/or persist the submitted email across the redirect so the user sees
   their input wasn't silently cleared. Low-risk, demo-facing.
2. ~~Visible Admin tab missing from the /sign-in role chooser.~~ **RESOLVED
   (Sprint 1 Task A, commit ce57b217).** The Admin tab was gated on
   `authRuntime.localReviewEnabled` (false in prod). Now unconditional, positioned
   Vendor / Firm / Consultant / **Admin** / Meet PAT / Help.
3. Telegram bot consolidation (approval poller owns the token; chatops stopped).
4. Command-bar manual-trigger in prod → Neon-backed trigger queue.
5. Async-resume approval pattern (docs/agents/approval-architecture.md).
6. Revert `AUTH_URL` to patalign.com once Cloudflare DNS resolves.
7. Provision `ANTHROPIC_API_KEY` (Phase 3 preliminary — above).
8. Index Dream State once extracted to text (`dream_state` knowledge source).

### Sprint 1 outcomes (2026-06-02)

- **Task A — Admin tab on /sign-in (commit ce57b217, deployed):** see backlog #2.
  Verified headless: 6 role tabs, clicking Admin → `?view=admin` → operator card.
- **Task B — Synthetic demo-account activity (Neon prod, additive-only):** populated
  the 4 demo accounts so their dashboards reflect realistic customer activity. Run
  via a now-deleted one-shot (`scripts/_seed-demo-accounts-synthetic.tmp.ts`) that
  reused the `lib/demoPatEcosystemSeed.ts` helpers (`ensureVendor/Product/Firm`,
  `seedVendorProductAssessment`, `seedFirmAlignmentSubmission/Draft`,
  `seedFirmProductAssessment`). Companies are matched **by name** so the existing
  `Demo Vendor Inc` / `Demo Firm LLP` are augmented in place — the demo users'
  `companyId` and sign-in are untouched. Applied deltas (additive, nothing removed):
  **+4 products, +16 survey submissions, +3 FirmMaturityIndex, +1 Ecosystem, +2
  companies** (2 new ecosystem firms). The existing benchmark data (vendors /
  products / firms / scored submissions) was not mutated.
  - **demo-vendor** → 4 products in mixed states: *Demo Tax Tool* + *Demo Advisory
    Suite* = "Completed final vendor assessment"; *Demo Audit Workpapers* = "In
    progress, final evidence incomplete" (a `scoreVersion=0` draft — there is no
    vendor-draft helper, so this one state is a light custom `SurveySubmission`
    write); *Demo Bookkeeping Pro* = "Needs feature declaration" (untouched —
    product created with no assessment plan declared).
  - **demo-firm** → FirmMaturityIndex/Momentum/Snapshot + 3/5 alignment modules
    completed, 1 partial draft, 1 queued; insight surfaces populated.
  - **demo-consultant** → one "Demo Accounting Ecosystem" (vendor Demo Vendor Inc +
    3 firms: Demo Firm LLP, Northway Accounting Partners, Cedar & Vale CPAs), Avg
    75 / "Building", **2 hot divergences** populated. (One ecosystem, not two —
    `ConsultantAssignment` is strictly 1:1; multi-ecosystem is a future schema item.)
  - **demo-admin-2** → unchanged (global aggregate `/admin` agent-ops view; confirmed
    intact).
- **Carryover polish (optional):** *Demo Bookkeeping Pro* reads "Needs feature
  declaration" rather than "Ready to assess" because its utility keys aren't
  registered via the assessment-plan layer; both are pre-assessment states.
