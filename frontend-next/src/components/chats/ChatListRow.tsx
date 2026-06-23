"use client";

import { memo } from "react";
import Link from "next/link";
import {
  Pin,
  BellOff,
  PencilLine,
  Archive,
  EyeOff,
  MoreVertical,
} from "lucide-react";
import {
  DropdownPortal,
  DropdownRoot,
  DropdownTrigger,
  VegaDropdownContent,
  VegaDropdownIconTrigger,
  VegaDropdownItem,
} from "@/components/ui/VegaDropdownMenu";
import { cn } from "@/lib/classNames";
import { resolveAvatarUrl, shouldUseLocalAvatarFallback, conversationAvatarUrl } from "@/lib/avatarUrl";
import PresenceDot from "@/components/presence/PresenceDot";
import { presenceStateForUser } from "@/hooks/usePresenceBatch";
import {
  dmPeerUserId,
  dmPeerMember,
  avatarProfileHref,
  unreadTotal,
  formatChatListStamp,
  conversationKindMeta,
  conversationLatestPreview,
  formatConversationPreview,
  isGroupOnlyConversation,
} from "@/lib/chatList";

function ChatListRow({
  c,
  user,
  t,
  language,
  draftsByConversation,
  localDelta,
  presenceById,
  onTogglePinned,
  onInboxAction,
  suppressTopBorder = false,
  chatHref,
  compact = false,
  isActive = false,
  rtl = false,
}) {
  const id = c._id;
  const peer = dmPeerMember(c, user?._id) || c.members?.[0];
  const title = c.isSelfChat ? t("navSaved") : c.name || peer?.name || peer?.email || "Chat";
  const preview = conversationLatestPreview(c);
  const draftMeta = draftsByConversation[String(id)] || null;
  const draft = draftMeta?.text || "";
  const unread = unreadTotal(c, user?._id, localDelta);
  const peerId = dmPeerUserId(c, user?._id);
  const memberCount = isGroupOnlyConversation(c) ? c.members?.length || 0 : 0;
  const kind = conversationKindMeta(c, t);
  const rawAvatarUrl =
    c.isGroup || c.isChannel
      ? String(c.avatar || "")
      : c.isSelfChat
        ? user?.profilePic || ""
        : peer?.profilePic || "";
  const useLocalAvatar =
    c.isGroup || c.isChannel
      ? !conversationAvatarUrl(rawAvatarUrl)
      : shouldUseLocalAvatarFallback(rawAvatarUrl);
  const avatarUrl = useLocalAvatar ? "" : resolveAvatarUrl(rawAvatarUrl);
  const profileHref = avatarProfileHref(c, user);
  const initials = String(title || "V")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((s) => s[0])
    .join("")
    .toUpperCase();
  const updatedAt = draftMeta?.updatedAt
    ? new Date(draftMeta.updatedAt)
    : c.updatedAt
      ? new Date(c.updatedAt)
      : null;
  const timeLabel = formatChatListStamp(updatedAt, t);
  const previewText = draft ? draft : formatConversationPreview(preview, t);
  const archiveAction = c.isArchivedForMe ? "unarchive" : "archive";
  const muteAction = c.isMutedForMe ? "unmute" : "mute";
  const presence = peerId ? presenceById?.[String(peerId)] : null;
  const isPeerOnline =
    !c.isGroup &&
    !c.isChannel &&
    !c.isSelfChat &&
    peerId &&
    (presence?.online === true ||
      presence?.online === 1 ||
      presence?.online === "1" ||
      presence?.online === "true");

  return (
    <li className="overflow-hidden">
      <div
        dir={rtl ? "rtl" : "ltr"}
        className={cn(
          "group relative grid grid-cols-[auto,minmax(0,1fr),auto] items-start gap-2 border-t border-brand-200/35 bg-surface transition-colors hover:bg-brand-50/45 dark:border-brand-800/30 dark:hover:bg-brand-800/20 sm:items-center sm:gap-3",
          compact ? "px-3 py-2.5" : "px-3 py-3.5 sm:px-4 md:px-6",
          suppressTopBorder && "border-t-0",
          c.isMutedForMe && "opacity-90",
          isActive &&
            "bg-brand-50/80 hover:bg-brand-50/80 dark:bg-brand-800/30 dark:hover:bg-brand-800/30",
        )}
      >
        {profileHref ? (
          <Link
            href={profileHref}
            className="relative h-10 w-10 shrink-0 rounded-2xl outline-none ring-brand-400/0 transition hover:opacity-95 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:focus-visible:ring-offset-gray-950 sm:h-11 sm:w-11"
            aria-label={t("viewProfile")}
            title={t("viewProfile")}
            onClick={(e) => e.stopPropagation()}
          >
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt=""
                className="h-10 w-10 rounded-2xl object-cover ring-1 ring-brand-200/60 dark:ring-brand-800/50 sm:h-11 sm:w-11"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-100 text-sm font-extrabold text-brand-700 ring-1 ring-brand-200/60 dark:bg-brand-900/30 dark:text-brand-200 dark:ring-brand-800/50 sm:h-11 sm:w-11">
                {initials || "V"}
              </div>
            )}
            {!c.isGroup && !c.isChannel && !c.isSelfChat ? (
              <span className="pointer-events-none absolute bottom-0 end-0 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-surface ring-1 ring-brand-200/60 dark:bg-black dark:ring-white/10">
                <PresenceDot state={presenceStateForUser(presenceById, peerId)} />
              </span>
            ) : null}
          </Link>
        ) : (
          <div className="relative h-10 w-10 shrink-0 sm:h-11 sm:w-11">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatarUrl}
                alt=""
                className="h-10 w-10 rounded-2xl object-cover ring-1 ring-brand-200/60 dark:ring-brand-800/50 sm:h-11 sm:w-11"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand-100 text-sm font-extrabold text-brand-700 ring-1 ring-brand-200/60 dark:bg-brand-900/30 dark:text-brand-200 dark:ring-brand-800/50 sm:h-11 sm:w-11">
                {initials || "V"}
              </div>
            )}
          </div>
        )}
        <Link
          href={chatHref || `/chat/${id}`}
          aria-current={isActive ? "page" : undefined}
          className="flex min-w-0 flex-1 items-start gap-2 sm:items-center sm:gap-3"
        >
          <div className="min-w-0 flex-1 text-start">
            <div className="flex items-start justify-between gap-2 sm:items-center sm:gap-3">
              <div className="min-w-0 flex-1 overflow-hidden text-start">
                <div className="flex min-w-0 items-center gap-1 sm:gap-1.5">
                  {c.isPinnedForMe ? (
                    <span
                      className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-700 dark:bg-brand-900/45 dark:text-brand-200 sm:h-5 sm:w-5"
                      title={t("chatPinnedBadge")}
                    >
                      <Pin className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    </span>
                  ) : null}
                  {rtl ? (
                    <span
                      className="grid min-w-0 flex-1 justify-items-start overflow-hidden"
                      dir="rtl"
                    >
                      <span
                        dir={/[\u0600-\u06FF]/.test(title) ? "rtl" : "ltr"}
                        className="max-w-full truncate text-[13px] font-semibold leading-snug text-ink sm:text-sm"
                        title={title}
                      >
                        {title}
                      </span>
                    </span>
                  ) : (
                    <span
                      className="min-w-0 flex-1 truncate text-start text-[13px] font-semibold leading-snug text-ink sm:text-sm"
                      title={title}
                    >
                      {title}
                    </span>
                  )}
                  {kind.label ? (
                    <span
                      className={cn(
                        "hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide sm:inline-flex",
                        kind.tone,
                      )}
                    >
                      {kind.label}
                    </span>
                  ) : null}
                  {memberCount > 0 ? (
                    <span className="hidden shrink-0 text-[10px] font-medium text-muted sm:inline">
                      {t("groupListMemberHint", { count: memberCount })}
                    </span>
                  ) : null}
                  {c.isSelfChat ? (
                    <span className="hidden shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-800 dark:bg-brand-900/50 dark:text-[rgb(var(--vega-ink))] sm:inline-flex">
                      {t("savedSelfBadge")}
                    </span>
                  ) : null}
                </div>
                {kind.label || memberCount > 0 || c.isSelfChat ? (
                  <div className="mt-1 flex flex-wrap items-center gap-1 sm:hidden">
                    {kind.label ? (
                      <span
                        className={cn(
                          "inline-flex shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                          kind.tone,
                        )}
                      >
                        {kind.label}
                      </span>
                    ) : null}
                    {memberCount > 0 ? (
                      <span className="shrink-0 text-[10px] font-medium text-muted">
                        {t("groupListMemberHint", { count: memberCount })}
                      </span>
                    ) : null}
                    {c.isSelfChat ? (
                      <span className="inline-flex shrink-0 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-800 dark:bg-brand-900/50 dark:text-[rgb(var(--vega-ink))]">
                        {t("savedSelfBadge")}
                      </span>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1 pt-0.5 sm:pt-0">
                <div className="flex items-center gap-1">
                  {isPeerOnline ? (
                    <span className="hidden rounded-full bg-brand-100/90 px-1.5 py-px text-[9px] font-semibold leading-none text-brand-800 dark:bg-brand-900/50 dark:text-[rgb(var(--vega-ink))] sm:inline-flex">
                      {t("presenceOnline")}
                    </span>
                  ) : null}
                  {timeLabel ? (
                    <span className="whitespace-nowrap text-[10px] font-medium tabular-nums leading-none text-muted">
                      {timeLabel}
                    </span>
                  ) : null}
                  {unread > 0 ? (
                    <span className="min-w-[1.25rem] rounded-full bg-brand-700 px-1 py-px text-center text-[9px] font-bold leading-4 text-white shadow-sm shadow-brand-900/30 dark:bg-brand-700 dark:shadow-brand-900/50 sm:min-w-[1.4rem] sm:px-1.5 sm:py-0.5 sm:text-[10px]">
                      {unread > 99 ? "99+" : unread}
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="mt-1.5 flex items-center justify-between gap-2 sm:mt-1">
              <div
                className={cn(
                  "min-w-0 flex-1 truncate text-start text-[11px] leading-snug sm:text-xs",
                  draft
                    ? "font-medium text-brand-700 dark:text-[rgb(var(--vega-ink))]/90"
                    : "text-muted",
                )}
              >
                {draft ? `${t("chatDraftBadge")}: ${previewText}` : previewText}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                {draft ? (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-800 dark:bg-brand-900/35 dark:text-[rgb(var(--vega-ink))]/90"
                    title={t("chatDraftBadge")}
                  >
                    <PencilLine className="h-3 w-3" />
                    <span className="hidden sm:inline">{t("chatDraftBadge")}</span>
                  </span>
                ) : null}
                {c.isMutedForMe ? (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2 py-0.5 text-[10px] font-semibold text-muted dark:bg-brand-900/25"
                    title={t("chatMutedBadge")}
                  >
                    <BellOff className="h-3 w-3" />
                    <span className="hidden sm:inline">{t("chatMutedBadge")}</span>
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </Link>
        <DropdownRoot modal={false} dir={rtl ? "rtl" : "ltr"}>
          <DropdownTrigger asChild>
            <VegaDropdownIconTrigger
              aria-label={t("chatListRowMenu")}
              title={t("chatListRowMenu")}
              className="self-center"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreVertical className="h-4 w-4" aria-hidden />
            </VegaDropdownIconTrigger>
          </DropdownTrigger>
          <DropdownPortal>
            <VegaDropdownContent wide align={rtl ? "start" : "end"}>
              <VegaDropdownItem
                onSelect={() => {
                  void onTogglePinned(id, Boolean(c.isPinnedForMe));
                }}
              >
                <Pin aria-hidden />
                <span>{c.isPinnedForMe ? t("chatUnpin") : t("chatPin")}</span>
              </VegaDropdownItem>
              {!c.isHiddenForMe ? (
                <>
                  <VegaDropdownItem
                    onSelect={() => {
                      void onInboxAction(id, muteAction);
                    }}
                  >
                    <BellOff aria-hidden />
                    <span>{c.isMutedForMe ? t("chatUnmute") : t("chatMute")}</span>
                  </VegaDropdownItem>
                  <VegaDropdownItem
                    onSelect={() => {
                      void onInboxAction(id, archiveAction);
                    }}
                  >
                    <Archive aria-hidden />
                    <span>
                      {c.isArchivedForMe ? t("chatUnarchive") : t("chatArchive")}
                    </span>
                  </VegaDropdownItem>
                  <VegaDropdownItem
                    onSelect={() => {
                      void onInboxAction(id, "hide");
                    }}
                  >
                    <EyeOff aria-hidden />
                    <span>{t("chatHide")}</span>
                  </VegaDropdownItem>
                </>
              ) : null}
            </VegaDropdownContent>
          </DropdownPortal>
        </DropdownRoot>
      </div>
    </li>
  );
}

export default memo(ChatListRow);
