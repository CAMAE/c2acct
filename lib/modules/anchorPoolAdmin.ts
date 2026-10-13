import prisma from "@/lib/prisma";
import { anchorPoolGrid, codeOfItemKey, readStoredAnchorPool, untaggedPoolFrom, type AnchorPoolGrid } from "@/lib/modules/anchorPool";

/**
 * anchor-pool (R66, item 6): the pool grid per knowledge bank for the admin
 * modules page. Read only. A bank whose header was untagged shows its six
 * served codes with no cell placed, so the empty grid IS the worklist.
 */
export type AdminAnchorPoolBank = {
  key: string;
  title: string;
  reviewStatus: string;
  verticalId: string;
  itemCount: number;
  /** The isAnchor codes on the bank (the pool when tagged, the served six when not). */
  anchorCodes: string[];
  grid: AnchorPoolGrid;
};

export async function listAdminAnchorPools(): Promise<AdminAnchorPoolBank[]> {
  const templates = await prisma.moduleTemplate.findMany({
    where: { ModuleItem: { some: {} } },
    orderBy: [{ verticalId: "asc" }, { key: "asc" }],
    select: {
      key: true,
      title: true,
      reviewStatus: true,
      verticalId: true,
      anchorPool: true,
      _count: { select: { ModuleItem: true } },
      ModuleItem: { where: { isAnchor: true }, orderBy: { order: "asc" }, select: { key: true, difficulty: true } },
    },
  });
  return templates.map((template) => {
    const anchors = template.ModuleItem.map((item) => ({ code: codeOfItemKey(item.key, template.key), difficulty: item.difficulty }));
    const pool = readStoredAnchorPool(template.anchorPool) ?? untaggedPoolFrom(anchors);
    return {
      key: template.key,
      title: template.title,
      reviewStatus: template.reviewStatus,
      verticalId: template.verticalId,
      itemCount: template._count.ModuleItem,
      anchorCodes: anchors.map((anchor) => anchor.code),
      grid: anchorPoolGrid(pool),
    };
  });
}
