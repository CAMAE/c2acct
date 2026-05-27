# PAT Development Preview Mode

## Purpose

PAT development preview mode exists so local builders can review major PAT surfaces without weakening real production authentication, authorization, or route protection.

This mode is:

- local/development only
- explicitly gated by env
- isolated from real auth and real RBAC
- disabled in production

## Enable it locally

Add this to `.env.local`:

```env
PAT_ENABLE_DEV_PREVIEW=1
```

Then run:

```bash
pnpm dev
```

Open:

```text
/dev/pat-preview
```

## What it covers

The preview route provides development-only switches for:

- main/home
- sign-in hub
- vendor home
- firm home
- user home
- admin surface
- survey
- results
- insights
- profile

## Important safety boundary

- The preview route does **not** bypass real auth on live routes.
- The preview route does **not** grant operator powers.
- The preview route does **not** expose live protected API data.
- In production, the route is disabled and returns `404`.

## Intended use

Use this route to review shell composition, page framing, audience-specific PAT surface direction, and child-page structure while core role-aware routing is still under development.
