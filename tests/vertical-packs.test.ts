import { beforeAll, describe, expect, it } from "vitest";
import { applyRepoEnv } from "@/lib/env/repoEnv";
import { loadVerticalPack } from "@/lib/verticals/loader";
import { listVerticalPacks } from "@/lib/verticals/registry";
import { getPromptForVertical } from "@/lib/verticals/prompts";
import { getTaxonomyForVertical } from "@/lib/verticals/taxonomy";

describe("Vertical Pack loader", () => {
  it("loads the accounting pack without errors", async () => {
    const pack = await loadVerticalPack("accounting");
    expect(pack.id).toBe("accounting");
    expect(pack.version).toBe(1);
    expect(pack.taxonomy.source).toBe("db");
    expect(pack.taxonomy.filter?.verticalId).toBe("accounting");
    expect(pack.agent_prompts["vendor-review-assistant"]).toBe("prompts/vendor-review.md");
    expect(pack.compliance.audit_retention_days).toBe(365);
  });

  it("throws a clean error for a nonexistent pack", async () => {
    await expect(loadVerticalPack("nonexistent")).rejects.toThrow(/not found/i);
  });

  it("lists the accounting pack in the registry", async () => {
    const packs = await listVerticalPacks();
    expect(packs.map((p) => p.id)).toContain("accounting");
  });

  it("resolves an agent prompt from the pack", async () => {
    const prompt = await getPromptForVertical("accounting", "vendor-review-assistant");
    expect(prompt).toMatch(/Vendor Review Assistant/i);
  });
});

describe("Vertical Pack taxonomy (DB-backed)", () => {
  beforeAll(() => {
    applyRepoEnv();
  });

  it("resolves accounting taxonomy to TaxonomyBucket rows scoped to the vertical", async () => {
    const buckets = await getTaxonomyForVertical("accounting");
    expect(buckets.length).toBeGreaterThan(0);
    expect(buckets.every((bucket) => bucket.verticalId === "accounting")).toBe(true);
  });
});
