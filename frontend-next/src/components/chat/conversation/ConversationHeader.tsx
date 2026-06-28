"use client";

import { useEffect, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Users,
  User,
  Images,
  CheckSquare,
  MoreVertical,
  Check,
  Eye,
  Timer,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/classNames";
import { api } from "@/lib/api";
import { showAppToast } from "@/lib/appToast";
import { formatApiError } from "@/lib/apiError";
import { syncConversations } from "@/lib/syncConversations";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import PresenceDot from "@/components/presence/PresenceDot";
import { presenceStateForUser } from "@/hooks/usePresenceBatch";
import { API_ORIGIN } from "@/lib/constants";
import ConversationCallButtons from "@/components/calls/ConversationCallButtons";
import ConversationAvatarTile from "@/components/conversation/ConversationAvatarTile";
import {
  groupChannelDisplayName,
  groupChannelInfoTitleKey,
} from "@/lib/chatList";
import { isConversationAdmin } from "@/lib/groupsHub";
import { rememberChatBackFrom } from "@/lib/callContext";
import {
  DropdownPortal,
  DropdownRoot,
  DropdownSub,
  DropdownTrigger,
  VegaDropdownContent,
  VegaDropdownItem,
  VegaDropdownSeparator,
  VegaDropdownSubContent,
  VegaDropdownSubTrigger,
} from "@/components/ui/VegaDropdownMenu";

function isOptimizableAvatarUrl(url) {
  const v = String(url || "").trim();
  if (!v) return false;
  if (v.startsWith("/")) return true;
  const origin = String(API_ORIGIN || "").replace(/\/+$/, "");
  return origin && v.startsWith(origin);
}

export default function ConversationHeader({
  rtl,
  t,
  cid,
  peerUserId,
  peerMember,
  peerDisplayName,
  activeConv,
  typingLine,
  peerPresenceLine,
  presenceById,
  availableTopics = [],
  activeTopicId = "general",
  onTopicChange,
  onOpenAssets,
  selectionMode = false,
  onEnterSelection,
  onExitSelection,
  disappearAfterSec = 0,
  setDisappearAfterSec,
  viewOnceNext = false,
  setViewOnceNext,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const dispatch = useAppDispatch();
  const me = useAppSelector((s) => s.auth.user);
  const fromParam = searchParams.get("from") || "";

  useEffect(() => {
    if (fromParam) rememberChatBackFrom(fromParam);
  }, [fromParam]);

  const avatarSrc = peerMember?.profilePic;
  const useNextImage = isOptimizableAvatarUrl(avatarSrc);
  const groupChannelName = groupChannelDisplayName(activeConv);
  const headerTitle = groupChannelName || peerDisplayName || t("navChats");
  const infoTitleKey = groupChannelInfoTitleKey(activeConv);
  const showGroupChannelAvatar = Boolean(
    activeConv?.isGroup || activeConv?.isChannel,
  );
  const canCall = Boolean(
    cid &&
    activeConv &&
    !activeConv.isSelfChat &&
    !activeConv.isChannel &&
    (activeConv.isGroup || peerUserId),
  );
  const isGroupChannel = Boolean(activeConv?.isGroup || activeConv?.isChannel);
  const isGroupChannelAdmin = isConversationAdmin(activeConv, me?._id);
  const showPeerProfileLink = Boolean(peerUserId && !isGroupChannel);
  const peerProfileHref = showPeerProfileLink
    ? `/user/${encodeURIComponent(String(peerUserId))}`
    : null;

  const leaveGroupChannel = async () => {
    if (!cid || !isGroupChannel) return;
    try {
      await api.post(`/conversation/${cid}/leave`);
      await syncConversations(dispatch);
      router.push(activeConv?.isChannel ? "/channels" : "/groups");
    } catch (e) {
      showAppToast({
        id: `leave-gc-${cid}`,
        body: formatApiError(e, t, "errorOccurred"),
      });
    }
  };

  const disappearOptions = useMemo(
    () => [
      { value: 0, label: t("disappearOff") },
      { value: 30, label: t("disappear30s") },
      { value: 300, label: t("disappear5m") },
      { value: 3600, label: t("disappear1h") },
      { value: 86400, label: t("disappear1d") },
    ],
    [t],
  );

  const hasMenuHighlight =
    selectionMode || disappearAfterSec > 0 || viewOnceNext;

  const headerIconBtn =
    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-brand-200/50 bg-surface/85 text-brand-700 shadow-sm outline-none transition hover:border-brand-400/60 hover:bg-brand-50/60 focus-visible:ring-2 focus-visible:ring-brand-400 dark:border-white/10 dark:bg-white/[0.03] dark:text-[rgb(var(--vega-ink))]/90 dark:hover:border-brand-700/50 dark:hover:bg-brand-900/20 dark:focus-visible:ring-offset-gray-950";

  const showMoreMenu =
    showPeerProfileLink ||
    onOpenAssets ||
    onEnterSelection ||
    typeof setDisappearAfterSec === "function" ||
    typeof setViewOnceNext === "function" ||
    isGroupChannel;

  const peerAvatarInner = (
    <div className="relative h-9 w-9 overflow-hidden rounded-full bg-brand-100 ring-1 ring-brand-200/60 vs-dark-brand-icon-tile dark:ring-brand-800/50">
      {avatarSrc && useNextImage ? (
        <Image
          src={avatarSrc.startsWith("/") ? avatarSrc : avatarSrc}
          alt={peerDisplayName || "Avatar"}
          fill
          sizes="36px"
          className="object-cover"
          unoptimized={!avatarSrc.startsWith("/")}
        />
      ) : avatarSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarSrc}
          alt={peerDisplayName || "Avatar"}
          className="h-full w-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-gray-700 dark:text-gray-200">
          {String(peerDisplayName || "?")
            .trim()
            .slice(0, 1)
            .toUpperCase()}
        </div>
      )}
    </div>
  );

  const peerAvatar = peerUserId ? (
    <div className="relative shrink-0">
      {peerProfileHref ? (
        <Link
          href={peerProfileHref}
          className="block rounded-full outline-none transition hover:opacity-90 focus-visible:ring-2 focus-visible:ring-brand-400"
          title={t("viewProfile")}
          aria-label={t("viewProfile")}
        >
          {peerAvatarInner}
        </Link>
      ) : (
        peerAvatarInner
      )}
      <PresenceDot
        state={presenceStateForUser(presenceById, peerUserId)}
        className="absolute -bottom-0.5 -end-0.5"
      />
    </div>
  ) : showGroupChannelAvatar ? (
    <ConversationAvatarTile
      name={headerTitle}
      avatar={String(activeConv?.avatar || "")}
      size="xs"
      rounded="full"
    />
  ) : null;

  return (
    <header className="sticky top-0 z-20 border-b border-brand-200/45 bg-surface/88 px-3 py-2.5 shadow-sm backdrop-blur-xl dark:border-white/10 dark:bg-black/80 md:px-4 md:py-3">
      <div className="flex min-w-0 items-center gap-1.5" dir="ltr">
        <div
          className={cn(
            "flex min-w-0 flex-1 items-center overflow-hidden",
            rtl ? "order-2 justify-end" : "order-1 justify-start",
          )}
        >
          <div
            className="inline-flex w-fit min-w-0 shrink-0 items-center gap-1"
            dir="ltr"
          >
            {!rtl ? peerAvatar : null}
            <div
              className={cn(
                "min-w-0 max-w-[min(100vw-11rem,18rem)] shrink leading-tight",
                rtl ? "w-fit text-end" : "w-fit text-start",
              )}
            >
              <div
                className="truncate text-sm font-semibold text-ink"
                dir="auto"
              >
                {peerProfileHref ? (
                  <Link
                    href={peerProfileHref}
                    className="truncate outline-none transition hover:text-brand-700 hover:underline focus-visible:underline dark:hover:text-[rgb(var(--vega-ink))]"
                    title={t("viewProfile")}
                  >
                    {headerTitle}
                  </Link>
                ) : (
                  headerTitle
                )}
              </div>
              {typingLine ? (
                <div
                  className="truncate text-[11px] text-muted"
                  dir="auto"
                >
                  {typingLine}
                </div>
              ) : peerPresenceLine ? (
                <div
                  className="truncate text-[11px] text-muted"
                  dir="auto"
                >
                  {peerPresenceLine}
                </div>
              ) : null}
            </div>
            {rtl ? peerAvatar : null}
          </div>
        </div>
        <div
          className={cn(
            "flex shrink-0 items-center gap-1",
            rtl ? "order-1 flex-row-reverse" : "order-2",
          )}
        >
          <ConversationCallButtons
            conversationId={cid}
            peerUserId={peerUserId || ""}
            canCall={canCall}
            compact
            className={cn("gap-1", rtl && "flex-row-reverse")}
          />
          {isGroupChannel && isGroupChannelAdmin ? (
            <button
              type="button"
              onClick={() => router.push(`/chat/${cid}/info`)}
              className={headerIconBtn}
              title={t(infoTitleKey)}
              aria-label={t(infoTitleKey)}
            >
              <Users className="h-4 w-4" aria-hidden />
            </button>
          ) : null}
          {showMoreMenu ? (
            <DropdownRoot dir={rtl ? "rtl" : "ltr"}>
              <DropdownTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    headerIconBtn,
                    hasMenuHighlight &&
                      "border-brand-400 bg-brand-50 text-brand-800 dark:border-brand-700/50 dark:bg-brand-900/30 dark:text-brand-100",
                  )}
                  title={t("chatListRowMenu")}
                  aria-label={t("chatListRowMenu")}
                  aria-haspopup="menu"
                >
                  <MoreVertical className="h-4 w-4" aria-hidden />
                </button>
              </DropdownTrigger>
              <DropdownPortal>
                <VegaDropdownContent align="start" className="min-w-[11.5rem]">
                  {peerProfileHref ? (
                    <VegaDropdownItem onSelect={() => router.push(peerProfileHref)}>
                      <User className="h-4 w-4" aria-hidden />
                      {t("viewProfile")}
                    </VegaDropdownItem>
                  ) : null}
                  {onOpenAssets ? (
                    <VegaDropdownItem onSelect={onOpenAssets}>
                      <Images className="h-4 w-4" aria-hidden />
                      {t("chatAssetsMedia")}
                    </VegaDropdownItem>
                  ) : null}
                  {onEnterSelection ? (
                    <VegaDropdownItem
                      variant={selectionMode ? "selected" : "default"}
                      onSelect={
                        selectionMode ? onExitSelection : onEnterSelection
                      }
                    >
                      <CheckSquare className="h-4 w-4" aria-hidden />
                      {selectionMode
                        ? t("chatCancelSelection")
                        : t("chatSelectMessages")}
                    </VegaDropdownItem>
                  ) : null}
                  {typeof setDisappearAfterSec === "function" ||
                  typeof setViewOnceNext === "function" ? (
                    <>
                      <VegaDropdownSeparator />
                      {typeof setDisappearAfterSec === "function" ? (
                        <DropdownSub>
                          <VegaDropdownSubTrigger className="justify-between">
                            <span className="inline-flex items-center gap-2">
                              <Timer className="h-4 w-4" aria-hidden />
                              {t("disappearModeLabel")}
                            </span>
                          </VegaDropdownSubTrigger>
                          <DropdownPortal>
                            <VegaDropdownSubContent className="min-w-[9.5rem]">
                              {disappearOptions.map((opt) => {
                                const selected = opt.value === disappearAfterSec;
                                return (
                                  <VegaDropdownItem
                                    key={opt.value}
                                    variant={selected ? "selected" : "default"}
                                    className="justify-between gap-3"
                                    onSelect={() =>
                                      setDisappearAfterSec(opt.value)
                                    }
                                  >
                                    <span>{opt.label}</span>
                                    {selected ? (
                                      <Check
                                        className="h-3.5 w-3.5 shrink-0 vega-brand-text"
                                        aria-hidden
                                      />
                                    ) : null}
                                  </VegaDropdownItem>
                                );
                              })}
                            </VegaDropdownSubContent>
                          </DropdownPortal>
                        </DropdownSub>
                      ) : null}
                      {typeof setViewOnceNext === "function" ? (
                        <VegaDropdownItem
                          variant={viewOnceNext ? "selected" : "default"}
                          onSelect={() => setViewOnceNext((v) => !v)}
                        >
                          <Eye className="h-4 w-4" aria-hidden />
                          {t("viewOnceLabel")}
                        </VegaDropdownItem>
                      ) : null}
                    </>
                  ) : null}
                  {isGroupChannel ? (
                    <>
                      <VegaDropdownSeparator />
                      <VegaDropdownItem
                        variant="danger"
                        onSelect={() => void leaveGroupChannel()}
                      >
                        <LogOut className="h-4 w-4" aria-hidden />
                        {activeConv?.isChannel ? t("channelLeave") : t("groupLeave")}
                      </VegaDropdownItem>
                    </>
                  ) : null}
                </VegaDropdownContent>
              </DropdownPortal>
            </DropdownRoot>
          ) : null}
        </div>
      </div>

      {availableTopics.length > 1 ? (
        <div className="mt-2 flex gap-2 overflow-x-auto pb-0.5">
          {availableTopics.map((topic) => {
            const id = String(topic.id || "general");
            const active = String(activeTopicId || "general") === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onTopicChange?.(id)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1 text-xs font-semibold transition",
                  active
                    ? "border-brand-400 bg-brand-100 text-brand-800 vs-dark-brand-chip"
                    : "border-brand-200/50 bg-surface/85 text-muted hover:border-brand-300 dark:border-white/10 dark:bg-white/[0.03]",
                )}
              >
                {topic.name || t("topicGeneral")}
              </button>
            );
          })}
        </div>
      ) : null}
    </header>
  );
}
