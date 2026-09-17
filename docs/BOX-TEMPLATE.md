# BOX-TEMPLATE — the mandatory sections, in this order

Source: PAT-RULES.md Part 3 (v1, 2026-09-11). The one addition is the R50 PROOF line (2026-09-16).

```
FORGE BOX: <name>
REQUIREMENTS: R-lines this box closes (from REQUIREMENTS.md)
ENVIRONMENT: flag table this box builds and proves against (R-C)
EXISTS: per touched surface, what is there now and its fate (R-F)
INTENDED CHANGES: the complete list (R-G)
DOORS: LAW 11 line (subset of EXISTS)
WORK: numbered items, each naming the component it wraps (R-B)
PROOF: guard vs baseline (R-A); tsc/lint/unit/e2e; paired captures on the deployed build with a real account (R-D); zero-occurrence search for any rename (R-J)
PROOF (R50): deploy worktree carries .vercel/project.json before any vercel deploy
NOT VERIFIED: (R-I)
Nothing pushed; Cam types push.
```

Forge refuses a box missing a section. Mythos refuses a report missing PROOF or NOT VERIFIED.
