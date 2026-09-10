import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { claimRefreshHref, middlewareGate, pageGate } from "@/lib/auth/firstLoginGate";

/**
 * Wait-state box item 1 (2026-09-10): the ERR_TOO_MANY_REDIRECTS loop on /firm.
 * Reproduces the loop as the two hops actually taken — middleware from the JWT
 * claim, page from the DB row — and proves the walk terminates once the page
 * refreshes a stale claim instead of redirecting back.
 */
const ROOT = process.cwd();

/** The pre-fix page rule: DB says done → straight back to returnTo. */
function legacyPageGate(input: Parameters<typeof pageGate>[0]) {
  if (!input.hasSession) return "sign-in";
  if (!input.userFound) return "invalid";
  if (input.dbMustChangePassword || !input.hasPasswordHash) return "form";
  return "return-to";
}

/** Walk request hops until something other than a redirect happens. */
function walk(page: typeof pageGate | typeof legacyPageGate, token: { mustChangePassword: boolean }, db: { mustChangePassword: boolean }) {
  const hops: string[] = [];
  let url = "/firm";
  for (let i = 0; i < 12; i += 1) {
    if (url === "/firm") {
      const m = middlewareGate({ isProtectedPage: true, tokenMustChangePassword: token.mustChangePassword });
      hops.push(`${m === "pass" ? 200 : 307} /firm`);
      if (m === "pass") return { hops, end: "workspace" };
      url = "/sign-in/password-update?returnTo=%2Ffirm";
      continue;
    }
    if (url.startsWith("/sign-in/password-update")) {
      const p = page({ hasSession: true, userFound: true, dbMustChangePassword: db.mustChangePassword, hasPasswordHash: true, tokenMustChangePassword: token.mustChangePassword });
      if (p === "form") { hops.push("200 /sign-in/password-update (form)"); return { hops, end: "form" }; }
      if (p === "return-to") { hops.push("307 /sign-in/password-update → /firm"); url = "/firm"; continue; }
      if (p === "refresh-claim") { hops.push("307 /sign-in/password-update → /api/auth/claims"); url = claimRefreshHref("/firm"); continue; }
      return { hops, end: p };
    }
    if (url.startsWith("/api/auth/claims")) {
      token = { mustChangePassword: db.mustChangePassword };
      hops.push("307 /api/auth/claims → /firm (claim refreshed)");
      url = "/firm";
      continue;
    }
  }
  return { hops, end: "LOOP" };
}

/** Live finding 2026-09-10: the page's session already reflects the DB, so the page NEVER sees the stale claim. */
function walkLive(page: typeof pageGate | typeof legacyPageGate, token: { mustChangePassword: boolean }, db: { mustChangePassword: boolean }) {
  const hops: string[] = [];
  let url = "/firm";
  for (let i = 0; i < 12; i += 1) {
    if (url === "/firm") {
      const m = middlewareGate({ isProtectedPage: true, tokenMustChangePassword: token.mustChangePassword });
      hops.push(`${m === "pass" ? 200 : 307} /firm`);
      if (m === "pass") return { hops, end: "workspace" };
      url = "/sign-in/password-update?returnTo=%2Ffirm";
      continue;
    }
    if (url.startsWith("/sign-in/password-update")) {
      // sessionUser.mustChangePassword comes from the jwt callback's DB re-read, not the cookie
      const p = page({ hasSession: true, userFound: true, dbMustChangePassword: db.mustChangePassword, hasPasswordHash: true, tokenMustChangePassword: db.mustChangePassword });
      if (p === "form") { hops.push("200 /sign-in/password-update (form)"); return { hops, end: "form" }; }
      if (p === "return-to") { hops.push("307 /sign-in/password-update → /firm"); url = "/firm"; continue; }
      if (p === "refresh-claim") { hops.push("307 /sign-in/password-update → /api/auth/claims"); url = claimRefreshHref("/firm"); continue; }
      return { hops, end: p };
    }
    if (url.startsWith("/api/auth/claims")) {
      // The route handler re-reads the DB into the token, then returns to returnTo.
      token = { mustChangePassword: db.mustChangePassword };
      hops.push("307 /api/auth/claims → /firm (claim refreshed)");
      url = "/firm";
      continue;
    }
  }
  return { hops, end: "LOOP" };
}

describe("first-login password gate: stale claim + cleared flag must not loop", () => {
  it("reproduces the loop with the pre-fix page rule", () => {
    const result = walk(legacyPageGate, { mustChangePassword: true }, { mustChangePassword: false });
    expect(result.end).toBe("LOOP");
    expect(result.hops.slice(0, 4)).toEqual(["307 /firm", "307 /sign-in/password-update → /firm", "307 /firm", "307 /sign-in/password-update → /firm"]);
  });

  it("live shape: the page's session already reflects the DB, so a 'return-to' rule loops even when the page is told the truth", () => {
    const legacyWithReturnTo = (input: Parameters<typeof pageGate>[0]) => (legacyPageGate(input) === "form" ? "form" : input.dbMustChangePassword ? "form" : "return-to");
    const result = walkLive(legacyWithReturnTo, { mustChangePassword: true }, { mustChangePassword: false });
    expect(result.end).toBe("LOOP");
  });

  it("live shape: the fixed page refreshes the claim without ever seeing it, and lands on /firm", () => {
    const result = walkLive(pageGate, { mustChangePassword: true }, { mustChangePassword: false });
    expect(result.end).toBe("workspace");
    expect(result.hops).toEqual(["307 /firm", "307 /sign-in/password-update → /api/auth/claims", "307 /api/auth/claims → /firm (claim refreshed)", "200 /firm"]);
  });

  it("lands on /firm on the next request after the fix (stale claim, flag cleared)", () => {
    const result = walk(pageGate, { mustChangePassword: true }, { mustChangePassword: false });
    expect(result.end).toBe("workspace");
    expect(result.hops).toEqual(["307 /firm", "307 /sign-in/password-update → /api/auth/claims", "307 /api/auth/claims → /firm (claim refreshed)", "200 /firm"]);
  });

  it("flag-dark: a user whose flag is still set sees the form exactly as before", () => {
    const before = walk(legacyPageGate, { mustChangePassword: true }, { mustChangePassword: true });
    const after = walk(pageGate, { mustChangePassword: true }, { mustChangePassword: true });
    expect(after).toEqual(before);
    expect(after.end).toBe("form");
  });

  it("flag-dark: a fresh token with a cleared flag never touches the page", () => {
    const result = walk(pageGate, { mustChangePassword: false }, { mustChangePassword: false });
    expect(result.hops).toEqual(["200 /firm"]);
  });

  it("the page decision table covers the signed-out and missing-user cases unchanged", () => {
    expect(pageGate({ hasSession: false, userFound: false, dbMustChangePassword: false, hasPasswordHash: false, tokenMustChangePassword: false })).toBe("sign-in");
    expect(pageGate({ hasSession: true, userFound: false, dbMustChangePassword: false, hasPasswordHash: false, tokenMustChangePassword: false })).toBe("invalid");
    expect(pageGate({ hasSession: true, userFound: true, dbMustChangePassword: false, hasPasswordHash: false, tokenMustChangePassword: false })).toBe("form");
    expect(pageGate({ hasSession: true, userFound: true, dbMustChangePassword: false, hasPasswordHash: true, tokenMustChangePassword: false })).toBe("refresh-claim");
  });

  it("wiring: proxy.ts and the password-update page both consult the shared gate; the claims route exists", () => {
    expect(readFileSync(path.join(ROOT, "proxy.ts"), "utf8")).toContain("middlewareGate(");
    const page = readFileSync(path.join(ROOT, "app/(public)/sign-in/password-update/page.tsx"), "utf8");
    expect(page).toContain("pageGate(");
    expect(page).toContain("claimRefreshHref(");
    const route = readFileSync(path.join(ROOT, "app/api/auth/claims/route.ts"), "utf8");
    expect(route).toContain("unstable_update(");
    expect(readFileSync(path.join(ROOT, "auth.ts"), "utf8")).toMatch(/export const \{[^}]*unstable_update[^}]*\} = NextAuth\(/);
  });
});
