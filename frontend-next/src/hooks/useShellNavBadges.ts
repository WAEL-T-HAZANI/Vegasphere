import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { callsClient, notificationsClient, statusClient } from "@/lib/clients";
import { unreadTotal } from "@/lib/chatList";
import { getSocket } from "@/lib/socket";
import { useAppSelector } from "@/store/hooks";

type BadgeMap = Record<string, number>;

type CallHistoryBadgeItem = {
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  endedAt?: string;
  initiatorId?: string | { _id?: string } | null;
};

const CALLS_SEEN_KEY_PREFIX = "vegasphere-calls-seen-at";

function clampCount(value: number) {
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.floor(value);
}

function itemTime(value: CallHistoryBadgeItem) {
  const raw = value.endedAt || value.updatedAt || value.createdAt || "";
  const time = raw ? new Date(raw).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

function initiatorId(value: CallHistoryBadgeItem) {
  const raw = value.initiatorId;
  if (raw && typeof raw === "object") return String(raw._id || "");
  return String(raw || "");
}

function callsSeenKey(userId: string) {
  return `${CALLS_SEEN_KEY_PREFIX}:${userId}`;
}

function readCallsSeenAt(userId: string) {
  if (typeof window === "undefined" || !userId) return 0;
  const raw = window.localStorage.getItem(callsSeenKey(userId));
  const value = Number(raw || 0);
  return Number.isFinite(value) ? value : 0;
}

function writeCallsSeenAt(userId: string, value = Date.now()) {
  if (typeof window === "undefined" || !userId) return;
  window.localStorage.setItem(callsSeenKey(userId), String(value));
  window.dispatchEvent(new CustomEvent("vegasphere:calls-seen"));
}

export function markShellCallsSeen(userId: string) {
  writeCallsSeenAt(userId);
}

export function notifyShellStatusViewed() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent("vegasphere:status-viewed"));
}

export function useShellNavBadges(): BadgeMap {
  const pathname = usePathname() || "";
  const userId = useAppSelector((s) => String(s.auth.user?._id || ""));
  const conversations = useAppSelector((s) => s.chat.conversations);
  const localUnreadDelta = useAppSelector((s) => s.chat.localUnreadDelta);
  const [notificationCount, setNotificationCount] = useState(0);
  const [missedCallCount, setMissedCallCount] = useState(0);
  const [statusCount, setStatusCount] = useState(0);

  const chatCount = useMemo(
    () =>
      clampCount(
        (Array.isArray(conversations) ? conversations : []).reduce(
          (sum, conv) => sum + unreadTotal(conv, userId, localUnreadDelta),
          0,
        ),
      ),
    [conversations, localUnreadDelta, userId],
  );

  const refreshNotifications = useCallback(async () => {
    if (!userId) {
      setNotificationCount(0);
      return;
    }
    try {
      const { data } = await notificationsClient.listNotifications();
      setNotificationCount(clampCount(Number(data?.unreadCount || 0)));
    } catch {
      setNotificationCount(0);
    }
  }, [userId]);

  const refreshCalls = useCallback(async () => {
    if (!userId) {
      setMissedCallCount(0);
      return;
    }
    try {
      const seenAt = readCallsSeenAt(userId);
      const { data } = await callsClient.getCallHistory<CallHistoryBadgeItem>();
      const count = (Array.isArray(data) ? data : []).filter((item) => {
        if (item.status !== "missed") return false;
        const fromMe = initiatorId(item) === userId;
        if (fromMe) return false;
        return itemTime(item) > seenAt;
      }).length;
      setMissedCallCount(clampCount(count));
    } catch {
      setMissedCallCount(0);
    }
  }, [userId]);

  const refreshStatus = useCallback(async () => {
    if (!userId) {
      setStatusCount(0);
      return;
    }
    try {
      const { data } = await statusClient.getStatusFeed();
      const count = (Array.isArray(data) ? data : []).filter(
        (item) => item && item.hasViewed !== true,
      ).length;
      setStatusCount(clampCount(count));
    } catch {
      setStatusCount(0);
    }
  }, [userId]);

  useEffect(() => {
    void refreshNotifications();
    void refreshCalls();
    void refreshStatus();
  }, [refreshCalls, refreshNotifications, refreshStatus]);

  useEffect(() => {
    if (!userId || pathname !== "/notifications" || notificationCount <= 0) return;
    let cancelled = false;
    notificationsClient
      .markAllNotificationsRead()
      .then(() => {
        if (!cancelled) setNotificationCount(0);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [notificationCount, pathname, userId]);

  useEffect(() => {
    if (!userId || !pathname.startsWith("/calls")) return;
    markShellCallsSeen(userId);
    setMissedCallCount(0);
  }, [pathname, userId]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !userId) return undefined;

    const refreshNotificationEvents = () => void refreshNotifications();
    const refreshCallEvents = () => void refreshCalls();
    const refreshStatusEvents = () => void refreshStatus();

    socket.on("notification-created", refreshNotificationEvents);
    socket.on("notification-updated", refreshNotificationEvents);
    socket.on("notifications-updated", refreshNotificationEvents);
    socket.on("calls-updated", refreshCallEvents);
    socket.on("status-updated", refreshStatusEvents);

    return () => {
      socket.off("notification-created", refreshNotificationEvents);
      socket.off("notification-updated", refreshNotificationEvents);
      socket.off("notifications-updated", refreshNotificationEvents);
      socket.off("calls-updated", refreshCallEvents);
      socket.off("status-updated", refreshStatusEvents);
    };
  }, [refreshCalls, refreshNotifications, refreshStatus, userId]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const onCallsSeen = () => void refreshCalls();
    const onStatusViewed = () => void refreshStatus();
    window.addEventListener("vegasphere:calls-seen", onCallsSeen);
    window.addEventListener("vegasphere:status-viewed", onStatusViewed);
    return () => {
      window.removeEventListener("vegasphere:calls-seen", onCallsSeen);
      window.removeEventListener("vegasphere:status-viewed", onStatusViewed);
    };
  }, [refreshCalls, refreshStatus]);

  return useMemo(
    () => ({
      "/chats": chatCount,
      "/notifications": notificationCount,
      "/calls": missedCallCount,
      "/status": statusCount,
    }),
    [chatCount, missedCallCount, notificationCount, statusCount],
  );
}
