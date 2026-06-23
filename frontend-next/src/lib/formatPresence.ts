import type { TFunction } from "i18next";
import { isOnlinePresenceValue } from "@/lib/presence";

export type PresenceRow = {
  isOnline?: boolean;
  lastSeen?: string | Date | null;
  showOnlineStatus?: boolean;
  showLastSeen?: boolean;
};

export function formatPresenceLine(
  row: PresenceRow | null | undefined,
  t: TFunction,
  locale?: string,
): string {
  if (!row) return "";
  if (isOnlinePresenceValue(row.isOnline)) return t("presenceOnline");
  if (row.lastSeen && row.showLastSeen !== false) {
    const d = new Date(row.lastSeen);
    if (!Number.isNaN(d.getTime())) {
      const label = d.toLocaleString(locale || undefined, {
        dateStyle: "medium",
        timeStyle: "short",
      });
      return t("presenceLastSeenAt", { date: label });
    }
  }
  return t("presenceOffline");
}
