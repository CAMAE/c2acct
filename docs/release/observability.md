# Observability — deploy-night runbook

**Status:** wired, **nothing enabled**. No environment has `SENTRY_DSN` set and no
log drain is configured. Everything below is the procedure for turning it on, not
a description of a live system.

---

## What is already in the build

| Piece | Where | Active today? |
|---|---|---|
| Request-correlation ids | `lib/observability/requestId.ts`, minted in `proxy.ts` | **Yes** — always on |
| Structured JSON error lines | `lib/observability/logger.ts` | **Yes** — formatting only |
| Request id on audit rows | `lib/agents/audit.ts` (`AuditEntry.requestId`) | Yes, when a caller passes one |
| Sentry capture | `lib/observability/sentry.ts` | **No** — requires `SENTRY_DSN` |

### Correlation ids

`proxy.ts` mints one id per request and attaches it three ways: forward on the
request headers (so server components, actions and route handlers all read the
same value), back on the response headers (so a browser report or a `curl -i`
can be tied to server lines), and into structured logs and audit rows.

Header: `x-pat-request-id`. Format: 16 lowercase hex characters.

An id arriving from an upstream hop is **reused only if it matches that shape**.
Anything else is discarded and a fresh id minted — an id is echoed verbatim into
the drain, so unvalidated input would let a caller forge log lines.

Read it in server code with `getServerRequestId()`
(`lib/observability/serverRequestId.ts`). That module imports `next/headers` and
must not be imported by the agent supervisor or any plain Node script; the pure
`requestId.ts` is the edge-safe one.

### Structured error lines

`logServerError({ event, requestId, error, context })` emits a single-line JSON
object:

```json
{"ts":"2026-08-26T00:00:00.000Z","level":"error","event":"server_action_error","requestId":"a1b2c3d4e5f60718","message":"boom","errorName":"Error","stack":"Error: boom\n    at ..."}
```

One line per error, on purpose. A raw `console.error(err)` wraps its stack across
many drain rows, and the row carrying the message has no request id on it — so
you cannot pivot from an error to the request that caused it.

`context` is redacted through **the same rules as the agent audit trail**
(`lib/agents/redact.ts`): oversized values and credential-shaped strings are
replaced before emission. A drain is append-only external storage; a secret
written there cannot be taken back.

Stacks are capped at 12 frames so one hot error cannot flood the drain.

---

## Deploy night: enabling the Vercel log drain

Do this **after** a successful production deploy, not before — the drain bills on
volume and there is no reason to pay for build-time noise.

1. **Choose a destination.** Vercel drains deliver to an HTTPS endpoint. Any of
   Datadog / Better Stack / Axiom / a self-hosted collector works; the only hard
   requirement is that it accepts JSON POST bodies and lets you query on a
   field.
2. **Create the drain.** Vercel dashboard → the `c2acct` project → **Settings →
   Log Drains → Add**. Select:
   - **Sources:** `Function` (server + server actions) and `Edge` (the proxy).
     `Build` and `Static` are noise for this purpose.
   - **Environments:** Production first. Add Preview only if preview noise is
     wanted; it roughly doubles volume.
   - **Delivery format:** JSON (NDJSON).
3. **Verify delivery before trusting it.** Hit a route that logs, then confirm
   the line arrived:
   ```
   curl -i https://patalign.com/firm | grep -i x-pat-request-id
   ```
   Take that id and search the destination for it. **If the id does not appear in
   the drain, the drain is not working** — do not proceed on the assumption that
   silence means health. That is precisely the failure mode the supervisor
   heartbeat exists to catch elsewhere.
4. **Save the two queries that matter** as the on-call starting points:
   - `level:"error"` — everything that failed.
   - `requestId:"<id>"` — every line from one request, which is what a customer
     report gives you.
5. **Set a volume alert** on the destination. A drain that silently exceeds its
   plan drops lines, and dropped error lines look identical to no errors.

### Rollback

Delete the drain in the same settings pane. No code change is needed and no
deploy is required — the structured lines keep being written to Vercel's own log
view either way.

---

## Deploy night: enabling Sentry

1. **Create the project** in Sentry and copy its DSN.
2. **Set `SENTRY_DSN`** in Vercel project env for Production only, at first.
3. **Set `PAT_RELEASE_ID`** to the deployed release id so events are tagged to a
   known build. This is the same value the `/trust` surface and the launch proof
   already publish — use `getPublicReleaseFingerprint().releaseId`, do not invent
   a second release identifier.
4. **Call `initSentry()`** from a Next instrumentation hook. This is deliberately
   **not** wired automatically: the module does nothing until something calls it,
   so turning capture on is an explicit act, reviewable in a diff.
5. **Verify**, then **check what was sent** — open the first event and confirm
   there is no user object, no cookies, and no credential in the request headers.

### The no-DSN guarantee

With `SENTRY_DSN` absent:

- `buildSentryOptions()` returns `null` and `initSentry()` returns `false`.
- The SDK is behind a **dynamic `import()` inside the DSN branch**, so it is
  never evaluated: no transport is constructed, no global handlers are
  installed, and no network call can occur.

A top-level `import * as Sentry from "@sentry/nextjs"` would break this — the SDK
installs global handlers on import, which is behaviour change in an environment
that opted out. `tests/observability.contract.test.ts` asserts the source uses
the dynamic form, so the guarantee cannot regress silently.

### PII posture

- `sendDefaultPii: false`.
- `beforeSend` runs every event through `scrubSentryEvent()`: **cookies and the
  user object are dropped entirely** (a session cookie is a live credential; the
  user record is the PII we are declining to send), and headers, body and extras
  go through the audit redactor.
- `tracesSampleRate: 0` — errors only. Tracing is a paid-volume decision.

---

## Known gaps

- **`initSentry()` has no caller.** Wiring the instrumentation hook is a
  deploy-night step, listed above, not a code default.
- **Correlation ids are not yet threaded into every server action.** The proxy
  attaches the id and `getServerRequestId()` reads it; individual actions must
  pass it to `logServerError`. Existing `console.error` call sites still emit
  unstructured lines and will not carry an id until migrated.
- **The drain has never been exercised.** Every step above is written from the
  Vercel/Sentry contract, not from a verified run in this project.
