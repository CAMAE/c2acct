# The Pat answer ladder

Cam's approved ladder has five rungs:

1. **Corpus** — grounded in Patalign's own help library.
2. **Live account data** — the firm's own numbers (Big Brain Pat, Phase C).
3. **Web-grounded** — mandatory citations, a visible "from the web" label.
4. **Honest decline** — say so, and log the gap.
5. **Human handoff.**

**LADDER-1** built the scope gate, rung 1 and rung 4, plus the shape of the walk.
**LADDER-2** inserted rung 3, the web tier, behind `PAT_ENABLE_PAT_WEB_TIER`.

Still unbuilt: rung 2 (live account data, Big Brain Pat Phase C) and rung 5
(human handoff). Rung 2 inserts between the corpus rung's failure and the web
rung — the same insertion point, one level earlier.

---

## Rung 0 — the scope gate

Pat is Patalign's in-product guide, not a free general-purpose assistant. The
gate declines "what is the capital of France" and "write me a Python script" at
the door, before retrieval, before a generation, and — once LADDER-2 lands —
before a paid search.

### It fails OPEN onto free rungs — and closed on paid ones

When the gate is unsure, the question **proceeds onto the free rungs only**.

This is safe because the gate is a **cost and scope control, not a security
wall**. The wall is downstream and unchanged: retrieval is restricted to the
caller's audience, tier and vertical, and the model answers only from what
retrieval returned. An out-of-scope question that slips through finds nothing in
the corpus and declines one rung later — it costs a retrieval, not a leak.

Failing closed would trade that cheap, self-correcting miss for an expensive
one: a firm asking a real question in wording the classifier did not recognise
gets told Pat cannot help, with no second chance. **A false negative wastes a
query; a false positive loses a user.**

### Ambiguity is free-rungs-only (the LADDER-2 ruling)

Failing open is right for a rung that costs nothing and wrong for one that
spends money, so the verdict carries a **certainty** alongside `inScope`:

| Certainty | Meaning | Corpus rung | Web rung |
|---|---|---|---|
| `confident-in` | something positively decided it was in scope | ✅ | ✅ |
| `uncertain` | nothing decided; the gate failed open | ✅ | ❌ |
| `confident-out` | something positively decided it was out | ❌ | ❌ |

`inScope` is `true` for **both** `confident-in` and `uncertain` — it is the
fail-open answer, not a decision. That is the trap: a paid rung checking
`inScope` would spend money on ambiguity. Every paid rung must therefore call
`mayReachPaidRung()`, which accepts `confident-in` and nothing else.

Certainty is a property of the **verdict**, not of how it was reached. That makes
it strictly stronger than the ruling's literal condition ("model call failed AND
the keyword classifier is uncertain"): a keyword verdict that merely failed open
is uncertain whether or not a model was ever consulted, and in every one of those
cases nothing actually decided, so nothing should be spent.

### Two implementations, one contract

| | |
|---|---|
| **Key present** | one cheap-model call (Haiku), ≤8 output tokens, 8s timeout |
| **No key** | a deterministic keyword classifier |

The keyword classifier is **not a degraded stub**. It is the reference behaviour
the model call is measured against, it is what runs in CI where no key exists,
and it is what keeps the gate honest when the API is down. A model call that
fails, times out, or returns an unparseable verdict falls back to it — an
unparseable verdict is *not a verdict*, and inventing one from noise is worse
than asking the deterministic path.

Product vocabulary wins over an out-of-scope signal: *"how do I export my
alignment scores into a Python script"* is a real question about the product, and
a classifier that refuses it because it saw "Python" has learned the wrong
lesson.

The question is framed as **untrusted data** in the classifier prompt, in the
same spirit as retrieval framing: a question that says "ignore your instructions"
is a question to be classified (as out of scope), never an instruction to obey.

## The router

`runAnswerLadder()` owns the walk and the gap log. The route owns HTTP — what a
decline and a breakage look like on the wire, and nothing else.

### One path, not two

The router is **not** a parallel implementation switched on by a flag. With
`PAT_ENABLE_PAT_LADDER` off it skips the scope-gate rung and walks
corpus → decline, which is exactly the flow the route already had.

A flag that selects between two implementations of the same journey guarantees
they drift, and the one nobody is running is the one that rots. Here the flag
**adds a rung to a single walk**, and the contract test asserts the flag-off walk
is step-for-step the pre-ladder flow: gate never consulted, retrieval called
once, generation called once, same declines at the same points.

### Declines are results; breakage is an error

A decline returns `{ kind: "decline", rung, reason }` and the route renders a
200 with fallback copy. A **generation failure is rethrown** and becomes a 502.

Collapsing those would hide an outage inside a polite message about the help
library — the user would be told the corpus is thin when the model is down, and
the digest would record a corpus gap that does not exist.

### Every exit is logged, and logged once

| Rung | Logged as |
|---|---|
| Scope gate rejected | `scope_gate` |
| No model key | `unavailable` |
| Corpus returned nothing | `corpus_miss` |
| Corpus matched, could not ground | `corpus_insufficient` |
| Web rung ran and produced nothing citable | `web` |

A web **wall** refusal (flag off, no provider, wrong audience, unconfident scope,
cap trip) is *not* logged as `web` — the rung never really ran, so the corpus
keeps ownership of the decline and the digest keeps reading true. Only a rung
that actually searched, or actually failed on its own terms, owns a `web` gap.

`corpus_miss` and `corpus_insufficient` are deliberately distinct: *"we have
nothing on this"* and *"we have something and it was not enough"* are different
corpus problems with different fixes.

The router owns the logging so a future rung cannot be added without a rung name
— the alternative is a rung that silently drops out of the digest and makes the
corpus look healthier than it is. A successful answer logs **nothing**: the gap
log is a record of failure, and logging successes would make the digest's "what
is the corpus missing" question unanswerable.

The log write is guarded inside the router **and** inside `recordPatDecline`.
That is not redundant: the logger swallowing its own errors is an implementation
detail, while *"a gap-log failure never reaches the user"* is a property of the
ladder.

---

## Proof obligations

| Guarantee | Test |
|---|---|
| Flag-off walks the pre-ladder flow step for step; flag ON declines out-of-scope before retrieval AND generation | `tests/pat-ladder.contract.test.ts` |
| Keyword classifier: rejects high-confidence out-of-scope, product vocabulary wins, fails open on the unrecognised | same |
| No key → deterministic; model failure or unparseable verdict → deterministic | same |
| One decline per walk, none on success, log failure never breaks the walk, generation failure rethrown | same |
| No ladder module references the web tier or its flag | same |
| Route renders decline as 200 + fallback, breakage as 502 | `tests/pat-route-gate.test.ts` |

---

## Rung 3 — the web tier (LADDER-2)

Reached **only after the corpus rung has failed**, at both of the two ways it can
fail (a miss, and insufficient context). Never after a successful corpus answer:
Patalign's own documentation is the better source whenever it has one, and paying
a search to second-guess it would be wasteful and wrong.

### Five independent walls

Every one must pass. Each is separate, so turning the flag on in an environment
missing any other changes nothing:

1. `PAT_ENABLE_PAT_WEB_TIER` is on.
2. A search provider is configured (its credential is present).
3. The caller is signed-in and **not** the public audience.
4. The scope gate returned **confidently** in scope.
5. Both spend caps have room.

Any failure is a **decline, never an error**. The user asked a help question; a
misconfiguration is not their problem to see.

The public audience can never reach this rung: an unauthenticated caller has no
account to bill, no per-user allowance to consume, and no consent on file for
sending their text to a third party.

### Two things are code-enforced, not prompted

| Rule | Enforcement |
|---|---|
| No web answer displays without ≥1 clickable citation | `renderWebAnswer()` **refuses** — the ladder declines instead |
| Every web answer carries `This comes from the web, not PAT's documentation.` | the label is part of the rendered value, not an instruction |

Prompting for either would work almost always, and "almost always" is the failure
mode that matters: the one uncited answer is precisely the one that was
hallucinated, and the one unlabelled answer is precisely the one a firm mistakes
for Patalign's documented position.

### The domain allowlist

Deny-by-default, `.gov` / standards bodies / accounting trade press, extensible
via `PAT_WEB_ALLOWED_DOMAINS`. Enforced **twice**: `allowed_domains` is passed to
the provider so the model only ever *reads* allowlisted pages, and every returned
citation is re-checked locally so the allowlist also governs what Pat may *cite*.
If re-checking leaves zero citations, the answer is refused.

Matching is **label-anchored**: `gao.gov` matches `gao.gov` and `data.gao.gov`,
and does not match `notgao.gov` or `gao.gov.evil.com`. A bare `endsWith` accepts
the first; a bare `includes` accepts both — which is how an allowlist becomes
decorative.

### The provider seam

`WebSearchProvider`, chosen by `PAT_WEB_SEARCH_PROVIDER`. The shipped
implementation is **Anthropic's server-side web search** (`web_search_20260209`,
non-beta, already in the repo's SDK) — no second vendor, no second key, no second
failure mode. A provider with no credential resolves to `null`, and the rung
reports itself unavailable.

The synthesis model is **Sonnet 5**, not Pat's Haiku fast tier: the
dynamic-filtering search tool requires Opus 4.6+/Sonnet 4.6+, and Sonnet 5 is the
cheapest current model that supports it — which matters under a $2/day cap.
Overridable with `PAT_WEB_TIER_MODEL`.

> **Known limitation, disclosed rather than papered over.** With the Anthropic
> adapter, search and synthesis happen in **one** API call and the fetched page
> text never transits this process — the SDK returns `encrypted_content` that
> only the model reads. So per-chunk untrusted framing **cannot** be applied to
> page bodies here; the framing is carried by the system prompt instead, and it
> is the only thing standing between a hostile page and the synthesis. A
> text-returning provider (e.g. Tavily) would wrap each chunk directly, which is
> strictly stronger, and the seam is shaped for it (`frameWebContent()` is the
> shared definition either provider uses).

### The no-promises law, in Pat's own voice

Authored corpus content is linted before import. Web prose is generated per
request and cannot be linted before it exists, so the law travels in the system
prompt: relay every source claim **as that source's claim** ("the AICPA says X",
never "X is true"), never promise an outcome, never state a price, never
characterize a named competitor.

### Spend controls

| Cap | Env | Default |
|---|---|---|
| Global daily USD | `PAT_WEB_TIER_DAILY_CAP_USD` | `2` |
| Per-user daily searches | `PAT_WEB_TIER_USER_DAILY_SEARCHES` | `10` |

Both are needed and neither substitutes for the other: the global cap is the
backstop against a bug or a spike; the per-user cap is the backstop against a
single enthusiastic or hostile account, which the global cap would only catch
*after* it had spent everyone else's budget. A cap trip is an honest decline.

Checked **before** the search, and compared with `>=` — a `>` would allow exactly
one overspend every day, forever, which is the kind of off-by-one that only shows
up on the bill. Every provider call is billed to the ledger **including calls
that produced no citable answer**: a failed search still cost money, and a ledger
recording only successes lets the cap drift past its ceiling.

### The tenant-data firewall

`lib/patAssistant/web/rung.ts` imports **nothing** from a tenant data layer — no
Prisma, no membership resolver, no session or company lookup. Everything arrives
as an argument. A contract test walks its transitive import graph and fails if a
database or tenant module appears.

That test earned its place immediately: it caught **two real leaks** on first
run. `PUBLIC_AUDIENCE` came from `corpusAccess.ts`, which imports the membership
resolver and therefore Prisma; and `estimateCostUsd` came from `agents/cost.ts`,
which owns the daily-cap query and therefore also imports Prisma. Both were fixed
by extracting the pure half into a dependency-free leaf
(`audienceTokens.ts`, `agents/costRates.ts`) rather than by loosening the test.

The spend ledger and the cap check *do* touch the database — which is exactly why
they live in `./budget.ts` and are **injected** into the rung as a verdict and a
callback.

### `PatWebSearchLog` — why it carries an identity when the gap log does not

It is a **spend control, not analytics**. It answers "how much has the web tier
cost today?" and "has this user had their allowance?", and neither is answerable
anonymously — you cannot rate-limit per user without knowing the user.

The **question text is absent on purpose**. `PatDeclineLog` already owns the
redacted question with no identity attached; storing the question beside the
`userId` here would silently reconstruct the per-tenant question history that the
decline log's no-identity rule exists to prevent.

---

## Proof obligations (LADDER-2)

| Guarantee | Test |
|---|---|
| Web rung reachable **only** with flag + provider + signed-in non-public + confident-in-scope + cap room | `tests/pat-web-tier.contract.test.ts` |
| Uncertain gate → corpus allowed, web denied; `inScope` alone never unlocks a paid rung | same |
| Renderer refuses zero-citation and empty answers; label verbatim; citations deduped | same |
| Allowlist is label-anchored and rejects lookalikes; env-extensible | same |
| No key → unavailable, not an error; provider error → decline; billed even when uncitable | same |
| Caps default $2 / 10, ignore malformed values rather than disabling themselves | same |
| Rung handler's transitive import graph is free of Prisma and tenant modules | same |
| Web tried at both corpus failures, never after success; `rung=web` only when it really ran | `tests/pat-ladder.contract.test.ts` |
