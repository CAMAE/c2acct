import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { groupByVertical, verticalDisplayName } from "@/lib/adminVerticalGroups";

/** box-c (R65, item 8): admin bucket selects group by vertical, accounting first, legal second, labelled by vertical name. */
const ROOT = path.resolve(__dirname, "..");

describe("admin selects by vertical (box-c item 8)", () => {
  it("groups accounting first, legal second, others after, with the vertical name as the label", () => {
    const groups = groupByVertical([
      { id: "l1", title: "Docket", verticalId: "legal" },
      { id: "a1", title: "Close", verticalId: "accounting" },
      { id: "w1", title: "Custody", verticalId: "wealth" },
      { id: "a2", title: "Tax", verticalId: null },
    ]);
    expect(groups.map((g) => g.label)).toEqual(["Accounting", "Legal", "Wealth"]);
    expect(groups[0]!.items.map((i) => i.id)).toEqual(["a1", "a2"]);
    expect(verticalDisplayName("legal")).toBe("Legal");
  });
  it("the three bucket selects render the grouped options", () => {
    const taxonomy = readFileSync(path.join(ROOT, "app/(app)/admin/taxonomy/page.tsx"), "utf8");
    const products = readFileSync(path.join(ROOT, "app/(app)/admin/products/[productId]/page.tsx"), "utf8");
    expect((taxonomy.match(/<VerticalBucketOptions /g) ?? []).length).toBe(2);
    expect((products.match(/<VerticalBucketOptions /g) ?? []).length).toBe(1);
    expect(products).toContain("select: { id: true, title: true, verticalId: true }");
  });
});
