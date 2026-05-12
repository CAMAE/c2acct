# Patalign.com Production Launch

This document is the exact production contract for launching PAT on `https://patalign.com` from the Mac mini host.

## Canonical production values

- Public origin: `https://patalign.com`
- Canonical auth origin: `https://patalign.com`
- App listen host: `127.0.0.1`
- App listen port: `3000`
- Public reverse proxy: Nginx terminating TLS and proxying to `http://127.0.0.1:3000`
- External OAuth callback: none required for the current credentials-based production auth path
- Internal auth route base: `https://patalign.com/api/auth/[...nextauth]`

## Production env file

Use `.env.local` on the Mac mini with these exact keys:

```dotenv
NODE_ENV=production
DATABASE_URL=postgresql://replace-user:replace-password@replace-db-host:5432/c2acct?schema=public
AUTH_URL=https://patalign.com
NEXTAUTH_URL=https://patalign.com
AUTH_SECRET=replace-with-a-long-random-secret
PAT_PRODUCTION_DOMAIN=patalign.com
PAT_BOOTSTRAP_DEFAULT_PASSWORD=replace-with-a-strong-bootstrap-password
MAC_MINI_HOST=127.0.0.1
PORT=3000
MAC_MINI_PUBLIC_ORIGIN=https://patalign.com
```

## DNS

1. Point the `patalign.com` A record to the Mac mini public IP.
2. Point the `www.patalign.com` A record to the same public IP.
3. Keep TTL low during cutover, for example `300`.

## TLS

1. Issue a certificate for `patalign.com` and `www.patalign.com`.
2. Install it where the Nginx template expects:
   - `/etc/letsencrypt/live/patalign.com/fullchain.pem`
   - `/etc/letsencrypt/live/patalign.com/privkey.pem`
3. Keep the app itself on loopback HTTP; TLS terminates at Nginx.

## Reverse proxy

Use [ops/mac-mini/nginx/patalign.com.conf.example](/Users/camerongarrett/work/c2acct/ops/mac-mini/nginx/patalign.com.conf.example) as the production template.

Required proxy behavior:

- Redirect `http://patalign.com` and `http://www.patalign.com` to `https://patalign.com`
- Redirect `https://www.patalign.com` to `https://patalign.com`
- Preserve `Host`
- Send `X-Forwarded-Host`
- Send `X-Forwarded-Proto=https`
- Send `X-Forwarded-For`
- Proxy to `http://127.0.0.1:3000`

## Mac mini rollout

1. Pull the release branch on the Mac mini.
2. Run `pnpm install`.
3. Write `.env.local` using the production contract above.
4. Run `npm run validate:patalign:prod`.
5. Run `npm run prisma:migrate:deploy`.
6. If explicit bootstrap users must be refreshed, run:
   - `PAT_ENABLE_BOOTSTRAP_USERS=1 PAT_BOOTSTRAP_DEFAULT_PASSWORD='replace-with-a-strong-bootstrap-password' PAT_BOOTSTRAP_VENDOR_EMAIL='vendor.bootstrap@example.com' PAT_BOOTSTRAP_FIRM_EMAIL='firm.bootstrap@example.com' PAT_BOOTSTRAP_INDIVIDUAL_EMAIL='individual.bootstrap@example.com' PAT_BOOTSTRAP_ADMIN_EMAIL='admin.bootstrap@example.com' npm run seed:bootstrap-users`
7. Run `npm run build`.
8. Install or refresh launch agents with `npm run ops:mac-mini:launchd:install`.
9. Confirm local health with `npm run ops:mac-mini:health`.
10. Confirm public reachability with `npm run smoke:patalign:launch`.

## Launch validation

Run these in order:

```bash
npm run validate:patalign:prod
npm run build
npm run start:loopback
curl -fsS http://127.0.0.1:3000/api/health/db
curl -I -s https://patalign.com/
curl -fsS https://patalign.com/api/health/db
npm run smoke:patalign:launch
```

Success criteria:

- `/api/health/db` returns `ok: true`
- the health payload reports `auth.authUrl` as `https://patalign.com`
- `productionAuthReady` is `true`
- `www.patalign.com` redirects to `https://patalign.com`
- no mixed-domain cookie or callback warnings appear

## Rollback checklist

If cutover fails:

1. Restore the previous Nginx site config.
2. Reload Nginx.
3. Re-point DNS if the issue is host-level rather than app-level.
4. On the Mac mini, revert to the previous app commit.
5. Run `pnpm install` if lockfile/package state changed.
6. Run `pnpm build`.
7. Reinstall launch agents with `npm run ops:mac-mini:launchd:install`.
8. Confirm local rollback health with `npm run ops:mac-mini:health`.
9. Confirm public rollback health with `curl -I -s https://patalign.com/`.

## Watchouts

- `AUTH_URL` must be exactly `https://patalign.com`
- `MAC_MINI_HOST` must stay `127.0.0.1`
- do not bind Next.js directly to the public interface
- do not serve mixed `www` and apex cookie domains at the same time
- do not terminate TLS in-app while also terminating at Nginx
