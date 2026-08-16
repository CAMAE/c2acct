import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Block 21a — the app shell was factored VERBATIM out of the root layout into
 * <AppShell>, then (STEP 2b) the routes were split into the (app) and (public) route
 * groups. These pins guard the byte-identical contract:
 *   - AppShell still carries the full standard shell (AppHeader + main.pat-shell-main
 *     + product footer).
 *   - The root layout is now just <html><body.pat-shell>{children}</body> — no shell.
 *   - The (app) group layout ALWAYS renders AppShell.
 *   - The (public) group layout renders AppShell when PAT_ENABLE_NEW_FRONT_DOOR is
 *     OFF (the flag-off byte-identical path — public routes look exactly like today)
 *     and V7PublicShell only when the flag is ON. This is the line that matters: the
 *     route-group MOVES ship live while the V7 shell stays dark.
 */
const ROOT = path.resolve(__dirname, "..");
const read = (rel: string) => readFileSync(path.join(ROOT, rel), "utf8");
const shell = read("app/components/shell/AppShell.tsx");
const rootLayout = read("app/layout.tsx");
const appGroupLayout = read("app/(app)/layout.tsx");
const publicGroupLayout = read("app/(public)/layout.tsx");

describe("AppShell (factored, byte-identical)", () => {
  it("carries the full standard shell — AppHeader + main.pat-shell-main + footer", () => {
    expect(shell).toContain("<AppHeader");
    expect(shell).toMatch(/<main className="pat-shell-main flex flex-1">\{children\}<\/main>/);
    expect(shell).toContain('aria-label="PAT trust and launch links"');
    expect(shell).toContain("data-release-fingerprint");
    // Signed-in footer sign-out affordance preserved.
    expect(shell).toContain("signOutFromFooter");
    expect(shell).toContain("Sign out");
  });

  it("root layout is html/body.pat-shell only — the shell moved to the group layouts", () => {
    expect(rootLayout).toContain("<html lang={locale}>");
    expect(rootLayout).toContain("pat-shell flex min-h-screen flex-col");
    expect(rootLayout).toMatch(/<body[\s\S]*?>\s*\{children\}\s*<\/body>/);
    // The root no longer renders the shell or the header — those live in the groups.
    expect(rootLayout).not.toContain("<AppShell");
    expect(rootLayout).not.toContain("<AppHeader");
    expect(rootLayout).not.toContain("pat-shell-main");
  });

  it("(app) group ALWAYS renders AppShell (never the V7 public shell)", () => {
    expect(appGroupLayout).toMatch(/<AppShell>\{children\}<\/AppShell>/);
    // No flag gate and no V7 shell import/render — the (app) group can't go dark.
    expect(appGroupLayout).not.toMatch(/import .*V7PublicShell/);
    expect(appGroupLayout).not.toContain("<V7PublicShell");
    expect(appGroupLayout).not.toContain("isNewFrontDoorEnabled(");
  });

  it("(public) group renders AppShell flag-OFF, V7PublicShell flag-ON (dark by default)", () => {
    // Flag-gated: the ONLY branch that swaps in V7PublicShell is guarded by the flag.
    expect(publicGroupLayout).toContain("isNewFrontDoorEnabled");
    expect(publicGroupLayout).toMatch(/isNewFrontDoorEnabled\(\)[\s\S]{0,120}<V7PublicShell>/);
    // Flag-off (default) path renders the same AppShell as every other route today.
    expect(publicGroupLayout).toMatch(/<AppShell>\{children\}<\/AppShell>/);
  });
});
