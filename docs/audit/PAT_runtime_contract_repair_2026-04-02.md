# PAT Runtime Contract Repair (2026-04-02)

## Canonical runtime contract

- Canonical release root: `/Users/camerongarrett/work/c2acct-live`
- Forbidden live roots:
  - `/Users/camerongarrett/work/c2acct`
  - `/private/tmp/c2acct-main-auth`
- Auth mode: `github`
- Runtime source type: `standalone-build`
- Production start command: `node .next/standalone/server.js`

## Required env matrix

For `github` mode:

- `DATABASE_URL`
- `AUTH_SECRET` or `NEXTAUTH_SECRET`
- `AUTH_URL` or `NEXTAUTH_URL`
- `AUTH_GITHUB_ID`
- `AUTH_GITHUB_SECRET`

Production restriction:

- `PAT_ENABLE_LOCAL_REVIEW_AUTH=1` is forbidden in production runtime validation.

## Fail-closed rules

Startup and install now refuse:

- wrong root
- dirty root
- `/private/tmp/*`
- `/Users/camerongarrett/work/c2acct`
- missing env required by the selected auth mode
- missing standalone server artifact
- non-canonical working directory at app start

## Operator visibility

Versioned runtime contract:

- `ops/release/canonical-root.json`

Install-time state:

- `artifacts/mac-mini/state/canonical-root.json`

Status output now prints:

- canonical root
- branch
- commit SHA
- git dirty state
- auth mode
- start command

## Launchd contract

- `launchd-install.sh` renders plists from the canonical root only.
- `launchd-install.sh --check` proves the rendered app and verify plists point at the canonical root.
- `launchd-install.sh` refuses real install until `npm run release:prelaunch` passes.
