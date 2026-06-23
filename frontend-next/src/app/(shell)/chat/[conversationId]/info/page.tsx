"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ArrowLeft,
  Download,
  MessageCircle,
  Pencil,
  Save,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { api } from "@/lib/api";
import { formatApiError } from "@/lib/apiError";
import { showAppToast } from "@/lib/appToast";
import { triggerBrowserDownload } from "@/lib/messageFormat";
import DashboardPageLayout from "@/components/layout/DashboardPageLayout";
import { cn } from "@/lib/classNames";
import {
  channelInitials,
  channelPostingModeLabel,
  channelVisibilityLabel,
  formatChannelSlug,
} from "@/lib/channelsHub";
import ChannelInfoOverview from "@/components/channels/ChannelInfoOverview";
import GroupInfoOverview from "@/components/groups/GroupInfoOverview";
import ConversationAvatarTile from "@/components/conversation/ConversationAvatarTile";
import { groupInitials, isConversationAdmin } from "@/lib/groupsHub";
import { isCustomConversationAvatar } from "@/lib/avatarUrl";
import { patchConversationInList, setConversations } from "@/store/slices/chatSlice";
import type { Conversation } from "@/types/api";

const GroupConversationWorkspace = dynamic(
  () => import("@/components/chat/GroupConversationWorkspace"),
);

const AVATAR_MAX_BYTES = 5 * 1024 * 1024;

type MemberRow = {
  _id: string;
  name: string;
  username: string;
  email: string;
  isAdmin: boolean;
  isSelf: boolean;
};

export default function ChatInfoPage() {
  const { conversationId } = useParams();
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const dir = i18n.dir();
  const rtl = dir === "rtl";
  const dispatch = useAppDispatch();
  const me = useAppSelector((s) => s.auth.user);
  const conversations = useAppSelector((s) => s.chat.conversations);

  const cid = String(conversationId || "");
  const fromStore = useMemo(
    () => (conversations || []).find((c) => String(c?._id || "") === cid) || null,
    [conversations, cid],
  );

  const [conv, setConv] = useState<Conversation | null>(fromStore);
  const [loading, setLoading] = useState(false);
  const [editInfo, setEditInfo] = useState(false);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [saveBusy, setSaveBusy] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [avatarImgFailed, setAvatarImgFailed] = useState(false);

  useEffect(() => {
    setConv(fromStore);
  }, [fromStore]);

  const loadConversation = useCallback(async () => {
    if (!cid) return;
    try {
      setLoading(true);
      const { data } = await api.get<Conversation>(`/conversation/${cid}`);
      setConv(data || null);
    } catch {
      setConv(fromStore);
    } finally {
      setLoading(false);
    }
  }, [cid, fromStore]);

  useEffect(() => {
    if (!cid) return;
    if (!fromStore?.isGroup && !fromStore?.isChannel && fromStore?.members?.length) return;
    void loadConversation();
  }, [cid, fromStore?.isChannel, fromStore?.isGroup, fromStore?.members?.length, loadConversation]);

  const admins = useMemo(
    () =>
      new Set(
        ((conv?.admins as Array<{ _id?: string } | string> | undefined) || []).map(
          (a) => String(typeof a === "object" && a?._id ? a._id : a || ""),
        ),
      ),
    [conv?.admins],
  );

  const isGroupAdmin = useMemo(
    () => isConversationAdmin(conv, me?._id),
    [conv, me?._id],
  );

  const isChannel = Boolean(conv?.isChannel);
  const isGroupOrChannel = Boolean(conv?.isGroup || conv?.isChannel);

  useEffect(() => {
    if (loading || !conv || !me?._id) return;
    if (isGroupOrChannel && !isGroupAdmin) {
      showAppToast({
        id: `info-admin-only-${cid}`,
        body: t("groupChannelInfoAdminOnly"),
      });
      router.replace(`/chat/${cid}`);
    }
  }, [cid, conv, isGroupAdmin, isGroupOrChannel, loading, me?._id, router, t]);

  const canEditInfo = useMemo(() => {
    if (isGroupOrChannel) return isGroupAdmin;
    return Boolean(conv?.effectiveMemberRights?.canEditInfo);
  }, [conv?.effectiveMemberRights?.canEditInfo, isGroupAdmin, isGroupOrChannel]);

  const members = useMemo((): MemberRow[] => {
    const list = Array.isArray(conv?.members) ? conv.members : [];
    return list
      .map((m) => {
        const id = String(m?._id || m || "");
        return {
          _id: id,
          name: String(m?.name || ""),
          username: String(m?.username || ""),
          email: String(m?.email || ""),
          isAdmin: admins.has(id),
          isSelf: id === String(me?._id || ""),
        };
      })
      .filter((m) => m._id);
  }, [admins, conv?.members, me?._id]);

  const displayName = String(conv?.chatName || conv?.name || (isChannel ? t("navChannels") : t("chatGroupInfo")));
  const description = String(conv?.description || "");
  const initials = isChannel
    ? channelInitials(displayName, t("channelInitialFallback"))
    : groupInitials(displayName, t("groupInitialFallback"));
  const channelSlugLabel = isChannel ? formatChannelSlug(String(conv?.channelSlug || "")) : "";
  const showAdminWorkspace = isGroupAdmin;
  const memberCount =
    typeof conv?.memberCount === "number"
      ? conv.memberCount
      : members.length;

  const startEdit = () => {
    setEditName(displayName);
    setEditDescription(description);
    setEditInfo(true);
  };

  const exportChat = async () => {
    if (!cid) return;
    try {
      const { data } = await api.get<Blob>(`/message/export/${cid}`, {
        responseType: "blob",
      });
      const blob =
        data instanceof Blob
          ? data
          : new Blob([JSON.stringify(data, null, 2)], {
              type: "application/json",
            });
      const url = URL.createObjectURL(blob);
      triggerBrowserDownload(url, `vegasphere-export-${cid.slice(-8)}.json`);
      URL.revokeObjectURL(url);
      showAppToast({
        id: "chat-export-ok",
        titleKey: "exportConversationDone",
        body: "",
      });
    } catch (e) {
      showAppToast({
        id: "chat-export-fail",
        titleKey: "exportConversationFailed",
        body: formatApiError(e, t, "exportConversationFailed"),
      });
    }
  };

  const saveInfo = async () => {
    if (!cid || !editName.trim()) return;
    setSaveBusy(true);
    try {
      const { data } = await api.patch<Conversation>(`/conversation/${cid}/settings`, {
        name: editName.trim(),
        description: editDescription.trim(),
      });
      dispatch(patchConversationInList(data));
      setConv(data);
      setEditInfo(false);
      showAppToast({ id: "group-info-saved", body: t("settingsSaved") });
    } catch (e) {
      showAppToast({
        id: "group-info-err",
        body: formatApiError(e, t, "errorOccurred"),
      });
    } finally {
      setSaveBusy(false);
    }
  };

  const applyConversationUpdate = useCallback(
    (next: Conversation | null | undefined) => {
      if (!next) return;
      dispatch(patchConversationInList(next));
      setConv(next);
      setAvatarImgFailed(false);
    },
    [dispatch],
  );

  const uploadAvatar = async (file: File) => {
    if (!cid || avatarBusy) return;
    const mime = String(file.type || "").toLowerCase();
    if (!mime.startsWith("image/")) {
      showAppToast({
        id: "conv-avatar-type",
        body: t("profileAvatarInvalidType"),
      });
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      showAppToast({
        id: "conv-avatar-size",
        body: t("profileAvatarTooLarge"),
      });
      return;
    }
    setAvatarBusy(true);
    try {
      const form = new FormData();
      form.append("avatar", file, file.name || "avatar.png");
      const { data } = await api.post<{
        conversation?: Conversation;
        url?: string;
      }>(`/conversation/${cid}/avatar/upload`, form);
      applyConversationUpdate(data?.conversation);
      showAppToast({
        id: "conv-avatar-updated",
        body: t(isChannel ? "channelAvatarUpdated" : "groupAvatarUpdated"),
      });
    } catch (e) {
      showAppToast({
        id: "conv-avatar-err",
        body: formatApiError(e, t, "errorOccurred"),
      });
    } finally {
      setAvatarBusy(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  const removeAvatar = async () => {
    if (!cid || avatarBusy || !isCustomConversationAvatar(conv?.avatar)) return;
    setAvatarBusy(true);
    try {
      const { data } = await api.delete<{ conversation?: Conversation }>(
        `/conversation/${cid}/avatar`,
      );
      applyConversationUpdate(data?.conversation);
      showAppToast({
        id: "conv-avatar-removed",
        body: t(isChannel ? "channelAvatarRemoved" : "groupAvatarRemoved"),
      });
    } catch (e) {
      showAppToast({
        id: "conv-avatar-remove-err",
        body: formatApiError(e, t, "errorOccurred"),
      });
    } finally {
      setAvatarBusy(false);
    }
  };

  const hasCustomAvatar = isCustomConversationAvatar(conv?.avatar);

  const headerAvatar = isGroupOrChannel ? (
    canEditInfo ? (
      <div className="group relative h-11 w-11 shrink-0 overflow-hidden rounded-2xl sm:h-12 sm:w-12">
        <ConversationAvatarTile
          name={displayName}
          avatar={conv?.avatar}
          fallback={isChannel ? t("channelInitialFallback") : t("groupInitialFallback")}
          size="md"
          imgFailed={avatarImgFailed}
          onImageError={() => setAvatarImgFailed(true)}
          className={cn("h-full w-full", avatarBusy && "opacity-70")}
        />
        {hasCustomAvatar ? (
          <button
            type="button"
            onClick={() => {
              if (avatarBusy) return;
              void removeAvatar();
            }}
            disabled={avatarBusy}
            aria-label={t("conversationAvatarRemove")}
            className={cn(
              "absolute inset-0 grid place-items-center overflow-hidden rounded-2xl bg-black/0 text-white opacity-0 transition",
              "hover:bg-black/38 hover:opacity-100",
              "focus-visible:bg-black/38 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
              avatarBusy && "cursor-not-allowed opacity-60",
            )}
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-black/55 shadow-sm">
              <X className="h-4 w-4" />
            </span>
          </button>
        ) : (
          <div
            role="button"
            tabIndex={avatarBusy ? -1 : 0}
            onClick={() => {
              if (avatarBusy) return;
              avatarInputRef.current?.click();
            }}
            onKeyDown={(e) => {
              if (avatarBusy) return;
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                avatarInputRef.current?.click();
              }
            }}
            aria-label={t("conversationAvatarUpload")}
            aria-disabled={avatarBusy ? "true" : "false"}
            className={cn(
              "absolute inset-0 grid place-items-center overflow-hidden rounded-2xl bg-black/0 text-white opacity-0 transition",
              "group-hover:bg-black/38 group-hover:opacity-100",
              "focus-visible:bg-black/38 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400",
              avatarBusy && "cursor-not-allowed opacity-60",
            )}
          >
            <span className="grid h-8 w-8 place-items-center rounded-full bg-black/45 shadow-sm">
              <Pencil className="h-4 w-4" />
            </span>
          </div>
        )}
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          disabled={avatarBusy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void uploadAvatar(file);
          }}
        />
      </div>
    ) : (
      <ConversationAvatarTile
        name={displayName}
        avatar={conv?.avatar}
        fallback={isChannel ? t("channelInitialFallback") : "G"}
        size="md"
        imgFailed={avatarImgFailed}
        onImageError={() => setAvatarImgFailed(true)}
      />
    )
  ) : (
    <div
      className="vs-icon-tile grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-sm font-extrabold sm:h-12 sm:w-12 sm:text-base"
      aria-hidden
    >
      {initials}
    </div>
  );

  if (isGroupOrChannel && conv && me?._id && !isGroupAdmin) {
    return null;
  }

  return (
    <DashboardPageLayout
      title={
        editInfo ? (
          isChannel ? t("channelInfoEdit") : t("groupInfoEdit")
        ) : (
          <span className="block truncate" dir="auto">
            {displayName}
          </span>
        )
      }
      description={
        editInfo
          ? undefined
          : description
            ? (
                <span dir="auto">{description}</span>
              )
            : isChannel
              ? t("channelInfoNoDescription")
              : t("groupInfoNoDescription")
      }
      maxWidth="5xl"
      headerAsideMobileFirst
      leading={headerAvatar}
      headerAside={
        <button
          type="button"
          onClick={() => router.push(`/chat/${cid}`)}
          className="vs-btn-outline-sm inline-flex min-h-10 w-auto items-center justify-center gap-2 self-start rounded-full px-4 py-2 sm:w-auto"
        >
          <ArrowLeft className={cn("h-4 w-4 shrink-0", rtl && "rotate-180")} aria-hidden />
          {t("back")}
        </button>
      }
      headerExtra={
        editInfo ? null : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="vs-chip-current inline-flex items-center gap-1.5 px-3 py-1 text-xs">
                <Users className="h-3.5 w-3.5 shrink-0" aria-hidden />
                {isChannel
                  ? t("channelListSubscriberHint", { count: memberCount })
                  : t("groupListMemberHint", { count: memberCount })}
              </span>
              {isChannel ? (
                <>
                  <span className="vs-chip-current px-3 py-1 text-xs">{t("navChannels")}</span>
                  <span className="vs-chip-current px-3 py-1 text-xs">
                    {channelVisibilityLabel(conv?.visibility, t)}
                  </span>
                  <span className="vs-chip-current px-3 py-1 text-xs">
                    {channelPostingModeLabel(conv?.channelPostingMode, t)}
                  </span>
                  {channelSlugLabel ? (
                    <span className="vs-chip-current px-3 py-1 text-xs font-medium" dir="ltr">
                      {channelSlugLabel}
                    </span>
                  ) : null}
                </>
              ) : null}
            </div>
            <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:flex sm:flex-wrap">
              <Link
                href={`/chat/${cid}`}
                className="vs-btn-primary inline-flex min-h-10 w-full items-center justify-center gap-2 px-4 py-2 text-sm sm:w-auto"
              >
                <MessageCircle className="h-4 w-4 shrink-0" aria-hidden />
                {isChannel ? t("channelInfoOpenChat") : t("groupInfoOpenChat")}
              </Link>
              {canEditInfo && isGroupOrChannel ? (
                <button
                  type="button"
                  onClick={startEdit}
                  className="vs-btn-outline inline-flex min-h-10 w-full items-center justify-center gap-2 px-4 py-2 text-sm sm:w-auto"
                >
                  <Pencil className="h-4 w-4 shrink-0" aria-hidden />
                  {isChannel ? t("channelInfoEdit") : t("groupInfoEdit")}
                </button>
              ) : null}
            </div>
          </div>
        )
      }
    >
      <div dir={dir} className="space-y-6 pb-28">
        {editInfo ? (
          <section className="vs-settings-card space-y-4">
            <h2 className="text-start text-base font-semibold text-ink">
              {isChannel ? t("channelInfoEdit") : t("groupInfoEdit")}
            </h2>
            <div className="space-y-3">
              <input
                className="vs-input w-full"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder={t("nameLabel")}
                maxLength={80}
                dir="auto"
                required
                aria-label={t("nameLabel")}
              />
              <input
                className="vs-input w-full"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder={t("groupCreateDescriptionPlaceholder")}
                maxLength={180}
                dir="auto"
                aria-label={isChannel ? t("channelDescription") : t("groupDescription")}
              />
            </div>
            <div className="flex flex-col gap-2 min-[420px]:flex-row min-[420px]:flex-wrap">
              <button
                type="button"
                disabled={saveBusy || !editName.trim()}
                onClick={() => void saveInfo()}
                className="vs-btn-primary inline-flex min-h-10 w-full items-center justify-center gap-2 px-4 py-2 text-sm disabled:opacity-60 min-[420px]:w-auto"
              >
                <Save className="h-4 w-4 shrink-0" aria-hidden />
                {saveBusy ? t("loading") : t("saveChanges")}
              </button>
              <button
                type="button"
                onClick={() => setEditInfo(false)}
                className="vs-btn-outline inline-flex min-h-10 w-full items-center justify-center px-4 py-2 text-sm min-[420px]:w-auto"
              >
                {t("cancel")}
              </button>
            </div>
          </section>
        ) : null}

        {isChannel && conv && !editInfo ? (
          <ChannelInfoOverview
            conversation={conv}
            conversationId={cid}
            isAdmin={isGroupAdmin}
          />
        ) : null}

        {!isChannel && conv && isGroupOrChannel && !editInfo ? (
          <GroupInfoOverview
            conversation={conv}
            conversationId={cid}
            isAdmin={isGroupAdmin}
            memberCount={memberCount}
          />
        ) : null}

        {isGroupAdmin && isGroupOrChannel ? (
          <section className="vs-settings-card space-y-4">
            <div className="text-start">
              <h2 className="text-base font-semibold text-ink">
                {isChannel ? t("channelInfoSubscribersTitle") : t("chatMembersTitle")}
              </h2>
              <p className="mt-1 text-sm text-muted">
                {isChannel ? t("channelInfoSubscribersHint") : t("chatMembersHint")}
              </p>
            </div>

            {loading ? (
              <div className="h-24 animate-pulse rounded-2xl border border-brand-200/35 bg-brand-100/50 dark:border-brand-800/30 dark:bg-brand-900/25" />
            ) : members.length === 0 ? (
              <div className="vs-brand-dashed-empty px-4 py-8 text-center text-sm text-muted">
                {t("noResults")}
              </div>
            ) : (
              <ul className="list-none space-y-2">
                {members.map((m) => (
                  <li
                    key={m._id}
                    className="flex flex-col gap-3 rounded-2xl border border-brand-200/45 bg-surface/85 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:border-brand-800/35 dark:bg-brand-900/15"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="vs-icon-tile grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-sm font-extrabold">
                        {groupInitials(m.name || m.username || m.email, "?")}
                      </div>
                      <div className="min-w-0 text-start">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="truncate text-sm font-semibold text-ink">
                            {m.name || m.email || m._id}
                          </span>
                          {m.isAdmin ? (
                            <span className="vs-chip-current px-2 py-0.5 text-[10px]">
                              {t("groupRoleAdmin")}
                            </span>
                          ) : (
                            <span className="rounded-full bg-subtle px-2 py-0.5 text-[10px] font-semibold text-muted">
                              {isChannel ? t("channelRoleSubscriber") : t("groupRoleMember")}
                            </span>
                          )}
                          {m.isSelf ? (
                            <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-800 dark:bg-brand-900/40 dark:text-brand-200">
                              {t("groupRoleYou")}
                            </span>
                          ) : null}
                        </div>
                        <div className="truncate text-xs text-muted">
                          {m.username
                            ? `@${m.username.replace(/^@+/, "")}`
                            : m.email}
                        </div>
                      </div>
                    </div>
                    <Link
                      href={`/user/${m._id}`}
                      className="vs-btn-outline-sm inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2 sm:w-auto"
                    >
                      <UserRound className="h-4 w-4 shrink-0" aria-hidden />
                      {t("viewProfile")}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {showAdminWorkspace ? (
          <GroupConversationWorkspace
            conversationId={cid}
            conversation={conv}
            onConversationChange={setConv}
          />
        ) : null}

        {isGroupAdmin && isGroupOrChannel ? (
          <section className="vs-settings-card">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 text-start">
                <div className="text-sm font-semibold text-ink">
                  {t("exportConversation")}
                </div>
                <div className="mt-1 text-sm text-muted">
                  {t("chatExportHint")}
                </div>
              </div>
              <button
                type="button"
                className="vs-btn-outline inline-flex w-full items-center justify-center gap-2 px-4 py-2.5 text-sm sm:w-auto"
                onClick={() => void exportChat()}
              >
                <Download className="h-4 w-4 shrink-0" aria-hidden />
                {t("exportConversation")}
              </button>
            </div>
          </section>
        ) : null}

        {isGroupOrChannel ? (
          <section className="vs-settings-card border-red-200/50 dark:border-red-900/40">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 text-start">
                <div className="text-sm font-semibold text-red-800 dark:text-red-200">
                  {conv?.isChannel ? t("channelLeave") : t("groupLeave")}
                </div>
                <div className="mt-1 text-sm text-muted">{t("chatLeaveHint")}</div>
                {isChannel && isGroupAdmin && members.length > 1 ? (
                  <div className="mt-2 text-xs text-muted">{t("channelLeaveAdminHint")}</div>
                ) : null}
              </div>
              <button
                type="button"
                className="w-full rounded-full border border-red-300 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-900 shadow-sm transition hover:bg-red-100 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100 sm:w-auto"
                onClick={async () => {
                  try {
                    await api.post(`/conversation/${cid}/leave`);
                    try {
                      const { data } = await api.get("/conversation/");
                      dispatch(setConversations(data || []));
                    } catch {
                      /* ignore */
                    }
                    router.push(conv?.isChannel ? "/channels" : "/groups");
                  } catch (e) {
                    showAppToast({
                      id: "leave-fail",
                      body: formatApiError(e, t, "errorOccurred"),
                    });
                  }
                }}
              >
                {conv?.isChannel ? t("channelLeave") : t("groupLeave")}
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </DashboardPageLayout>
  );
}
