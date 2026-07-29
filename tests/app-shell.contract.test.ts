import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Block 21a — the app shell was factored VERBATIM out of the root layout into
 * <AppShell>. These pins guard the byte-identical contract: the standard shell
 * (AppHeader + main.pat-shell-main + product footer) is fully in AppShell, and the
 * root layout renders it inside body.pat-shell. STEP 2 adds the (public) flag-off
 * assertion (public routes render AppShell, not V7PublicShell, when the flag is off).
 */
const ROOT = path.resolve(__dirname, "..");
const shell = readFileSync(path.join(ROOT, "app/components/shell/AppShell.tsx"), "utf8");
const layout = readFileSync(path.join(ROOT, "app/layout.tsx"), "utf8");

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

  it("root layout renders AppShell inside body.pat-shell (shell not duplicated)", () => {
    expect(layout).toMatch(/<AppShell>\{children\}<\/AppShell>/);
    expect(layout).toContain("pat-shell flex min-h-screen flex-col");
    expect(layout).toContain("<html lang={locale}>");
    // The shell markup lives in AppShell now, not the layout.
    expect(layout).not.toContain("<AppHeader");
    expect(layout).not.toContain("pat-shell-main");
  });
});
