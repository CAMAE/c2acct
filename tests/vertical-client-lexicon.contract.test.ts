import { readFileSync } from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { ACCOUNTING_LEXICON, LEXICON_KEYS } from "@/lib/verticals/lexicon";
import { resolveLexiconForRequest } from "@/lib/verticals/requestLexicon";
import { VERTICAL_PACKS_FLAG_ENV } from "@/lib/verticals/flag";

/**
 * The client-lexicon rule (PF-2, resolver production wiring).
 *
 * A client component consumes the lexicon; it never resolves one. Resolution
 * needs the request's tenant and the pack on disk, and a `process.env` read in
 * client code is inlined at BUILD time — one build serves every tenant, so a
 * build-time read cannot be per-tenant however carefully it is written.
 *
 * Documenting that is not enough: the failure is silent (a client bundle that
 * renders the builder's vertical for everyone, forever), so it is asserted over
 * the real files instead.
 */

const ROOT = process.cwd();

/** Every `"use client"` file in the repo, from git so build output is excluded. */
function clientFiles(): string[] {
  const tracked = execFileSync("git", ["ls-files", "app", "lib"], { cwd: ROOT, encoding: "utf8" })
    .split("\n")
    .filter((file) => file.endsWith(".tsx") || file.endsWith(".ts"));

  return tracked.filter((file) => {
    const source = readFileSync(path.join(ROOT, file), "utf8");
    return /^\s*["']use client["']/m.test(source);
  });
}

describe("client components never resolve a vertical themselves", () => {
  const files = clientFiles();

  it("finds client files to check (the scan is not vacuously passing)", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("never names the Vertical Pack flag or the env override in client code", () => {
    const offenders = files.filter((file) => {
      const source = readFileSync(path.join(ROOT, file), "utf8");
      // The provider's own docblock explains WHY client code cannot read these,
      // so match on an actual process.env read rather than the bare name.
      return (
        new RegExp(`process\\.env[.\\[]\\s*["']?${VERTICAL_PACKS_FLAG_ENV}`).test(source) ||
        /process\.env[.\[]\s*["']?PAT_DEFAULT_VERTICAL/.test(source)
      );
    });
    expect(offenders).toEqual([]);
  });

  it("never imports the resolver, the flag, the pack loader or the scope seam into client code", () => {
    const forbidden = [
      "@/lib/verticals/context",
      "@/lib/verticals/flag",
      "@/lib/verticals/loader",
      "@/lib/verticals/registry",
      "@/lib/verticals/scope",
      "@/lib/verticals/session",
      "@/lib/verticals/requestLexicon",
    ];
    const offenders: string[] = [];
    for (const file of files) {
      const source = readFileSync(path.join(ROOT, file), "utf8");
      for (const specifier of forbidden) {
        // A type-only import carries no runtime code and cannot resolve anything.
        if (new RegExp(`import\\s+(?!type\\b)[^;]*from\\s+["']${specifier}["']`).test(source)) {
          offenders.push(`${file} → ${specifier}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("no Node builtin reaches the client bundle through the framework", () => {
  it("keeps the client-reachable vertical modules free of node: imports", () => {
    // A `node:fs` / `node:path` import anywhere in a client graph fails the
    // webpack build outright — even behind a dynamic import(), because the
    // specifier still has to resolve. `lib/verticals/questionBankRegistry.ts`
    // is reachable from a product-assessment client component, so its
    // filesystem half lives in questionBankPackLoader.ts (server-only).
    //
    // This caught a real regression: the build failed on
    // VendorProductAssessmentClient → vendorPat → the bank builders → the
    // registry. Unit tests and typecheck were both green at the time.
    const clientReachable = [
      "lib/verticals/questionBankRegistry.ts",
      "lib/verticals/context.ts",
      "lib/verticals/flag.ts",
      "lib/verticals/lexicon.ts",
      "lib/verticals/scope.ts",
      "lib/vendorProductQuestionBank.ts",
    ];
    for (const file of clientReachable) {
      const source = readFileSync(path.join(ROOT, file), "utf8");
      const offending = source.match(/["']node:[a-z/]+["']/g) ?? [];
      expect({ file, offending }).toEqual({ file, offending: [] });
    }
  });
});

describe("resolveLexiconForRequest — the server-side boundary", () => {
  it("returns the frozen in-code map with the flag off, reading nothing", async () => {
    let sessionReads = 0;
    let companyReads = 0;

    const resolved = await resolveLexiconForRequest({
      env: {},
      readSessionCompanyId: async () => {
        sessionReads += 1;
        return "company-1";
      },
      readCompanyVerticalId: async () => {
        companyReads += 1;
        return "legal";
      },
    });

    expect(resolved).toBe(ACCOUNTING_LEXICON);
    expect(sessionReads).toBe(0);
    expect(companyReads).toBe(0);
  });

  it("loads and primes the tenant's pack with the flag on", async () => {
    const resolved = await resolveLexiconForRequest({
      env: { [VERTICAL_PACKS_FLAG_ENV]: "1" },
      readSessionCompanyId: async () => "company-1",
      readCompanyVerticalId: async () => "accounting",
    });
    // Accounting's pack values ARE the in-code literals, so flag-on accounting
    // renders character-for-character what flag-off renders.
    for (const key of LEXICON_KEYS) {
      expect(resolved[key]).toBe(ACCOUNTING_LEXICON[key]);
    }
  });

  it("returns a plain serializable record, so it can cross the RSC boundary", async () => {
    const resolved = await resolveLexiconForRequest({ env: {} });
    // Props handed to a client component must survive serialization. A record
    // of strings does; anything with a method or a class instance does not.
    expect(JSON.parse(JSON.stringify(resolved))).toEqual({ ...resolved });
    for (const key of LEXICON_KEYS) {
      expect(typeof resolved[key]).toBe("string");
    }
  });

  it("throws loudly for a vertical with no installed pack", async () => {
    await expect(
      resolveLexiconForRequest({
        env: { [VERTICAL_PACKS_FLAG_ENV]: "1" },
        readSessionCompanyId: async () => "company-1",
        readCompanyVerticalId: async () => "no-such-vertical",
      })
    ).rejects.toThrow(/not found/i);
  });
});
