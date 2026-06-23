import type { StatusItem } from "@/types/status";
import { statusOwnerId } from "@/types/status";

/** Group status items by owner (newest first within each group). */
export function groupStatusByOwner(items: StatusItem[]): StatusItem[][] {
  const map = new Map<string, StatusItem[]>();
  for (const item of items) {
    const ownerKey = statusOwnerId(item) || String(item._id || "");
    if (!ownerKey) continue;
    const bucket = map.get(ownerKey);
    if (bucket) bucket.push(item);
    else map.set(ownerKey, [item]);
  }
  return [...map.values()].map((group) =>
    [...group].sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
    ),
  );
}
