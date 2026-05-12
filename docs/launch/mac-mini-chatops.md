# Mac Mini Chat-Ops

This is the production-safe chat-ops layer for the PAT Mac mini host.

## Chosen platform

Telegram is the chosen platform.

Why:

- no inbound public webhook is required
- setup friction is lower than Slack for a single operator path
- allowlisting a single chat ID is simple and explicit
- the bot can run as an outbound long-polling launchd agent on the Mac mini

## Required env vars

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_ALLOWED_CHAT_ID`
- `AUTH_URL`
- `AUTH_SECRET`
- `DATABASE_URL`
- `PAT_BOOTSTRAP_DEFAULT_PASSWORD`
- `MAC_MINI_HOST=127.0.0.1`
- `PORT=3000`

## Safe commands

- `/status`
- `/health`
- `/restart`
- `/verify`
- `/logs`
- `/deploy`
- `/revision`
- `/failures`
- `/launch`
- `/help`

Each command maps to a fixed allowlisted script or validation command. No arbitrary shell input is accepted.

## Installed agents

- `com.c2acct.app`
- `com.c2acct.verify`
- `com.c2acct.chatops`
- `com.c2acct.watchdog`

## Setup checklist

1. Create a Telegram bot with BotFather.
2. Send a message to the bot from the operator chat.
3. Capture the numeric chat ID for the approved operator chat.
4. Add `TELEGRAM_BOT_TOKEN` and `TELEGRAM_ALLOWED_CHAT_ID` to `.env.local` on the Mac mini.
5. Run `npm run ops:mac-mini:chatops:self-test`.
6. Run `npm run ops:mac-mini:launchd:install`.
7. Confirm `npm run ops:mac-mini:launchd:check`.
8. Confirm `npm run ops:mac-mini:status`.
9. Send `/status` to the bot and confirm the reply.

## Audit and state files

- chat command audit: `artifacts/mac-mini/state/chatops-audit.jsonl`
- latest watchdog state: `artifacts/mac-mini/state/watchdog-state.env`
- latest watchdog failure: `artifacts/mac-mini/state/chatops-last-failure.txt`
- latest nightly summary: `artifacts/mac-mini/state/latest-nightly-summary.txt`

The admin runtime page at `/admin/runtime` reads the same safe state artifacts and surfaces launch readiness, deploy state, watchdog state, chat-ops state, and recent failure summaries without exposing secrets.

## Recovery

If chat-ops stops responding:

1. Run `npm run ops:mac-mini:launchd:check`.
2. Inspect `artifacts/mac-mini/logs/chatops.stderr.log`.
3. Confirm `TELEGRAM_BOT_TOKEN` and `TELEGRAM_ALLOWED_CHAT_ID` are present in `.env.local`.
4. Restart the bot agent with `launchctl kickstart -k "gui/${UID}/com.c2acct.chatops"`.
5. Run `npm run ops:mac-mini:status`.

If the watchdog is noisy:

1. Inspect `artifacts/mac-mini/state/chatops-last-failure.txt`.
2. Inspect `artifacts/mac-mini/logs/watchdog.stderr.log`.
3. Confirm `npm run ops:mac-mini:health`.
4. Fix the underlying app or DB issue before reenabling restart automation.

## Rollback

To disable the operator layer:

1. `launchctl bootout "gui/${UID}" ~/Library/LaunchAgents/com.c2acct.chatops.plist`
2. `launchctl bootout "gui/${UID}" ~/Library/LaunchAgents/com.c2acct.watchdog.plist`
3. Remove or archive the two plist files from `~/Library/LaunchAgents/`
4. Remove `TELEGRAM_BOT_TOKEN` and `TELEGRAM_ALLOWED_CHAT_ID` from `.env.local`
5. Keep `com.c2acct.app` and `com.c2acct.verify` running if app uptime is still required
