# GitHub Main Reconciliation

Date: 2026-04-01

## Scope

This artifact reconciles the major implementation claims made in prior Codex responses against:

- `origin/main`
- current local `HEAD` on `feat/mac-mini-ops-hardening`
- current local worktree state

It does not assume prior assistant text is true. Each claim is marked only after verification in code and git history.

## Git State Verified

- current branch: `feat/mac-mini-ops-hardening`
- tracking branch: `origin/feat/mac-mini-ops-hardening`
- `origin/main` fetched on 2026-04-01
- local branch is ahead of `origin/main` by 15 commits
- local worktree is dirty with substantial uncommitted changes layered on top of `HEAD`

Commands used:

- `git fetch origin`
- `git status --short --branch`
- `git branch -vv`
- `git log --oneline origin/main..HEAD`
- `git diff --stat origin/main...HEAD`
- `git diff --name-only origin/main...HEAD`
- targeted `git show origin/main:<path>`
- targeted `git show HEAD:<path>`

## Claim Matrix

| Claim | `origin/main` | `HEAD` on current branch | Local worktree | Verdict |
| --- | --- | --- | --- | --- |
| Credentials auth landed | No. `origin/main:auth.config.ts` is GitHub-only OAuth. | Partial only. `HEAD:auth.config.ts` is hybrid GitHub plus local-review credentials, not the claimed production credentials-only path. | Yes. Current `auth.config.ts` is credentials-only and points at `lib/auth/credentials.ts` and `lib/auth/passwords.ts`. | Only local/worktree, not on main. |
| `passwordHash` landed | No. `origin/main:prisma/schema.prisma` has no `passwordHash`. | No. `HEAD:prisma/schema.prisma` also has no `passwordHash`. | Yes. Current `prisma/schema.prisma` has `passwordHash`, and local migration `prisma/migrations/20260401133000_add_user_password_hash/migration.sql` exists. | Only local/worktree, not on main or branch `HEAD`. |
| `/sign-in` landed | No. `origin/main` has no `app/sign-in/page.tsx`. | Yes. `HEAD` contains `app/sign-in/page.tsx` and role routes. | Yes, with further local edits. | On non-main branch, with additional local edits. |
| Invitee retired from live path | No. `origin/main` has no `/sign-in` system and no retired invitee redirect. | No. `HEAD:app/sign-in/invitee/page.tsx` is still an active invitee code flow. | Yes. Current `app/sign-in/invitee/page.tsx` redirects to `/sign-in?error=invitee_retired`. | Only local/worktree, not on main or branch `HEAD`. |
| `patalign.com` launch docs landed | No. `origin/main` does not contain `docs/launch/patalign-production-launch.md`. | No. `HEAD` does not contain it either. | Yes. Current worktree has `docs/launch/patalign-production-launch.md`, `ops/mac-mini/nginx/patalign.com.conf.example`, and `scripts/validate-patalign-production.ts`. | Only local/worktree. |
| Telegram/chat-ops landed | No. `origin/main` has no Telegram/chat-ops files or scripts. | No. `HEAD` has Mac mini ops basics only, no Telegram/chat-ops agent layer. | Yes. Current worktree has `scripts/mac-mini/telegram-bot.ts`, `chatops-dispatch.ts`, `chatops-self-test.sh`, new launchd templates, and docs. | Only local/worktree. |
| Mac mini launchd operator layer landed | Partial. `origin/main` has none of the Mac mini ops layer. | Partial. `HEAD` has `ops/mac-mini/launchd/com.c2acct.app.plist.template`, `com.c2acct.verify.plist.template`, and base status/health/install scripts. | Yes, expanded. Current worktree adds chat-ops and watchdog launchd agents plus richer status/health integration. | Base ops layer is on branch `HEAD`; expanded always-on operator layer is only local/worktree. |
| PAT utility integrity pass landed | No. `origin/main` does not contain the utility integrity doc or the new utility-scope insight framing. | Partial. `HEAD` already contains the broad product utility registry and product assessment engine, but not the new integrity-contract doc or utility-scope framing. | Yes. Current worktree adds `docs/architecture/product-utility-integrity-contract.md` plus `utilityScopeLabel` and revised evidence framing. | Base product-utility system is on branch `HEAD`; integrity pass is only local/worktree. |

## Key File Evidence

### Verified on `origin/main`

- `auth.config.ts` still uses GitHub OAuth:
  - `next-auth/providers/github`
  - `AUTH_GITHUB_ID`
  - `AUTH_GITHUB_SECRET`
- `app/login/page.tsx` still renders a GitHub-only sign-in form
- `docs/architecture/auth-env-contract.md` still lists GitHub env keys as required
- `package.json` has no Telegram/chat-ops or `validate:patalign:prod` scripts
- `origin/main` does not contain:
  - `app/sign-in/page.tsx`
  - `docs/launch/patalign-production-launch.md`
  - `docs/launch/mac-mini-chatops.md`
  - `lib/auth/credentials.ts`
  - `lib/auth/passwords.ts`
  - `scripts/validate-patalign-production.ts`
  - `scripts/mac-mini/telegram-bot.ts`
  - `docs/architecture/product-utility-integrity-contract.md`
  - `prisma/migrations/20260401133000_add_user_password_hash/migration.sql`

### Verified on branch `HEAD`

- `/sign-in` exists and is already a major non-main feature
- `auth.config.ts` is not yet the claimed credentials-only production path
- invitee flow is still live in `HEAD`
- Mac mini base ops layer is present
- product utility registry and product assessment runtime are present

### Verified only in the current worktree

- credentials-only auth implementation
- `passwordHash` schema and migration
- invitee retirement redirect
- `patalign.com` production launch contract and Nginx template
- Telegram chat-ops and watchdog layer
- product utility integrity contract doc and utility-scope insight framing

## Local vs Main Findings

1. The pasted claims do not describe `origin/main`.
2. Some claims describe work that exists only in the dirty local worktree.
3. Some claims describe work that exists on the feature branch history, but still not on `origin/main`.
4. The most important mismatch is auth:
   - `origin/main`: GitHub OAuth only
   - branch `HEAD`: hybrid GitHub plus local-review credentials
   - worktree: credentials-only production path with password hashes
5. The second major mismatch is ops:
   - branch `HEAD`: base Mac mini ops layer exists
   - worktree: expanded launch/Telegram/watchdog layer exists
6. The product utility system broadly exists on branch `HEAD`, but the latest integrity pass is still local-only.

## Recommended Landing Plan

Create one reconciliation branch after the matrix is reviewed:

- branch name: `reconcile/github-main-claims-2026-04-01`

Planned commit series:

1. `audit(reconciliation): add GitHub main reconciliation matrix`
   - land this artifact first
2. `auth(credentials): move from hybrid/non-main auth to one verified production path`
   - only after isolating unrelated worktree edits
3. `ops(launch): add patalign.com launch contract and validation`
4. `ops(chatops): add Telegram/watchdog operator layer`
5. `product(utility): land integrity framing and updated evidence contract`

## Packaging Strategy

1. Do not branch directly from the current dirty worktree without first separating unrelated edits.
2. Use the reconciliation artifact as the checklist.
3. For each claim area, decide whether it should be landed by:
   - cherry-picking existing branch commits
   - staging selected local worktree files into a fresh branch
   - or re-implementing from `origin/main` if the local state is too tangled

## Immediate Recommendation

Because the local worktree is heavily mixed, do not open a PR from the current state as-is.

Instead:

1. preserve the current dirty state
2. create a clean reconciliation branch from `origin/main`
3. port each verified claim area deliberately in the commit order above
4. skip any claim that exists only in assistant text and not in code

## Follow-on Prompts If Re-Implementation From Main Is Needed

If the local state cannot be cleanly packaged, generate follow-on implementation prompts from `origin/main` for:

- production credentials auth and password-hash migration
- invitee retirement and canonical `/sign-in`
- patalign.com launch contract
- Telegram/watchdog operator layer
- product utility integrity pass
