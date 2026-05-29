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

## Manual agent run

**Dev / Mac mini (works today):**

```bash
# Against Neon (production data):
DATABASE_URL="$(grep '^DATABASE_URL=' .env.prod | cut -d= -f2- | tr -d '"')" \
  pnpm exec tsx scripts/agents/run-agent.ts qa-smoke
# Against local docker (ad-hoc dev):
pnpm agent:run qa-smoke
```

**Production via /admin command bar — NOT wired yet (TODO, Phase 1.5).** The
`POST /api/agents/[key]/run` route spawns `scripts/agents/run-agent.ts`, which only
works when the server runs from the repo (dev). On Vercel serverless there is no
repo/scripts dir, so the command bar can't spawn runs in prod. The fix is a
**Neon-backed trigger queue**: the API enqueues a row; the Mac-mini supervisor polls
and runs it. Until then, production manual runs are done on the Mac mini via the
command above; the supervisor drives all scheduled runs.

## Approvals

Gated tools (e.g. pilot-ops `gmail.draft`, `neon.write:User`) raise an approval. The
**Telegram poller** (separate process, owns the bot token — see
`project_telegram_bot_ownership` memory) and the `/admin/approvals` page both write
to the same `AgentApproval` table.

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

### Phase 2.5 cleanup backlog (consolidated)
1. Prod /admin sign-in Server-Action bug (above).
2. Visible /admin agent-tab UX gap.
3. Telegram bot consolidation (approval poller owns the token; chatops stopped).
4. Command-bar manual-trigger in prod → Neon-backed trigger queue.
5. Async-resume approval pattern (docs/agents/approval-architecture.md).
6. Revert `AUTH_URL` to patalign.com once Cloudflare DNS resolves.
7. Provision `ANTHROPIC_API_KEY` (Phase 3 preliminary — above).
8. Index Dream State once extracted to text (`dream_state` knowledge source).
