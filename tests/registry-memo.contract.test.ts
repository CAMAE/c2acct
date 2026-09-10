import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { REGISTRY_MEMO_TTL_MS, isRegistryMemoEnabled } from "@/lib/firmPat";

/**
 * Wait-state box item 4 (2026-09-10): the firm insights pages ran the full
 * registry ensure (hundreds of serial writes) on every request. Behind
 * PAT_ENABLE_REGISTRY_MEMO=1 the ensure is reused per process for the TTL;
 * flag off (the default, fail-closed) nothing changes.
 */
const ROOT = process.cwd();

describe("registry memo (PAT_ENABLE_REGISTRY_MEMO)", () => {
  it("is off unless the flag is exactly \"1\"", () => {
    expect(isRegistryMemoEnabled({})).toBe(false);
    expect(isRegistryMemoEnabled({ PAT_ENABLE_REGISTRY_MEMO: "true" })).toBe(false);
    expect(isRegistryMemoEnabled({ PAT_ENABLE_REGISTRY_MEMO: "0" })).toBe(false);
    expect(isRegistryMemoEnabled({ PAT_ENABLE_REGISTRY_MEMO: "1" })).toBe(true);
  });

  it("the memo is bounded by a TTL of ten minutes", () => {
    expect(REGISTRY_MEMO_TTL_MS).toBe(600_000);
  });

  it("the firm insights hub and readout go through the memo; the survey write paths still ensure directly", () => {
    for (const rel of ["app/(app)/firm/insights/page.tsx", "app/(app)/firm/insights/[key]/page.tsx"]) {
      const src = readFileSync(path.join(ROOT, rel), "utf8");
      expect(src, rel).toContain("await ensureFirmAlignmentSystemMemo();");
      expect(src, rel).not.toMatch(/await ensureFirmAlignmentSystem\(\);/);
    }
    for (const rel of ["app/(app)/survey/[key]/page.tsx", "app/api/survey/module/[key]/route.ts"]) {
      expect(readFileSync(path.join(ROOT, rel), "utf8"), rel).toContain("await ensureFirmAlignmentSystem();");
    }
  });

  it("flag off: every call runs the ensure; flag on: one ensure per TTL, a failure is forgotten", async () => {
    const source = readFileSync(path.join(ROOT, "lib/firmPat.ts"), "utf8");
    // The memo shape, read from source so the test does not need a database:
    expect(source).toContain("if (!isRegistryMemoEnabled()) return ensureFirmAlignmentSystem();");
    expect(source).toContain("if (!firmRegistryMemo || now - firmRegistryMemo.at > REGISTRY_MEMO_TTL_MS) {");
    expect(source).toContain("firmRegistryMemo = null; // a failed ensure is not remembered");
  });
});
