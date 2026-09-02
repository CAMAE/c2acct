import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The admin nav entry is role-gated, and stays that way.
 *
 * Confirmed by reading the chain rather than by recollection:
 *
 *   AppShell.tsx           enabledHrefs.has("/admin") decides the nav item
 *     <- experience.surfaces filtered to availability === "enabled"
 *     <- resolvePortalExperience(sessionUser) -> toSurface(..., { isAdmin })
 *   portalVisibility.ts    requiresAdmin: true on the /admin surface
 *   portalVisibility.ts    if (definition.requiresAdmin && !options.isAdmin) return null
 *   portalVisibility.ts    const isAdmin = isAdminRole(sessionUser.role)
 *   portalVisibility.ts    signed-out branch passes isAdmin: false
 *
 * These assertions are structural because the gap they guard is structural: the
 * failure mode is someone adding "/admin" to the nav list directly, or dropping
 * requiresAdmin from the surface, either of which would show an admin entry to a
 * non-admin without any test noticing.
 */

const ROOT = process.cwd();
const read = (file: string) => readFileSync(path.join(ROOT, file), "utf8");

describe("admin nav visibility is role-gated", () => {
  it("only adds the /admin nav item when the surface is enabled for this viewer", () => {
    const shell = read("app/components/shell/AppShell.tsx");
    // Every occurrence of the /admin href in the nav list must sit behind the
    // conditional spread. Asserted by counting rather than by a negative regex:
    // the first version used one, and it matched the CORRECT conditional line —
    // a negative pattern that fires on right code is worse than no assertion.
    expect(shell).toMatch(/enabledHrefs\.has\("\/admin"\)/);
    const adminMentions = shell.match(/href:\s*"\/admin"/g) ?? [];
    expect(adminMentions).toHaveLength(1);
    const line = shell.split("\n").find((l) => l.includes('href: "/admin"')) ?? "";
    expect(line).toContain('enabledHrefs.has("/admin")');
  });

  it("builds enabledHrefs only from surfaces the viewer may actually see", () => {
    const shell = read("app/components/shell/AppShell.tsx");
    expect(shell).toMatch(/resolvePortalExperience\(sessionUser\)/);
    expect(shell).toMatch(/availability === "enabled"/);
  });

  it("declares the /admin surface requiresAdmin", () => {
    const visibility = read("lib/portalVisibility.ts");
    const adminSurface = visibility.slice(
      visibility.indexOf('id: "admin"'),
      visibility.indexOf('id: "ecosystem-map"')
    );
    expect(adminSurface).toContain('href: "/admin"');
    expect(adminSurface).toContain("requiresAdmin: true");
  });

  it("drops a requiresAdmin surface for a non-admin, and derives isAdmin from the ROLE", () => {
    const visibility = read("lib/portalVisibility.ts");
    expect(visibility).toMatch(
      /if \(definition\.requiresAdmin && !options\.isAdmin\) \{\s*\n\s*return null;/
    );
    expect(visibility).toMatch(/const isAdmin = isAdminRole\(sessionUser\.role\)/);
  });

  it("treats a signed-out viewer as non-admin", () => {
    const visibility = read("lib/portalVisibility.ts");
    // The signed-out branch returns before the role lookup, with isAdmin false.
    expect(visibility).toMatch(/isAdmin: false/);
  });

  it("does not let the unused audience-preview helper reach a nav surface", () => {
    // getAudiencePreview() contains `isAdmin: audience === "associations"`, which
    // would grant admin visibility by AUDIENCE rather than role. It is dead code
    // — zero callers — and this pins that. If something starts calling it, this
    // fails and the isAdmin line must be reconsidered before it ships.
    // git grep exits NON-ZERO when it finds nothing, which is the expected
    // result for app/ — the first version treated that as a failure.
    const tracked = execFileSync("git", ["ls-files", "app", "lib"], { cwd: ROOT, encoding: "utf8" })
      .split("\n")
      .filter(Boolean);
    const callers = tracked.filter((file) => read(file).includes("getAudiencePreview"));
    expect(callers).toEqual(["lib/portalVisibility.ts"]);
  });
});
