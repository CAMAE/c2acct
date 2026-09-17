# PAT-RULES — THE WORKING RULES FOR ANYONE (HUMAN OR MODEL) WHO TOUCHES PATALIGN

**Version 1, 2026-09-11.** Written from the sixteen-entry mistake catalog (PATALIGN-MISTAKE-CATALOG-2026-09-11.md). This file is the contract. It lives in three places and they must match: the repo root (`PAT-RULES.md`, referenced from `CLAUDE.md` so Forge reads it every session), `~/Documents/PATALIGN-MEMORY/PAT-RULES.md` (Mythos), and Cam's copy. A model that has not read this file has not started.

## Part 1. Why these rules exist, in one paragraph

Every serious loss this month had the same shape: a surface was rebuilt from a description instead of from the thing it replaced, the environment it ran in was assumed instead of read, the proof measured a proxy instead of the user's path, and the requirement that would have caught it lived in a conversation instead of a file. Models change, memory resets, and the same four shapes come back. The rules below make each shape mechanically impossible rather than a matter of remembering.

## Part 2. The rules

**R-A. Production is the floor.** `ops/qa/baseline-inventory.json` is the crawl of production with production's real flags. The guard test compares every build to it in CI. A control, page, field, or copy block that exists in the baseline leaves only through `ops/qa/link-removals.json` with Cam's ruling quoted. There is no other way for anything to disappear.

**R-B. Composition, not replacement.** A new surface wraps the component it improves; it does not rewrite it. A box that changes a page names the component it wraps and the component keeps its own tests. If the new design cannot be built by wrapping, the box says so and lists every element of the old component with its fate (kept, moved, removed-by-ruling) before a line is written.

**R-C. Read the environment, never assume it.** Any build, crawl, preview, or test states its full flag table read from the live source (`vercel env` or the API, by name and value for flags, names only for secrets), and the report shows the diff against Production's table. "Mirrors production" without the table is a defect in the report.

**R-D. Proof on the real path.** A change is proven when a real account walks the user's path on the deployed build: sign in, click, follow the redirects, capture. Unit tests, the atlas, and e2e are necessary and never sufficient. For anything a customer sees, the proof is the paired capture, production left, new build right, same route, same tier.

**R-E. The requirements ledger is the memory.** Every requirement Cam states gets a numbered line in `REQUIREMENTS.md` in the same turn it is said. Every box cites the lines it closes. Every report marks each cited line CLOSED with the proof or leaves it OPEN with the reason. A requirement that is not in the ledger does not exist, so the model's job when Cam says something is to write it down before answering.

**R-F. The EXISTS line.** Every box that touches a surface begins with what is there now, taken from the artifact (the component file, the baseline record, the live page), not from memory: controls, form fields by label, copy blocks, data shown, links out, flag gates. The box then says what happens to each. LAW 11's DOORS line is the controls subset of this; EXISTS covers everything.

**R-G. The INTENDED-CHANGES list.** Every box declares the differences it intends to produce. After the box, the diff (controls, text, fields, routes) must contain only those. Anything else in the diff is a defect, whether or not it looks like an improvement.

**R-H. Two-site acceptance.** No preview goes to a human reviewer (Leslie, Randy, Brian, a vendor) until the paired sweep passes on every portal and tier that reviewer will see, on the exact deployment they will open, with its link in the ledger.

**R-I. Say what was not verified.** Every report ends with a NOT-VERIFIED section naming what the proof did not cover. "Everything passed" without that section is incomplete. This is how the next reviewer knows where to look.

**R-J. One decision, one place.** A ruling (naming, price, behavior) is applied everywhere it appears, and the box proves completion by a search that returns zero remaining occurrences, not by "done." Partial application is a mistake, not progress.

**R-K. Coupling is declared.** Anything that depends on something that can change underneath it (a share link on a deployment, a draft on a link, a test on an external folder) says so where it is used, and the change that would break it is listed as a step in the box that makes the change.

**R-L. Scope is exact.** A fix is neither larger nor smaller than the requirement it cites. A "while I'm in there" change is a separate line in INTENDED-CHANGES or it is not made.


**R-M. Memory is exported, not trusted.** A model's context is a cache, and compaction empties it. At every session close, and before any compaction the model can see coming, Mythos copies its full transcript (the session .jsonl) into `~/Documents/PATALIGN-MEMORY/transcripts/<date>-<session>.jsonl` and writes HANDOFF.md from it. The last three sessions' transcripts are kept; older ones roll to `transcripts/archive/`. A new model or a fresh session reads HANDOFF.md first and may grep the transcripts for anything HANDOFF.md does not answer, before asking Cam to repeat himself. The PAT-memory dream state (Cam's tool) is the second copy; the transcript folder is the first. Nothing Cam has said is allowed to exist only in a context window.

## Part 3. The box template (mandatory sections, in this order)

```
FORGE BOX: <name>
REQUIREMENTS: R-lines this box closes (from REQUIREMENTS.md)
ENVIRONMENT: flag table this box builds and proves against (R-C)
EXISTS: per touched surface, what is there now and its fate (R-F)
INTENDED CHANGES: the complete list (R-G)
DOORS: LAW 11 line (subset of EXISTS)
WORK: numbered items, each naming the component it wraps (R-B)
PROOF: guard vs baseline (R-A); tsc/lint/unit/e2e; paired captures on the deployed build with a real account (R-D); zero-occurrence search for any rename (R-J)
NOT VERIFIED: (R-I)
Nothing pushed; Cam types push.
```

Forge refuses a box missing a section. Mythos refuses a report missing PROOF or NOT VERIFIED.

## Part 4. The model-change protocol (the "we upgraded and it forgot" problem)

Memory does not survive a model change; files do. So nothing that matters is allowed to live only in a model.

1. **Session close, every time.** Mythos writes `HANDOFF.md` in PATALIGN-MEMORY: pointers (origin HEAD, prod fingerprint, preview deployment and link, Neon branch), the flag tables, the open R-lines, the boxes in flight, the traps found this session (one line each), and the last ten ledger entries. Forge banks its own ledger the same way.
2. **New model, first turn.** Before accepting any task it reads, in order: PAT-RULES.md, MYTHOS.md (the laws), HANDOFF.md, REQUIREMENTS.md, the last fifty lines of SESSION-LEDGER.md. Then it re-verifies every pointer by command (`git rev-parse`, `/api/release-fingerprint`, `vercel env ls`) and writes a one-paragraph "state as I find it" to the ledger. If any pointer disagrees with HANDOFF.md, that is the first thing it reports.
3. **Nothing is remembered.** A model that says "I recall" without a file line is guessing. Cam can ask "where is that written?" at any time and the answer is a path and a line.
4. **The catalog is append-only.** Every mistake found, by anyone, gets a numbered entry with its trend. The trends table is re-scored. A trend whose score rises after a rule exists means the rule is not installed, and installing it becomes the next box.
5. **Quarterly re-read.** At each model upgrade and at least once a quarter, Cam and Mythos read PAT-RULES.md together and strike or add. The version number goes up; the old version stays in git.

## Part 5. How this gets installed (the box, so it is not advice)

- Forge: commit `PAT-RULES.md` at the repo root; add "Read PAT-RULES.md before any box" as the first line of `CLAUDE.md`; add the box template as `docs/BOX-TEMPLATE.md`; wire the guard into CI (box 1); add `pnpm sweep:pair` (box 3) that produces the paired captures for a given deployment and identity list.
- Mythos: PAT-RULES.md and HANDOFF.md in PATALIGN-MEMORY; MYTHOS.md line 1 becomes "Read PAT-RULES.md"; the session-close ritual in Part 4 runs before any "idle" message.
- Cam: the only person who can add to `link-removals.json` or strike a rule. When Cam says a requirement, the model's reply begins with the R-number it was filed under.

NOT-CLOSED: this file is v1; installation is a box; R-A through R-L become effective the moment box 1 lands the baseline.
