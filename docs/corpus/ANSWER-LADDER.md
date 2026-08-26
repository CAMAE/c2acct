# The Pat answer ladder

Cam's approved ladder has five rungs:

1. **Corpus** — grounded in Patalign's own help library.
2. **Live account data** — the firm's own numbers (Big Brain Pat, Phase C).
3. **Web-grounded** — mandatory citations, a visible "from the web" label.
4. **Honest decline** — say so, and log the gap.
5. **Human handoff.**

**LADDER-1 (this box) builds the scope gate, rung 1 and rung 4**, plus the shape
of the walk, so the remaining rungs are *inserted* rather than retrofitted.

The web tier is **LADDER-2**, a separate box behind `PAT_ENABLE_PAT_WEB_TIER`. A
contract test asserts no ladder module references it yet.

---

## Rung 0 — the scope gate

Pat is Patalign's in-product guide, not a free general-purpose assistant. The
gate declines "what is the capital of France" and "write me a Python script" at
the door, before retrieval, before a generation, and — once LADDER-2 lands —
before a paid search.

### It fails OPEN, and that is the important decision

When the gate is unsure, the question **proceeds**.

This is safe because the gate is a **cost and scope control, not a security
wall**. The wall is downstream and unchanged: retrieval is restricted to the
caller's audience, tier and vertical, and the model answers only from what
retrieval returned. An out-of-scope question that slips through finds nothing in
the corpus and declines one rung later — it costs a retrieval, not a leak.

Failing closed would trade that cheap, self-correcting miss for an expensive
one: a firm asking a real question in wording the classifier did not recognise
gets told Pat cannot help, with no second chance. **A false negative wastes a
query; a false positive loses a user.**

> The direction reverses for the web tier, where passing the gate spends real
> money. LADDER-2 gets its own decision; this box does not pre-empt it.

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
