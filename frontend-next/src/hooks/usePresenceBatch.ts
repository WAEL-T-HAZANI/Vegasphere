"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { userClient } from "@/lib/clients";
import { isOfflinePresenceValue, isOnlinePresenceValue } from "@/lib/presence";
import type { PresenceMap } from "@/types";

export { presenceStateForUser } from "@/lib/presence";

const PRESENCE_POLL_INTERVAL_MS = 15_000;
const PRESENCE_EVENT = "vegasphere-presence-changed";

function normalizeUserIds(ids: Array<string | undefined | null> | undefined) {
  return [...new Set((ids || []).map(String).filter(Boolean))].sort();
}

export type UsePresenceBatchOptions = {
  enabled?: boolean;
};

export function usePresenceBatch(
  ids: Array<string | undefined | null> | undefined,
  options: UsePresenceBatchOptions = {},
) {
  const { enabled = true } = options;

  const userIds = useMemo(() => normalizeUserIds(ids), [ids]);
  const userIdQuery = useMemo(() => userIds.join(","), [userIds]);

  const [presenceById, setPresenceById] = useState<PresenceMap>({});

  const fetchPresence = useCallback(async () => {
    if (!enabled || userIds.length === 0) return;

    try {
      const { data } = await userClient.getPresenceBatch(userIds);

      setPresenceById(data && typeof data === "object" ? data : {});
    } catch {
      // Keep previous presence data if polling fails.
    }
  }, [enabled, userIds.length, userIdQuery]);

  useEffect(() => {
    if (!enabled || userIds.length === 0) {
      setPresenceById({});
      return;
    }

    fetchPresence();
  }, [enabled, userIds.length, userIdQuery, fetchPresence]);

  useEffect(() => {
    if (!enabled || userIds.length === 0) return undefined;

    const onPresenceEvent = (event) => {
      const userId = String(event?.detail?.userId || "");
      const online = Boolean(event?.detail?.online);
      if (!userId || !userIds.includes(userId)) return;
      setPresenceById((prev) => ({
        ...prev,
        [userId]: { ...(prev[userId] || {}), online },
      }));
    };

    window.addEventListener(PRESENCE_EVENT, onPresenceEvent);
    const intervalId = setInterval(fetchPresence, PRESENCE_POLL_INTERVAL_MS);

    return () => {
      window.removeEventListener(PRESENCE_EVENT, onPresenceEvent);
      clearInterval(intervalId);
    };
  }, [enabled, userIds.length, userIdQuery, fetchPresence]);

  return {
    presenceById,
    isOnline: (userId: string | undefined | null) =>
      isOnlinePresenceValue(presenceById[String(userId || "")]?.online),
    isOffline: (userId: string | undefined | null) =>
      isOfflinePresenceValue(presenceById[String(userId || "")]?.online),
    refresh: fetchPresence,
  };
}
