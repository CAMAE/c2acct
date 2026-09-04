import { describe, expect, it } from "vitest";

import {
  checkEnvVar,
  fingerprint,
  parseAuditJson,
  parseVercelEnvLs,
  parseVitestSummary,
  presence,
  summarize,
  type VarSpec,
} from "@/scripts/deploy-night/checks";

const secret: VarSpec = { name: "AUTH_SECRET", scope: "t", kind: "secret", required: true, rotation: true, minLength: 32 };
const usd: VarSpec = { name: "PAT_WEB_TIER_DAILY_CAP_USD", scope: "t", kind: "usd", required: true };
const flag: VarSpec = { name: "PAT_ENABLE_PUBLIC_TIER", scope: "t", kind: "flag", required: false };
const LONG = "x".repeat(40);

describe("deploy-night preflight — blank is not absent", () => {
  it("distinguishes absent, blank and set", () => {
    expect(presence("A", {})).toEqual({ state: "absent", length: 0 });
    expect(presence("A", { A: "   " })).toEqual({ state: "blank", length: 3 });
    expect(presence("A", { A: "" })).toEqual({ state: "blank", length: 0 });
    expect(presence("A", { A: " v " })).toEqual({ state: "set", length: 1 });
  });

  it("fails a required absent variable and skips an optional one", () => {
    expect(checkEnvVar(secret, {}).status).toBe("FAIL");
    expect(checkEnvVar(flag, {}).status).toBe("SKIP");
  });

  it("fails a blank variable with its own message, even when optional", () => {
    const result = checkEnvVar({ ...flag, required: false }, { PAT_ENABLE_PUBLIC_TIER: "" });
    expect(result.status).toBe("FAIL");
    expect(result.detail).toMatch(/BLANK/);
  });

  it("names the Number(\"\") trap for a blank USD cap", () => {
    const result = checkEnvVar(usd, { PAT_WEB_TIER_DAILY_CAP_USD: " " });
    expect(result.status).toBe("FAIL");
    expect(result.detail).toMatch(/Number\(""\) is 0/);
  });
});

describe("deploy-night preflight — value rules", () => {
  it("accepts a non-negative USD cap and rejects the rest", () => {
    expect(checkEnvVar(usd, { PAT_WEB_TIER_DAILY_CAP_USD: "0.25" })).toMatchObject({ status: "PASS", detail: "0.25 USD" });
    expect(checkEnvVar(usd, { PAT_WEB_TIER_DAILY_CAP_USD: "0" }).status).toBe("PASS");
    expect(checkEnvVar(usd, { PAT_WEB_TIER_DAILY_CAP_USD: "banana" }).status).toBe("FAIL");
    expect(checkEnvVar(usd, { PAT_WEB_TIER_DAILY_CAP_USD: "-1" }).status).toBe("FAIL");
  });

  it('treats a flag as ON only when it is exactly "1"', () => {
    expect(checkEnvVar(flag, { PAT_ENABLE_PUBLIC_TIER: "1" }).status).toBe("PASS");
    expect(checkEnvVar(flag, { PAT_ENABLE_PUBLIC_TIER: "true" }).status).toBe("WARN");
  });

  it("fails a secret shorter than its minimum", () => {
    expect(checkEnvVar(secret, { AUTH_SECRET: "short" }).status).toBe("FAIL");
  });

  it("never echoes the value in the detail", () => {
    const value = "hunter2-hunter2-hunter2-hunter2-hunter2";
    const results = [
      checkEnvVar(secret, { AUTH_SECRET: value }),
      checkEnvVar({ ...secret, rotation: false }, { AUTH_SECRET: value }),
      checkEnvVar({ name: "DATABASE_URL", scope: "t", kind: "url", required: true, rotation: true }, { DATABASE_URL: `postgres://u:${value}@db.example.com/x` }),
    ];
    for (const result of results) expect(result.detail).not.toContain(value);
  });
});

describe("deploy-night preflight — rotation fingerprints", () => {
  it("is deterministic, one-way-shaped and trims", () => {
    expect(fingerprint(LONG)).toBe(fingerprint(`  ${LONG} `));
    expect(fingerprint(LONG)).toMatch(/^[0-9a-f]{16}$/);
    expect(fingerprint(LONG)).not.toBe(fingerprint(`${LONG}y`));
  });

  it("fails a secret whose fingerprint is in the known-old set, passes a rotated one", () => {
    const old = { AUTH_SECRET: [fingerprint(LONG)] };
    expect(checkEnvVar(secret, { AUTH_SECRET: LONG }, old).status).toBe("FAIL");
    expect(checkEnvVar(secret, { AUTH_SECRET: LONG }, old).detail).toMatch(/NOT ROTATED/);
    expect(checkEnvVar(secret, { AUTH_SECRET: `${LONG}-new` }, old).status).toBe("PASS");
  });

  it("warns, not passes, when no known-old fingerprint was ever recorded", () => {
    const result = checkEnvVar(secret, { AUTH_SECRET: LONG }, {});
    expect(result.status).toBe("WARN");
    expect(result.detail).toMatch(/unproven/);
  });
});

describe("deploy-night preflight — tool output parsers", () => {
  it("reads vitest's summary line including skips", () => {
    expect(parseVitestSummary("      Test Files  3 passed (3)\n      Tests  27 passed | 2 skipped (29)\n")).toEqual({ passed: 27, skipped: 2, failed: 0 });
    expect(parseVitestSummary("      Tests  1 failed | 26 passed (27)\n")).toEqual({ passed: 26, skipped: 0, failed: 1 });
    expect(parseVitestSummary("nothing here")).toBeNull();
  });

  it("reads pnpm audit --json severity counts", () => {
    expect(parseAuditJson(JSON.stringify({ metadata: { vulnerabilities: { critical: 3, high: 54, moderate: 56, low: 11 } } }))).toEqual({ critical: 3, high: 54, moderate: 56, low: 11 });
    expect(parseAuditJson("not json")).toBeNull();
  });

  it("reads names out of vercel env ls and ignores the header", () => {
    const output = [
      " NAME                     VALUE       ENVIRONMENTS    CREATED",
      " DATABASE_URL             Encrypted   Production      3d ago",
      " PAT_ENABLE_PAT_ASSISTANT Encrypted   Production      3d ago",
      "> Environment Variables found for project",
    ].join("\n");
    expect([...parseVercelEnvLs(output)].sort()).toEqual(["DATABASE_URL", "PAT_ENABLE_PAT_ASSISTANT"]);
  });

  it("counts statuses", () => {
    expect(summarize([{ check: "a", scope: "s", status: "PASS", detail: "" }, { check: "b", scope: "s", status: "FAIL", detail: "" }])).toEqual({ PASS: 1, FAIL: 1, WARN: 0, SKIP: 0 });
  });
});
