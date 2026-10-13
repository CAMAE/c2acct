import { groupByVertical } from "@/lib/adminVerticalGroups";

/** box-c (R65, item 8): bucket options grouped by vertical for the admin selects. */
export default function VerticalBucketOptions({ buckets }: { buckets: ReadonlyArray<{ id: string; title: string; verticalId?: string | null }> }) {
  return (
    <>
      {groupByVertical(buckets).map((group) => (
        <optgroup key={group.verticalId} label={group.label}>
          {group.items.map((bucket) => (
            <option key={bucket.id} value={bucket.id}>
              {bucket.title}
            </option>
          ))}
        </optgroup>
      ))}
    </>
  );
}
