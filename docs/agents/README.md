# Patalign Agent System

Control-plane runtime for the agents that automate Patalign's internal ops.
See `PATALIGN-AGENT-BLUEPRINT-2026-05-27.md` (architecture) and
`PATALIGN-AGENT-PHASE-1-IMPL-SPEC.md` (build order). This README covers what
**Phase 0** ships; Phase 1 (QA + Smoke, Pilot Ops, Cloudflare Watcher, Telegram
approvals, `/admin` redesign) builds on top of it.

## What Phase 0 is

The foundation that proves the loop: **supervisor → hooks → audit → Neon**. One
trivial `hello-world` agent runs a no-op tool call end to end, and every step is
persisted.

## Layout

```
prisma/schema.prisma            AgentDefinition / AgentRun / AgentStep /
                                AgentAuditLogEntry / AgentApproval (+ enums)
prisma/migrations/..._add_agent_system/migration.sql

agents/hello-world.yaml         agent config (cadence, model, caps, tools, hooks)

lib/agents/
  config.ts        YAML load + zod schema + tool allowlist check
  yaml.ts          dependency-free YAML subset parser (zod-guarded)
  sdk.ts           runAgent / runAgentByKey — the run lifecycle
  hooks.ts         PreToolUse / canUseTool / PostToolUse
  audit.ts         append-only audit-log writer
  budget.ts        per-run hard caps (turns / cost / runtime)
  approvals.ts     approval request (Phase 0: persist + fail-safe deny)
  scheduler.ts     cadence manager (manual + interval; cron = Phase 1)
  registry.ts      agent-key → handler registry
  lifecycle.ts     graceful shutdown (SIGINT/SIGTERM)
  vertical-pack.ts vertical_id resolution (stub; Blueprint §6)
  types.ts         shared runtime types
  json.ts          Prisma-safe JSON coercion

scripts/agents/
  supervisor.ts        launchd entry point (long-lived)
  hello-world.ts       the trivial test agent (also runnable standalone)
  register-agents.ts   imports agent modules to populate the registry

ops/launchd/com.patalign.agent-supervisor.plist   macOS service definition
```

## Run it locally

```bash
pnpm db:up && pnpm db:wait                 # local Postgres
pnpm prisma:generate
pnpm prisma:migrate:local                  # applies add_agent_system
node --import tsx scripts/agents/hello-world.ts   # one-shot; writes a run + audit rows
```

Verify the loop landed:

```sql
SELECT "agentKey", status, "finalSummary" FROM "AgentRun" ORDER BY "startedAt" DESC LIMIT 1;
SELECT "hookPhase", outcome FROM "AgentAuditLogEntry" ORDER BY "createdAt" DESC LIMIT 8;
```

A completed `hello-world` run produces audit rows for `user_message`,
`pre_tool_use`, `post_tool_use`, and `agent_message`.

## Run as a service (Mac mini)

```bash
cp ops/launchd/com.patalign.agent-supervisor.plist ~/Library/LaunchAgents/
launchctl load ~/Library/LaunchAgents/com.patalign.agent-supervisor.plist
tail -f ~/Library/Logs/patalign-agent-supervisor.log
```

## Adding an agent (Phase 1+)

1. Write `agents/<key>.yaml` (cadence, model routing, hard caps, tools, hooks).
2. Implement `scripts/agents/<key>.ts`: define an `AgentHandler`, call
   `registerAgent("<key>", handler)`.
3. Add `import "./<key>";` to `scripts/agents/register-agents.ts`.

The supervisor picks it up from the YAML; the hooks, audit, budget, and approval
layers apply automatically.

## Phase 0 notes / known seams

- **No YAML dependency.** `lib/agents/yaml.ts` parses the config subset in-repo;
  zod re-validates so a mis-parse fails loudly. (A real parser dep was blocked by
  the supply-chain policy.)
- **`AgentDefinition.configYaml` stores JSON** (the serialized config), pending a
  YAML serializer.
- **No model calls yet.** `hello-world` is scripted. Phase 1 wires the Claude
  Agent SDK `query()` into `runAgent`'s existing lifecycle.
- **Approvals fail safe.** `requestApproval` persists a pending row and denies;
  the Telegram round-trip is Phase 1d.
- **Cron cadence is Phase 1.** The scheduler drives `manual` + `interval` now.
