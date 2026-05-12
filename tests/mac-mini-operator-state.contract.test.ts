import { describe, expect, it } from "vitest";
import {
  deriveMacMiniLaunchReadiness,
  parseMacMiniNightlySummary,
  parseMacMiniStatusOutput,
} from "@/lib/macMiniOperatorState";

describe("mac mini operator state contracts", () => {
  it("parses app env and chat-ops env readiness separately from status output", () => {
    const status = parseMacMiniStatusOutput(`
time=2026-04-01T18:07:32Z
repo=/Users/camerongarrett/work/c2acct
branch=feat/mac-mini-ops-hardening
commit=078a41f
git_dirty=dirty
launchd_mode=available
launchd_app=loaded
launchd_verify=loaded
launchd_chatops=not-loaded
launchd_watchdog=not-loaded
listen=yes host=127.0.0.1 port=3000
public_origin=https://patalign.com
health=down status=fail url=http://127.0.0.1:3000/api/health/db http=000
app_url=http://127.0.0.1:3000
build_id=NwR9GTLeKqk91VaQD0tKJ
build_time=2026-04-01T18:07:42Z
build_reason=nightly-verify
build_commit=078a41f
build_branch=feat/mac-mini-ops-hardening
build_age=1m
env_file=present
node_modules=present
build=present
env_ready=no missing=PAT_BOOTSTRAP_DEFAULT_PASSWORD
chatops_env_ready=no missing=TELEGRAM_BOT_TOKEN,TELEGRAM_ALLOWED_CHAT_ID
last_verify=artifacts/mac-mini/reports/nightly-summary-20260401T180732Z.txt
    `);

    expect(status.preflight.envReady).toBe(false);
    expect(status.preflight.envMissingCount).toBe(1);
    expect(status.preflight.chatopsEnvReady).toBe(false);
    expect(status.preflight.chatopsMissingCount).toBe(2);
    expect(status.health.state).toBe("down");
    expect(status.listen.active).toBe(true);
  });

  it("derives blocked launch readiness from missing app env and failed nightly state", () => {
    const status = parseMacMiniStatusOutput(`
launchd_chatops=not-loaded
launchd_watchdog=not-loaded
health=down status=fail url=http://127.0.0.1:3000/api/health/db http=000
env_ready=no missing=PAT_BOOTSTRAP_DEFAULT_PASSWORD
chatops_env_ready=no missing=TELEGRAM_BOT_TOKEN,TELEGRAM_ALLOWED_CHAT_ID
    `);
    const nightly = parseMacMiniNightlySummary(`
timestamp=2026-04-01T18:07:32Z
env_ready=no missing=PAT_BOOTSTRAP_DEFAULT_PASSWORD
chatops_env_ready=no missing=TELEGRAM_BOT_TOKEN,TELEGRAM_ALLOWED_CHAT_ID
release_drift=in-sync
failures=1
failed_steps=health
health_summary=status=fail url=http://127.0.0.1:3000/api/health/db http=000
    `);

    const readiness = deriveMacMiniLaunchReadiness({ status, nightly });

    expect(readiness.state).toBe("blocked");
    expect(readiness.reasons).toContain("Required app setup is incomplete.");
    expect(readiness.reasons).toContain("App health is currently failing.");
    expect(readiness.reasons).toContain("Nightly verification has 1 failed step.");
    expect(readiness.reasons).toContain("Chat-ops or watchdog automation is not fully active.");
  });
});
