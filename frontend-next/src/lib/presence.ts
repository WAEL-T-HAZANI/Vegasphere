import type { PresenceMap } from "@/types";

export function isOnlinePresenceValue(value: unknown): boolean {
  return value === true || value === 1 || value === "1" || value === "true";
}

export function isOfflinePresenceValue(value: unknown): boolean {
  return value === false || value === 0 || value === "0" || value === "false";
}

export function presenceStateForUser(
  presenceById: PresenceMap,
  userId: string | undefined | null,
): "online" | "offline" | "unknown" {
  if (!userId) return "unknown";
  const row = presenceById[String(userId)];
  if (!row || row.online === undefined || row.online === null) return "unknown";
  if (isOnlinePresenceValue(row.online)) return "online";
  if (isOfflinePresenceValue(row.online)) return "offline";
  return "unknown";
}
