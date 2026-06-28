"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import {
  AtSign,
  Bell,
  CalendarClock,
  Check,
  CheckCheck,
  Circle,
  Inbox,
  Mail,
  PhoneCall,
  Trash2,
  UserRound,
  UserRoundCheck,
  Video,
  X,
} from "lucide-react";
import DashboardPageLayout from "@/components/layout/DashboardPageLayout";
import ProtectedPageGate from "@/components/layout/ProtectedPageGate";
import ShellSegmentTabs from "@/components/layout/ShellSegmentTabs";
import { formatApiError } from "@/lib/apiError";
import { showAppToast } from "@/lib/appToast";
import { cn } from "@/lib/classNames";
import { notificationsClient, userClient } from "@/lib/clients";
import { displayUserPrimaryLabel } from "@/lib/searchHub";
import { getSocket } from "@/lib/socket";
import { syncConversations } from "@/lib/syncConversations";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import type { AppNotification, Conversation, User } from "@/types/api";

type NotificationsFilter = "all" | "unread" | "invites";

function notificationActor(item: AppNotification): User | null {
  const actor = item.actorId;
  if (actor && typeof actor === "object") return actor as User;
  return null;
}

function notificationActorId(item: AppNotification) {
  const actor = item.actorId;
  if (actor && typeof actor === "object") return String(actor._id || "");
  return String(actor || "");
}

function formatNotificationTime(value: string | undefined, locale: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(locale || undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function notificationTitle(
  item: AppNotification,
  actorLabel: string,
  t: (_key: string, _options?: Record<string, unknown>) => string,
) {
  if (item.type === "mention") {
    return t("notificationsMentionTitle", { name: actorLabel });
  }
  if (item.type === "call_invite") {
    return t("notificationsCallInviteTitle", { name: actorLabel });
  }
  return t("notificationsChatInviteTitle", { name: actorLabel });
}

function notificationBody(
  item: AppNotification,
  actorLabel: string,
  t: (_key: string, _options?: Record<string, unknown>) => string,
) {
  if (item.type === "mention") {
    return t("notificationsMentionBody", {
      name: actorLabel,
      place: item.data?.conversationName || t("navChats"),
    });
  }
  if (item.type === "call_invite") {
    return t("notificationsCallInviteBody", {
      name: actorLabel,
      mode: t(item.data?.callMode === "video" ? "callStartVideo" : "callStartVoice"),
      place: item.data?.conversationName || t("navCalls"),
    });
  }
  return t("notificationsChatInviteBody", { name: actorLabel });
}

function notificationIcon(item: AppNotification) {
  if (item.type === "mention") return AtSign;
  if (item.type === "call_invite") {
    return item.data?.callMode === "video" ? Video : PhoneCall;
  }
  return UserRound;
}

export default function NotificationsPage() {
  const { t, i18n } = useTranslation();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const authUser = useAppSelector((s) => s.auth.user);
  const authStatus = useAppSelector((s) => s.auth.status);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<NotificationsFilter>("all");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [message, setMessage] = useState("");

  const meId = authUser?._id ? String(authUser._id) : "";
  const locale = i18n.language || "en";

  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await notificationsClient.listNotifications();
      setItems(Array.isArray(data?.items) ? data.items : []);
      setUnreadCount(Number(data?.unreadCount || 0));
      setMessage("");
    } catch (error) {
      setItems([]);
      setUnreadCount(0);
      setMessage(formatApiError(error, t, "errorOccurred"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (!meId) return;
    void loadNotifications();
  }, [loadNotifications, meId]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !meId) return undefined;
    const reload = () => {
      void loadNotifications();
    };
    socket.on("notification-created", reload);
    socket.on("notification-updated", reload);
    socket.on("notifications-updated", reload);
    return () => {
      socket.off("notification-created", reload);
      socket.off("notification-updated", reload);
      socket.off("notifications-updated", reload);
    };
  }, [loadNotifications, meId]);

  const pendingInviteCount = useMemo(
    () =>
      items.filter(
        (item) =>
          (item.type === "chat_invite" || item.type === "call_invite") &&
          item.data?.status === "pending",
      ).length,
    [items],
  );

  const visibleItems = useMemo(() => {
    if (filter === "unread") return items.filter((item) => !item.readAt);
    if (filter === "invites") {
      return items.filter(
        (item) => item.type === "chat_invite" || item.type === "call_invite",
      );
    }
    return items;
  }, [filter, items]);

  const tabs = [
    { id: "all", label: t("notificationsTabAll"), icon: Inbox },
    { id: "unread", label: t("notificationsTabUnread"), icon: Circle },
    { id: "invites", label: t("notificationsTabInvites"), icon: Mail },
  ];

  const markRead = async (item: AppNotification) => {
    if (item.readAt) return;
    const id = String(item._id || "");
    if (!id) return;
    try {
      setBusyId(id);
      const { data } = await notificationsClient.markNotificationRead(id);
      setItems((current) =>
        current.map((row) => (String(row._id) === id ? data : row)),
      );
      setUnreadCount((count) => Math.max(0, count - 1));
    } catch (error) {
      setMessage(formatApiError(error, t, "errorOccurred"));
    } finally {
      setBusyId("");
    }
  };

  const markAllRead = async () => {
    try {
      setBusyId("read-all");
      await notificationsClient.markAllNotificationsRead();
      await loadNotifications();
    } catch (error) {
      setMessage(formatApiError(error, t, "errorOccurred"));
    } finally {
      setBusyId("");
    }
  };

  const deleteAll = async () => {
    if (!items.length) {
      showAppToast({ id: "notifications-delete-empty", body: t("notificationsDeleteAllEmpty") });
      return;
    }
    try {
      setBusyId("delete-all");
      await notificationsClient.deleteAllNotifications();
      await loadNotifications();
    } catch (error) {
      setMessage(formatApiError(error, t, "errorOccurred"));
    } finally {
      setBusyId("");
    }
  };

  const dismiss = async (item: AppNotification) => {
    const id = String(item._id || "");
    if (!id) return;
    try {
      setBusyId(id);
      await notificationsClient.dismissNotification(id);
      await loadNotifications();
    } catch (error) {
      setMessage(formatApiError(error, t, "errorOccurred"));
    } finally {
      setBusyId("");
    }
  };

  const acceptInvite = async (item: AppNotification) => {
    const actorId = notificationActorId(item);
    if (!actorId) return;
    try {
      setBusyId(String(item._id || actorId));
      const { data } = await userClient.acceptChatInvite(actorId);
      await syncConversations(dispatch);
      await loadNotifications();
      const conversation = data as Conversation | undefined;
      if (conversation?._id) router.push(`/chats/${conversation._id}`);
    } catch (error) {
      setMessage(formatApiError(error, t, "errorOccurred"));
    } finally {
      setBusyId("");
    }
  };

  const declineInvite = async (item: AppNotification) => {
    const actorId = notificationActorId(item);
    if (!actorId) return;
    try {
      setBusyId(String(item._id || actorId));
      await userClient.declineChatInvite(actorId);
      await loadNotifications();
    } catch (error) {
      setMessage(formatApiError(error, t, "errorOccurred"));
    } finally {
      setBusyId("");
    }
  };

  return (
    <ProtectedPageGate titleKey="navNotifications" status={authStatus} user={authUser}>
      <DashboardPageLayout
        title={t("navNotifications")}
        description={t("notificationsPageSubtitle")}
        maxWidth="5xl"
        headerExtra={
          <ShellSegmentTabs
            tabs={tabs}
            active={filter}
            onChange={(value) => setFilter(value as NotificationsFilter)}
            tourPrefix="notifications-filter"
          />
        }
      >
        <div className="mb-4 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            onClick={() => void deleteAll()}
            disabled={busyId === "delete-all"}
            className="vs-btn-outline-sm px-4 py-2 disabled:opacity-50"
          >
            {busyId === "delete-all" ? "…" : t("notificationsDeleteAll")}
          </button>
          <button
            type="button"
            onClick={() => void markAllRead()}
            disabled={!unreadCount || busyId === "read-all"}
            className="vs-btn-primary-sm min-h-10 gap-1.5 whitespace-nowrap rounded-full px-4 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CheckCheck className="h-4 w-4" aria-hidden />
            {t("notificationsMarkAllRead")}
          </button>
        </div>

        <div className="mb-6 grid grid-cols-[repeat(auto-fit,minmax(12rem,1fr))] gap-3">
          <div className="vs-stat-tile flex items-center gap-3 p-4">
            <div className="vs-icon-tile h-10 w-10 !rounded-xl">
              <Bell className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted">
                {t("notificationsStatUnread")}
              </div>
              <div className="mt-1 text-2xl font-semibold text-ink">{unreadCount}</div>
            </div>
          </div>
          <div className="vs-stat-tile flex items-center gap-3 p-4">
            <div className="vs-icon-tile h-10 w-10 !rounded-xl">
              <Mail className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted">
                {t("notificationsStatPendingInvites")}
              </div>
              <div className="mt-1 text-2xl font-semibold text-ink">{pendingInviteCount}</div>
            </div>
          </div>
          <div className="vs-stat-tile flex items-center gap-3 p-4">
            <div className="vs-icon-tile h-10 w-10 !rounded-xl">
              <Inbox className="h-5 w-5" aria-hidden />
            </div>
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted">
                {t("notificationsStatTotal")}
              </div>
              <div className="mt-1 text-2xl font-semibold text-ink">{items.length}</div>
            </div>
          </div>
        </div>

        {message ? (
          <div role="status" className="vs-muted-panel mb-5 text-sm leading-relaxed">
            {message}
          </div>
        ) : null}

        <section className="space-y-3" aria-live="polite">
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2].map((row) => (
                <div
                  key={row}
                  className="h-28 animate-pulse rounded-3xl border border-brand-200/35 bg-subtle/80 dark:border-brand-800/30 dark:bg-brand-900/20"
                />
              ))}
            </div>
          ) : null}

          {!loading && !visibleItems.length ? (
            <div className="vs-settings-card flex flex-col items-center justify-center px-5 py-12 text-center">
              <div className="vs-icon-tile mb-4 h-12 w-12 rounded-2xl">
                <CheckCheck className="h-6 w-6" aria-hidden />
              </div>
              <h2 className="text-lg font-semibold text-ink">{t("notificationsEmptyTitle")}</h2>
              <p className="mt-2 max-w-md text-sm leading-relaxed text-muted">
                {t("notificationsEmptyBody")}
              </p>
            </div>
          ) : null}

          {!loading
            ? visibleItems.map((item) => {
                const actor = notificationActor(item);
                const actorId = notificationActorId(item);
                const actorLabel = actor ? displayUserPrimaryLabel(actor) : t("notificationsUnknownActor");
                const status = item.data?.status || "pending";
                const isUnread = !item.readAt;
                const rowBusy = busyId === String(item._id || "");
                const RowIcon = notificationIcon(item);
                const canRespondToChatInvite =
                  item.type === "chat_invite" && status === "pending";
                const canOpenCallInvite =
                  item.type === "call_invite" &&
                  status === "pending" &&
                  String(item.data?.callToken || "");
                const showStatusBadge = item.type !== "mention";
                return (
                  <article
                    key={String(item._id)}
                    className={cn(
                      "vs-settings-card grid gap-4 !p-4 text-start sm:!p-5 md:grid-cols-[auto,minmax(0,1fr)] xl:grid-cols-[auto,minmax(0,1fr),auto] xl:items-start",
                      isUnread && "border-brand-400/60 bg-brand-50/45 dark:border-brand-700/60 dark:bg-brand-900/20",
                    )}
                  >
                    <div className="relative h-12 w-12 shrink-0 overflow-visible">
                      <div className="h-full w-full overflow-hidden rounded-2xl bg-brand-100 ring-1 ring-brand-200/60 dark:bg-brand-900/40 dark:ring-brand-800/50">
                        {actor?.profilePic ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={actor.profilePic}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-brand-700 dark:text-brand-200">
                            <RowIcon className="h-5 w-5" aria-hidden />
                          </div>
                        )}
                      </div>
                      {isUnread ? (
                        <span className="absolute -end-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-surface bg-brand-600 shadow-sm shadow-brand-600/25 dark:border-gray-950" />
                      ) : null}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="min-w-0 truncate text-base font-semibold text-ink">
                          {notificationTitle(item, actorLabel, t)}
                        </h2>
                        {showStatusBadge ? (
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-1 text-xs font-semibold",
                              status === "pending" &&
                                "bg-brand-100 text-brand-800 dark:bg-brand-900/40 dark:text-brand-100",
                              status === "accepted" &&
                                "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
                              (status === "declined" || status === "cancelled") &&
                                "bg-gray-100 text-gray-700 dark:bg-gray-900/60 dark:text-gray-300",
                            )}
                          >
                            {t(`notificationsInviteStatus_${status}`)}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-muted">
                        {notificationBody(item, actorLabel, t)}
                      </p>
                      {item.type === "mention" && item.data?.preview ? (
                        <p className="mt-2 rounded-2xl border border-brand-200/40 bg-canvas/50 px-3 py-2 text-sm leading-relaxed text-muted dark:border-brand-800/30 dark:bg-black/20">
                          {String(item.data.preview)}
                        </p>
                      ) : null}
                      {item.type === "call_invite" && item.data?.scheduledFor ? (
                        <p className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800 dark:bg-brand-900/35 dark:text-brand-100">
                          <CalendarClock className="h-3.5 w-3.5" aria-hidden />
                          {formatNotificationTime(String(item.data.scheduledFor), locale)}
                        </p>
                      ) : null}
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-muted">
                        <span>{formatNotificationTime(item.createdAt, locale)}</span>
                        {isUnread ? <span>{t("notificationsUnread")}</span> : null}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 md:col-start-2 sm:flex sm:flex-wrap xl:col-start-auto xl:justify-end">
                      {canRespondToChatInvite ? (
                        <>
                          <button
                            type="button"
                            onClick={() => void acceptInvite(item)}
                            disabled={rowBusy}
                            className="vs-btn-primary-sm min-h-10 gap-1.5 whitespace-nowrap rounded-full px-4 sm:flex-none"
                          >
                            <Check className="h-4 w-4" aria-hidden />
                            {t("incomingInvitesAccept")}
                          </button>
                          <button
                            type="button"
                            onClick={() => void declineInvite(item)}
                            disabled={rowBusy}
                            className="inline-flex min-h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-brand-200/60 px-4 py-2 text-xs font-semibold text-muted hover:bg-brand-50 disabled:opacity-60 dark:border-brand-800/40 dark:hover:bg-brand-900/20 sm:flex-none"
                          >
                            <X className="h-4 w-4" aria-hidden />
                            {t("incomingInvitesDecline")}
                          </button>
                        </>
                      ) : null}
                      {canOpenCallInvite ? (
                        <button
                          type="button"
                          onClick={() => {
                            void markRead(item);
                            router.push(`/call/${encodeURIComponent(String(item.data?.callToken || ""))}`);
                          }}
                          className="vs-btn-primary-sm min-h-10 gap-1.5 whitespace-nowrap rounded-full px-4 sm:flex-none"
                        >
                          {item.data?.callMode === "video" ? (
                            <Video className="h-4 w-4" aria-hidden />
                          ) : (
                            <PhoneCall className="h-4 w-4" aria-hidden />
                          )}
                          {t("callLinkOpen")}
                        </button>
                      ) : null}
                      {item.type === "mention" && item.data?.conversationId ? (
                        <button
                          type="button"
                          onClick={() => {
                            void markRead(item);
                            router.push(`/chats/${String(item.data?.conversationId)}`);
                          }}
                          className="vs-btn-primary-sm min-h-10 gap-1.5 whitespace-nowrap rounded-full px-4 sm:flex-none"
                        >
                          <AtSign className="h-4 w-4" aria-hidden />
                          {t("notificationsOpenMention")}
                        </button>
                      ) : null}
                      {actorId ? (
                        <button
                          type="button"
                          onClick={() => {
                            void markRead(item);
                            router.push(`/user/${actorId}`);
                          }}
                          className="inline-flex min-h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-brand-200/60 px-4 py-2 text-xs font-semibold text-muted hover:bg-brand-50 dark:border-brand-800/40 dark:hover:bg-brand-900/20 sm:flex-none"
                        >
                          <UserRoundCheck className="h-4 w-4" aria-hidden />
                          {t("viewProfile")}
                        </button>
                      ) : null}
                      {!item.readAt ? (
                        <button
                          type="button"
                          onClick={() => void markRead(item)}
                          disabled={rowBusy}
                          className="inline-flex min-h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-full border border-brand-200/60 px-4 py-2 text-xs font-semibold text-muted hover:bg-brand-50 disabled:opacity-60 dark:border-brand-800/40 dark:hover:bg-brand-900/20 sm:flex-none"
                        >
                          <CheckCheck className="h-4 w-4" aria-hidden />
                          {t("notificationsMarkRead")}
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => void dismiss(item)}
                        disabled={rowBusy}
                        aria-label={t("notificationsDismiss")}
                        className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-full border border-brand-200/60 px-3 text-muted hover:bg-brand-50 disabled:opacity-60 dark:border-brand-800/40 dark:hover:bg-brand-900/20"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </button>
                    </div>
                  </article>
                );
              })
            : null}
        </section>
      </DashboardPageLayout>
    </ProtectedPageGate>
  );
}
