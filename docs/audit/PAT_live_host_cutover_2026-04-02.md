# PAT Live Host Cutover (2026-04-02)

## Goal

Make the validated PAT runtime the actual launchd-owned process on `127.0.0.1:3000` and prove:

- launchd ownership
- canonical-root agreement
- live release fingerprint agreement
- live PAT route/render agreement

## Expected Live Target

- canonical root: `/Users/camerongarrett/work/c2acct-live`
- branch: `recovery/pat-2026-03-31-baseline`
- head: `252b7f39ec77b5459c26791769410b87c4048cec`
- expected release id: `252b7f3:PiIoy2zzgeyjs8bNhSs0P`
- expected auth mode: `github`

## Host Proofing Changes

Strengthened host proofing to expose stale installed launch agents that still point at the old repo root:

- `scripts/mac-mini/common.sh`
- `scripts/mac-mini/launchd-check.sh`
- `scripts/mac-mini/status.sh`

New reported fields:

- `app_plist_root`
- `app_plist_root_status`
- `verify_plist_root`
- `verify_plist_root_status`

`launchd-check.sh` now fails immediately if an installed launch agent plist does not point at the canonical root.

## Current Host State

### Installed launch agents

Installed app plist on host:

- path: `~/Library/LaunchAgents/com.c2acct.app.plist`
- working directory: `/Users/camerongarrett/work/c2acct`
- status: `mismatch`

Installed verify plist on host:

- path: `~/Library/LaunchAgents/com.c2acct.verify.plist`
- working directory: `/Users/camerongarrett/work/c2acct`
- status: `mismatch`

Rendered plists from the canonical repo are correct:

- rendered app root: `/Users/camerongarrett/work/c2acct-live`
- rendered verify root: `/Users/camerongarrett/work/c2acct-live`

### launchd state

- `launchd_app=not-loaded`
- `launchd_verify=loaded`
- loaded verify service still points at `/Users/camerongarrett/work/c2acct/scripts/mac-mini/nightly-verify.sh`

### Env readiness

Host env sources are incomplete for production GitHub auth:

- `.env.local` contains `DATABASE_URL`, `AUTH_SECRET`, `AUTH_URL`, `NEXTAUTH_URL`
- missing: `AUTH_GITHUB_ID`
- missing: `AUTH_GITHUB_SECRET`

### Startup/install guard results

Direct guarded preflight still fails before launch:

```bash
bash scripts/mac-mini/app-start.sh --check
```

Result:

- `Dirty git tree is forbidden for startup.`

```bash
bash scripts/mac-mini/launchd-install.sh --check
```

Result:

- `Dirty git tree is forbidden for startup.`

Host startup is therefore blocked by two independent conditions:

1. the guarded launch path rejects the current dirty tree
2. the guarded launch path would also reject missing `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET`

## Live Port 3000 Proof

### Port owner proof

Command:

```bash
bash scripts/mac-mini/port-owner-proof.sh
```

Result:

- `launchd_service_state=not-loaded`
- `live_port_listening=yes`
- `live_port_owner_state=stale-listener`
- `live_port_owner_pid=25059`
- `live_port_owner_command=next-server`
- `live_release_probe_http=000` from the guarded proof script
- `live_release_id=missing`
- `ownership_check=fail`
- `ownership_failures=launchd_not_loaded,non_launchd_port_owner,live_release_endpoint_unavailable`

Additional host process proof:

```bash
ps -p 25059 -o pid=,ppid=,user=,command=
```

Result:

- `25059 1 camerongarrett next-server (v16.1.6)`

This is a manual or stale non-launchd listener, not the launchd-owned PAT app.

### launchd-check proof

Command:

```bash
bash scripts/mac-mini/launchd-check.sh
```

Result:

- `app_plist_root=/Users/camerongarrett/work/c2acct`
- `app_plist_root_status=mismatch`
- `verify_plist_root=/Users/camerongarrett/work/c2acct`
- `verify_plist_root_status=mismatch`
- `launchd_app=not-loaded`
- `launchd_verify=loaded`
- `env_ready=no missing=AUTH_GITHUB_ID,AUTH_GITHUB_SECRET`
- `Installed launch agent root does not match canonical root.`

### status proof

Command:

```bash
bash scripts/mac-mini/status.sh
```

Result:

- `launchd_app=not-loaded`
- `launchd_verify=loaded`
- `app_plist_root_status=mismatch`
- `verify_plist_root_status=mismatch`
- `listen=yes host=127.0.0.1 port=3000`
- `health=down ... http=000`
- `live_port_owner_state=stale-listener`
- `live_port_owner_pid=25059`
- `live_release_probe_http=000`
- `ownership_check=fail`
- `env_ready=no missing=AUTH_GITHUB_ID,AUTH_GITHUB_SECRET`

## Live Surface Proof

### Fingerprint endpoint

Command:

```bash
curl -fsS http://127.0.0.1:3000/api/release-fingerprint
```

Result:

- `curl: (22) The requested URL returned error: 404`

This alone proves port `3000` is not serving the validated PAT runtime.

### Home page

Command:

```bash
curl -fsS http://127.0.0.1:3000/
```

Result:

- HTML title: `AAE`
- description: `Autonomous Alignment Infrastructure for Accounting Firms.`
- AAE nav and copy are present
- PAT shell is not present

### Sign-in route

Command:

```bash
curl -fsS http://127.0.0.1:3000/sign-in
```

Result:

- `curl: (22) The requested URL returned error: 404`

The canonical PAT sign-in route is missing on live `3000`.

### Login compatibility route

Command:

```bash
curl -fsSI http://127.0.0.1:3000/login
```

Result:

- `HTTP/1.1 200 OK`

This is wrong for PAT. The required contract is:

- `/login` must be compatibility-only
- `/login` must return `307`
- `location: /sign-in`

### Protected route redirect behavior

Command:

```bash
curl -fsSI http://127.0.0.1:3000/vendor
```

Result:

- `HTTP/1.1 307 Temporary Redirect`
- `location: /login?callbackUrl=%2Fvendor`

This is also wrong for PAT. The required contract is redirect into `/sign-in`, not `/login`.

## Cutover Decision

Real host cutover is **not complete**.

Port `3000` is still serving stale AAE from the old root, and the live runtime does not satisfy the PAT launch contract.

## Exact Blockers

1. Installed launch agents still point at `/Users/camerongarrett/work/c2acct` instead of `/Users/camerongarrett/work/c2acct-live`.
2. `com.c2acct.app` is not loaded in launchd.
3. Port `3000` is owned by stale PID `25059`, not the launchd PAT app.
4. Live `/api/release-fingerprint` is missing on `3000` and returns `404`.
5. Live `/` renders AAE, not PAT.
6. Live `/sign-in` is missing.
7. Live `/login` returns `200` instead of `307 -> /sign-in`.
8. Live protected-route redirect behavior still points to `/login`, not `/sign-in`.
9. Production GitHub auth env is incomplete: `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` are missing.
10. The guarded launch path currently rejects the dirty tree, so honest launchd install/start cannot proceed until the live release candidate is committed cleanly.

## Conclusion

The canonical PAT runtime is locally validated on isolated port `3310`, but live host `3000` is still the wrong process and the wrong surface.

The correct launch action remains:

- `FIX_FORWARD_FROM_ROLLBACK_BASELINE`

Real cutover should only proceed after:

1. `AUTH_GITHUB_ID` and `AUTH_GITHUB_SECRET` are present in the live env source
2. the intended launch candidate is on a clean committed head
3. the old-root launch agents are replaced with the canonical-root rendered plists
4. stale PID `25059` is removed only as part of a successful launchd-owned replacement
