# Invitee Access

## Purpose
Invitee access provides a controlled secret-code entry path for local demo, white-label review, and pre-launch PAT surface access without weakening the normal PAT auth flow.

## How it works
- Route: `/sign-in/invitee`
- Feature flag: set `PAT_ENABLE_INVITEE_ACCESS=1`
- Codes are resolved server-side through `lib/invitee/access.ts`
- A valid code sets a signed, httpOnly `pat_invitee_access` cookie
- The cookie carries the allowed PAT destination and optional preloaded company context
- Existing vendor / firm / user home routes can use that context without changing normal auth behavior

## Local configuration
Default local demo codes live in:
- `lib/invitee/access.ts`

Optional local override:
- `PAT_INVITEE_CODES_JSON`

Example:
```json
[
  {
    "code": "PAT-VENDOR-ALPHA",
    "label": "Vendor alpha review",
    "audience": "vendor",
    "destinationPath": "/vendor",
    "preloadCompany": {
      "name": "Alpha Vendor",
      "type": "VENDOR"
    }
  }
]
```

## Minimum local env
```bash
PAT_ENABLE_INVITEE_ACCESS=1
PAT_INVITEE_SECRET=replace-me
```

## What is still missing for live rollout
- Production code distribution and rotation policy
- Production invitee secret management
- Optional support for deeper protected-route invitee policies
- Any live c2acct.com / six-site sync remains separate and must use the existing integration boundary
