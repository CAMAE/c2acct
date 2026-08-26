# The Pat corpus program

The corpus is the one place Pat is allowed to speak from. Anything indexed here
becomes something the assistant will state to a customer as fact, in Patalign's
voice, with a citation. Everything below follows from that.

Four pieces landed together, all additive and all inert on the day they shipped:
a **depth tier** on the corpus, a reserved **public audience**, the **decline
(gap) log**, and the **import lint**.

---

## 1. Depth tiers — `KnowledgeSource.depthTier`

`CORE | ELITE`, defaulting to `CORE`.

- **CORE** — the corpus as it exists today. Readable by any entitled audience.
- **ELITE** — depth that requires an ELITE membership to retrieve.

Enforced in the SQL `WHERE` of `lib/patAssistant/retrieveHelp.ts`, never by
prompting and never by the client. Three walls now compose there, all
deny-by-default:

| # | Wall | Dropped by |
|---|---|---|
| 1 | `kind = 'help_doc'` | nothing, ever |
| 2 | `roleAccess` — the caller's audience | `unrestricted` (consultant/admin) |
| 3 | `depthTier` — an allowlist from the caller's plan | nothing |

**`unrestricted` drops wall 2 only.** Being entitled to ask about any audience's
help is not the same entitlement as being entitled to read paid depth; collapsing
the two would hand ELITE content to every consultant seat.

The tier is an **allowlist**, not a `<=` comparison, so a depth tier added to the
enum later is invisible to every existing viewer until it is named on purpose.

> **The wall ships before the content it gates.** Every existing source is CORE by
> column default, and CORE is readable by everyone, so retrieval returns exactly
> what it returned before. That inertness is the point: no ELITE source can ever
> be authored into an unguarded corpus.

The viewer's plan is resolved server-side in `lib/patAssistant/audience.ts`,
alongside the audience, because both decide what the SQL wall admits. A
membership lookup that fails degrades to `NO_MEMBERSHIP` — **less** access, never
more, and never a 500 on a help question.

## 2. The reserved `public` audience

A `roleAccess` token for content an **unauthenticated** public entry path may
retrieve. That path does not exist yet, and **nothing in this box serves it: the
wall learns the word, no surface speaks it.**

It is a roleAccess audience rather than a new column because `roleAccess` already
means "which audiences may retrieve this", and a parallel boolean would create
two places to ask one question — the failure mode that produces a source visible
under one rule and hidden under the other.

Three guards, each tested:

1. **No authenticated audience can be `public`.** Enforced by the *type system*:
   `PublicIsNotAPortalAudience` in `audience.ts` fails the build if anyone adds
   `"public"` to `PortalAudience`. (A runtime check was written first and
   TypeScript rejected it as unreachable — a stronger result than the check.)
2. **A caller claiming `public` without `publicEntry` gets nothing**, and no
   query is issued at all.
3. **`publicEntry` is pinned to CORE depth** regardless of what a caller passes —
   the public path is signed out by definition, so it cannot carry an
   entitlement. A contract test asserts no file outside the retrieval seam
   mentions `publicEntry`.

## 3. The decline (gap) log — `PatDeclineLog`

Every question Pat refuses to answer is written here. A decline is the single
most informative event the assistant produces: a real user, a real audience, a
real question the corpus could not answer. Discarded, it leaves corpus authoring
to guesswork.

Three rules, all load-bearing:

1. **Redacted before storage**, through `lib/agents/redact.ts` — the same
   redactor the audit trail uses, so there is one definition of
   "credential-shaped" and it cannot drift. The realistic failure is a user
   pasting an API key into the chat box while asking why their integration
   fails; without this, the gap log becomes a second durable home for live keys.
2. **No identity.** No `userId`, `companyId` or `subjectId`. This table answers
   *"what is the corpus missing for firms?"*, never *"what did this firm ask?"* —
   the second is a per-tenant question history, a different product needing
   different consent.
3. **Logging never fails the request.** Guarded in `recordPatDecline` *and* again
   at the route boundary. That is not redundant: the logger swallowing its own
   errors is an implementation detail, while "a gap-log failure never reaches the
   user" is a property of the route.

Declining and logging are the **same act** (`declineAndLog` in
`app/api/pat/route.ts`), so the two cannot drift apart — a decline that is not
logged is a gap the program cannot see.

Rungs: `scope_gate`, `corpus_miss`, `corpus_insufficient`, `unavailable`. Stored
as a string so a later rung can be logged without a migration; the known values
are pinned by contract test.

`getPatDeclineDigest()` is the weekly read — two aggregates and a capped sample,
small on purpose. Anything larger invites reading the table as a transcript,
which is the use the no-identity rule exists to prevent. The caller owns the
admin gate, like every other admin surface.

## 4. The import lint

Two gates, both pure and offline, run **before the first write** — not per
article, because a corpus that is half-indexed and then rejected is worse than
one that is not indexed at all. Both the dry-run planner and the real importer
call them, and they **throw**: a lint that only warns during an unattended seed
is a lint nobody sees.

### Banned constructs

`outcome-promise` · `financial-claim` · `price` · `competitor-name` ·
`roadmap-tone` · `ai-marketing`

The distinction that makes this usable is **not lexical**. A blanket ban on
"guarantee" would be unusable, because the honest half of Patalign's story needs
that word:

| | |
|---|---|
| **FLAG** | "We guarantee results." — an *outcome promise*: a claim about the customer's result. |
| **ALLOW** | "Deterministic arithmetic guarantees repeatability." — a *mechanism statement*: a property of the system. |

Two exemption families clear a claim rule, applied **per sentence** so a
mechanism statement cannot launder a promise elsewhere in the same paragraph:

- **mechanism** — the guarantee is about determinism, arithmetic, idempotence, a
  constraint, byte-identical output.
- **negation** — the sentence *denies* the claim. "It is directional, not a
  guaranteed outcome" is the strongest sentence in the shipping corpus, and the
  first draft of the rule flagged it. A lint that punishes the disclaimer while
  the promise goes unwritten teaches authors to delete their hedges — the precise
  opposite of the intent.

Neither exemption clears `price` or `competitor-name`: *"we are not QuickBooks"*
still puts a competitor's name in Pat's mouth, and *"it does not cost $99"* still
states a price.

Competitor names are a small explicit denylist, env-extensible via
`PAT_CORPUS_BANNED_NAMES`. Banned in the **help corpus only** — the vendor
taxonomy legitimately contains real product names, which is a different surface
with a different purpose.

### Near-duplicates

Jaccard similarity over word trigrams, threshold `0.6`
(`PAT_CORPUS_DUPLICATE_THRESHOLD`). Tuned to catch copy-paste-and-edit, not topic
overlap — independently written articles on related topics land well below it.

Duplication in a retrieval corpus is not merely untidy: two articles saying
nearly the same thing **split the lexical rank between them**, so a question that
should surface one strong answer surfaces two weak halves and may fall below the
cut entirely. The failure is silent — retrieval returns something, just the wrong
something.

---

## Proof obligations

| Guarantee | Test |
|---|---|
| Tier predicate always emitted; CORE-only without ELITE; allowlist is deny-by-default; public path pinned to CORE; `publicEntry` unused by any surface | `tests/corpus-walls.contract.test.ts` |
| Outcome-promise vs mechanism vs negation; prices/competitors not clearable; shipping corpus clean; near-duplicate gate | `tests/corpus-lint.contract.test.ts` |
| Redaction of pasted credentials; no identity columns; write failure never throws; digest grouping and windowing | `tests/pat-decline-log.contract.test.ts` |
| Every decline path logs, with its rung; a success logs nothing; a gap-log failure never reaches the user | `tests/pat-route-gate.test.ts` |
| Plan resolved server-side; unrestricted ≠ paid depth; membership failure degrades down | `tests/pat-audience.test.ts` |
