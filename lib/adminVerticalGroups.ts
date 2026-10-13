import { DEFAULT_VERTICAL_ID } from "@/lib/verticals/context";

/**
 * box-c (R65, item 8): the admin taxonomy selects list every vertical's buckets,
 * grouped by vertical with the vertical's name as the group label, accounting
 * first, legal second, any other vertical after in id order. Admin only, behind
 * no flag. Pure, so the three selects cannot order their groups differently.
 */
export const VERTICAL_GROUP_ORDER: readonly string[] = [DEFAULT_VERTICAL_ID, "legal"];
const VERTICAL_NAMES: Record<string, string> = { accounting: "Accounting", legal: "Legal" };

export function verticalDisplayName(verticalId: string): string {
  return VERTICAL_NAMES[verticalId] ?? verticalId.charAt(0).toUpperCase() + verticalId.slice(1);
}

export function groupByVertical<T extends { verticalId?: string | null }>(items: readonly T[]): Array<{ verticalId: string; label: string; items: T[] }> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const verticalId = item.verticalId || DEFAULT_VERTICAL_ID;
    groups.set(verticalId, [...(groups.get(verticalId) ?? []), item]);
  }
  const ordered = [
    ...VERTICAL_GROUP_ORDER.filter((id) => groups.has(id)),
    ...[...groups.keys()].filter((id) => !VERTICAL_GROUP_ORDER.includes(id)).sort(),
  ];
  return ordered.map((verticalId) => ({ verticalId, label: verticalDisplayName(verticalId), items: groups.get(verticalId)! }));
}
