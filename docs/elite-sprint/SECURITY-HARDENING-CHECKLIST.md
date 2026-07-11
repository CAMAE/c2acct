# Security Hardening Checklist — c2acct-live / Patalign

Status: **planning** (2026-07-08). Nothing here is applied yet. No production
writes without Cam's explicit go. This is the pre-scale hardening backlog to work
through around the June/July pilot; each item lists current state (grounded in the
repo/infra as of this date), the target, and a verification step.

Priority legend: **P0** before broader external exposure · **P1** before pilot
scale-up · **P2** phase-2 / defense-in-depth.

---

## 1. Vercel firewall / WAF

Current: patalign.com serves from the Vercel project `pat-c2acct-live` (prod branch
`feat/agent-system-phase-0`, Neon DB). No custom firewall ruleset is defined in the
repo; we rely on Vercel platform defaults.

- [ ] **P1 — Enable Vercel WAF managed ruleset** (OWASP-style) in the project
      firewall. Start in log/observe mode, review a week of traffic, then enforce.
- [ ] **P0 — Turn on Vercel BotID / bot filtering** for the unauthenticated
      surfaces that can be abused at volume: `/sign-in`, `/create-account`
      (self-signup wizard, behind `PAT_ENABLE_SELF_SIGNUP`), and the NextAuth
      callback. GA product; low-risk to enable.
- [ ] **P1 — Rate-based firewall rule** as a coarse outer bound (e.g. N req/min
      per IP to `/api/*`) sitting in front of the app-level durable limiter (§2),
      so abusive IPs are dropped before they reach a function.
- [ ] **P2 — Geo/ASN rules** only if pilot telemetry shows abuse; do not
      pre-emptively geoblock the pilot cohort (vendor + firm + consultant).
- [ ] **Verify:** synthetic burst against a staging alias trips the rule; a normal
      pilot session does not. Capture the firewall event log as proof.

## 2. Rate-limit coverage audit

Current: durable rate limiting exists — `lib/security/rateLimit.ts`
(`consumeDurableRateLimit`, `getClientIp`, `rateLimitJsonResponse`) — but is wired
into **only three** routes:
- `app/api/survey/submit/route.ts`
- `app/api/billing/portal/route.ts`
- `app/api/billing/webhooks/route.ts`

The authentication and account-lifecycle paths are **not** covered:

- [ ] **P0 — NextAuth credentials sign-in** (`app/api/auth/[...nextauth]`): add a
      per-IP + per-email durable limit on the credentials callback to blunt
      password spraying / credential stuffing. This is the highest-value gap.
- [ ] **P0 — `app/api/auth/local-reset`**: rate-limit; it is review-auth-only but
      must not become an oracle. Confirm it stays gated by
      `PAT_ENABLE_LOCAL_REVIEW_AUTH` + loopback origin in prod.
- [ ] **P1 — Self-signup provisioning** (the `/create-account` wizard's write
      seam, behind `PAT_ENABLE_SELF_SIGNUP`): limit account creation per IP to
      stop mass-provisioning. Note the wizard is a server action, not an API
      route — the limiter must be callable from the action path.
- [ ] **P1 — Pat assistant / chat + ping endpoints** (behind their flags): once
      customer-facing, add per-user limits so a single tenant can't exhaust the
      Anthropic budget. Ties to the known zero-balance/credit guardrails.
- [ ] **P1 — Draft persistence** (`app/api/vendor/product-assessment/draft`, new):
      autosave fires on a debounce; add a light per-user limit so a stuck client
      can't hammer it.
- [ ] **Verify:** a unit/integration test per newly-covered route asserting the
      limiter returns `rateLimitJsonResponse` (429) past the threshold, mirroring
      the survey/submit coverage.

## 3. Neon tier / scaling + backup / PITR

Current: prod DB is Neon (Postgres). Rotations must re-render the launchd plist
(supervisor env trap). No documented autoscale ceiling or PITR test on record.

- [ ] **P1 — Confirm the compute tier + autoscale ceiling** matches expected pilot
      concurrency; set a min-CU to avoid cold-start latency during a live demo.
- [ ] **P1 — Verify backups + PITR window**: confirm the retention window and do a
      *restore drill* into a scratch branch (Neon branching makes this cheap).
      Untested backups are not backups.
- [ ] **P0 — Credential rotation runbook**: document that a Neon rotation requires
      re-rendering `com.c2acct.app.plist` (kickstart does NOT reload env) and that
      the heartbeat file is the proof of a good re-render. Link the existing
      supervisor-plist-env note.
- [ ] **P2 — Connection pooling review**: ensure serverless/standalone paths use
      the pooled endpoint; check Prisma connection-limit under Fluid Compute reuse.
- [ ] **Verify:** a PITR restore into a Neon branch reaches a chosen timestamp and
      the app boots against it read-only.

## 4. Agent-supervisor cloud migration

Current: the automation/agent supervisor + watchdog run as **launchd agents on the
mac-mini** (`com.c2acct.app`, `com.c2acct.watchdog`, `com.aae.c2acct.*`). This is a
single-host SPOF tied to Cam's mac-mini and its env/plist lifecycle.

- [ ] **P1 — Decide the target**: (a) keep on mac-mini with better monitoring;
      (b) move schedulers to **Vercel Cron** + durable queue (Vercel Queues);
      (c) a small always-on cloud worker (Fly/Render/Railway) for the poller +
      watchers. Cam's call — capture the decision here before building.
- [ ] **P1 — Telegram approval poller** ownership: it currently owns the bot token
      (the old chatops bot is intentionally stopped). Any migration must preserve
      single-owner semantics or the bots will fight over `getUpdates`.
- [ ] **P2 — Move build-dependent gates off the app host** so `pnpm build` /
      `validate:launch` stop racing `com.c2acct.app` over `.next` (known race —
      quiesce app+watchdog before build gates).
- [ ] **Verify:** kill the primary host and confirm scheduled jobs still fire (or
      that the runbook's manual failover is documented and rehearsed).

## 5. Row-Level Security as the phase-2 tenancy wall

Current: tenancy isolation is enforced in **application code** — the leak-wall
helpers (`getVendorScopedFirms`, `getFirmScopedVendors`,
`requireConsultantCompanyAccess`) plus `tests/tenancy-invariant.test.ts` and
cross-tenant-404 e2es. This is correct and tested, but it is a *single* layer: one
missed `where companyId` leaks across tenants.

- [ ] **P2 — Introduce Postgres RLS** as a second wall: policies keyed on the
      tenant/company id, enforced at the DB regardless of query correctness.
      Sequence: (1) inventory every tenant-scoped table; (2) set a per-request
      session GUC (e.g. `app.current_company_id`) from the authenticated session;
      (3) add `ENABLE ROW LEVEL SECURITY` + policies additively; (4) run the full
      tenancy-invariant + e2e suite with RLS on in a shadow env before prod.
- [ ] **P2 — Prisma + RLS wiring**: confirm the session GUC is set on the pooled
      connection per request (Fluid Compute reuse makes leaking the GUC across
      requests a real risk — reset it defensively).
- [ ] **Keep app-layer scoping** even after RLS lands — defense in depth, not a
      replacement. The existing tests stay the first line.
- [ ] **Verify:** with RLS enforced, a deliberately-unscoped query in a scratch
      test returns zero cross-tenant rows.

---

## Cross-cutting

- [ ] **Secrets**: audit that no funded keys (Anthropic prod, Stripe, Neon) live in
      the repo or client bundle; confirm `.env.local` vs `.env.prod` separation.
- [ ] **Security headers**: CSP, HSTS, `X-Content-Type-Options`, frame-ancestors —
      set via `vercel.ts`/next config; verify on the served homepage.
- [ ] **Dependency + build integrity**: keep the release-fingerprint proof in the
      launch chain; add automated dependency-audit to CI.
- [ ] **Do not** enable any of the above against prod without Cam's explicit go and
      a rollback note per item.
