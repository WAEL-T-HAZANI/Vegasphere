"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Expand, Heart, MessageCircle, Trash2, Users } from "lucide-react";
import { api } from "@/lib/api";
import { formatApiError } from "@/lib/apiError";
import { showAppToast } from "@/lib/appToast";
import { cn } from "@/lib/classNames";
import {
  formatStatusExpiry,
  resolveStatusImageUrl,
  statusInitials,
} from "@/lib/statusMedia";
import type { StatusItem, StatusReply, StatusViewer } from "@/types/status";
import { statusOwnerAvatar, statusOwnerId, statusOwnerName } from "@/types/status";

const STATUS_EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🔥"] as const;

type StatusFeedCardProps = {
  item: StatusItem;
  stackItems?: StatusItem[];
  currentUserId?: string;
  formatRelative: (date: string) => string;
  onView: (id: string) => void;
  isMine?: boolean;
  onDelete?: (id: string) => void;
  onUpdated?: () => void;
};

function viewerUserId(viewer: StatusViewer): string {
  const u = viewer.userId;
  if (u && typeof u === "object") return String(u._id || "").trim();
  return String(u || "").trim();
}

function viewerDisplayName(viewer: StatusViewer): string {
  const u = viewer.userId;
  if (u && typeof u === "object") {
    return String(u.name || u._id || "").trim();
  }
  return String(u || "").trim();
}

export default function StatusFeedCard({
  item,
  stackItems,
  currentUserId,
  formatRelative,
  onView,
  isMine,
  onDelete,
  onUpdated,
}: StatusFeedCardProps) {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === "rtl";
  const cardRef = useRef<HTMLLIElement>(null);
  const viewedRef = useRef(false);
  const stack = useMemo(
    () => (stackItems?.length ? stackItems : [item]),
    [stackItems, item],
  );
  const [stackIndex, setStackIndex] = useState(0);
  const activeItem = stack[Math.min(stackIndex, stack.length - 1)] || item;

  const [reply, setReply] = useState("");
  const [viewers, setViewers] = useState<StatusViewer[] | null>(null);
  const [msg, setMsg] = useState("");
  const [imageOpen, setImageOpen] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [reactionCount, setReactionCount] = useState(activeItem.reactionCount ?? 0);
  const [replyCount, setReplyCount] = useState(activeItem.replyCount ?? 0);
  const [replies, setReplies] = useState<StatusReply[]>(activeItem.replies || []);
  const [myReplies, setMyReplies] = useState<StatusReply[]>(activeItem.myReplies || []);
  const [myReaction, setMyReaction] = useState(activeItem.myReactionEmoji || "");
  const [reacting, setReacting] = useState(false);
  const [replying, setReplying] = useState(false);

  const label = statusOwnerName(activeItem) || "—";
  const avatarUrl = statusOwnerAvatar(activeItem);
  const initials = statusInitials(label);
  const imageSrc = resolveStatusImageUrl(activeItem.imageUrl);
  const ownerId = statusOwnerId(activeItem);
  const isOwnStatus = Boolean(
    isMine ||
      (currentUserId && ownerId && String(currentUserId) === String(ownerId)),
  );
  const stackTotal = stack.length;

  useEffect(() => {
    setStackIndex(0);
  }, [stackItems]);

  useEffect(() => {
    viewedRef.current = false;
    setImageFailed(false);
    setViewers(null);
  }, [activeItem._id]);

  useEffect(() => {
    setReactionCount(activeItem.reactionCount ?? 0);
    setReplyCount(activeItem.replyCount ?? 0);
    setReplies(Array.isArray(activeItem.replies) ? activeItem.replies : []);
    setMyReplies(Array.isArray(activeItem.myReplies) ? activeItem.myReplies : []);
    setMyReaction(activeItem.myReactionEmoji || "");
  }, [activeItem]);

  useEffect(() => {
    const el = cardRef.current;
    if (!el || viewedRef.current || isOwnStatus) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && !viewedRef.current) {
          viewedRef.current = true;
          onView(activeItem._id);
        }
      },
      { threshold: 0.45 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [activeItem._id, isOwnStatus, onView]);

  const react = async (emoji: string) => {
    if (reacting || isOwnStatus) return;
    setReacting(true);
    setMsg("");
    try {
      const { data } = await api.post<{
        reactionCount?: number;
        myReactionEmoji?: string;
      }>(`/status/${activeItem._id}/react`, { emoji });
      setReactionCount(data?.reactionCount ?? reactionCount);
      setMyReaction(data?.myReactionEmoji || emoji);
      showAppToast({ id: `status-react-${activeItem._id}`, body: t("statusReacted") });
    } catch (e) {
      const err = formatApiError(e, t, "errorOccurred");
      setMsg(err);
      showAppToast({ id: `status-react-err-${activeItem._id}`, body: err });
    } finally {
      setReacting(false);
    }
  };

  const sendReply = async () => {
    const text = reply.trim();
    if (!text || replying || isOwnStatus) return;
    setReplying(true);
    setMsg("");
    try {
      const { data } = await api.post<{ replyCount?: number; reply?: StatusReply }>(
        `/status/${activeItem._id}/reply`,
        { text },
      );
      setReplyCount(data?.replyCount ?? replyCount + 1);
      if (data?.reply) {
        setMyReplies((prev) => [...prev, data.reply as StatusReply]);
      }
      setReply("");
      showAppToast({
        id: `status-reply-${activeItem._id}`,
        body: t("statusRepliedToOwner", { name: label }),
      });
      onUpdated?.();
    } catch (e) {
      const err = formatApiError(e, t, "errorOccurred");
      setMsg(err);
      showAppToast({ id: `status-reply-err-${activeItem._id}`, body: err });
    } finally {
      setReplying(false);
    }
  };

  const loadViewers = async () => {
    if (!isOwnStatus) return;
    try {
      const { data } = await api.get<StatusViewer[]>(`/status/${activeItem._id}/viewers`);
      setViewers(Array.isArray(data) ? data : []);
    } catch (e) {
      setMsg(formatApiError(e, t, "errorOccurred"));
    }
  };

  const profileHref = ownerId && !isOwnStatus ? `/user/${ownerId}` : null;

  const avatarBlock = avatarUrl ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={avatarUrl}
      alt=""
      className="h-11 w-11 rounded-2xl object-cover ring-1 ring-brand-200/60 dark:ring-brand-800/50"
    />
  ) : (
    <div className="flex h-11 w-11 items-center justify-center rounded-2xl vs-icon-tile text-sm font-extrabold">
      {initials || "V"}
    </div>
  );

  return (
    <>
      <li ref={cardRef} className="vs-feed-card p-4 sm:p-5" dir={rtl ? "rtl" : "ltr"}>
        <div className="flex items-start gap-3">
          <div className="relative h-11 w-11 shrink-0">
            {profileHref ? (
              <Link href={profileHref} className="block rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-brand-400">
                {avatarBlock}
              </Link>
            ) : (
              avatarBlock
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              {profileHref ? (
                <Link
                  href={profileHref}
                  className="truncate text-sm font-semibold text-ink hover:text-brand-700 dark:hover:text-brand-200"
                >
                  {label}
                </Link>
              ) : (
                <span className="truncate text-sm font-semibold text-ink">{label}</span>
              )}
              {activeItem.createdAt ? (
                <span className="text-xs text-muted">{formatRelative(activeItem.createdAt)}</span>
              ) : null}
              {stackTotal > 1 ? (
                <span className="rounded-full vs-chip-current px-2 py-0.5 text-[10px] font-bold">
                  {t("statusStackCount", { current: stackIndex + 1, total: stackTotal })}
                </span>
              ) : null}
            </div>

            {stackTotal > 1 ? (
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  disabled={stackIndex <= 0}
                  onClick={() => setStackIndex((n) => Math.max(0, n - 1))}
                  className="vs-btn-outline-sm inline-flex h-8 w-8 items-center justify-center p-0 disabled:opacity-40"
                  aria-label={t("statusStackPrev")}
                >
                  <ChevronLeft className={cn("h-4 w-4", rtl && "rotate-180")} aria-hidden />
                </button>
                <span className="text-xs font-semibold text-muted">
                  {t("statusStackHint", { count: stackTotal })}
                </span>
                <button
                  type="button"
                  disabled={stackIndex >= stackTotal - 1}
                  onClick={() => setStackIndex((n) => Math.min(stackTotal - 1, n + 1))}
                  className="vs-btn-outline-sm inline-flex h-8 w-8 items-center justify-center p-0 disabled:opacity-40"
                  aria-label={t("statusStackNext")}
                >
                  <ChevronRight className={cn("h-4 w-4", rtl && "rotate-180")} aria-hidden />
                </button>
              </div>
            ) : null}

            {activeItem.expiresAt ? (
              <p className="mt-0.5 text-start text-xs text-muted">
                {formatStatusExpiry(activeItem.expiresAt, t)}
              </p>
            ) : null}

            {activeItem.text ? (
              <p
                className="mt-2 whitespace-pre-wrap text-start text-sm leading-relaxed text-ink"
                dir="auto"
              >
                {activeItem.text}
              </p>
            ) : null}

            {imageSrc && !imageFailed ? (
              <div className="relative mt-3 overflow-hidden rounded-2xl border vs-brand-divider dark:border-brand-800/30">
                <button
                  type="button"
                  onClick={() => setImageOpen(true)}
                  className="group block w-full"
                  aria-label={t("statusImageExpand")}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imageSrc}
                    alt=""
                    className="max-h-80 w-full object-cover transition group-hover:opacity-95 sm:max-h-96"
                    onError={() => setImageFailed(true)}
                  />
                  <span className="pointer-events-none absolute end-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white opacity-0 transition group-hover:opacity-100">
                    <Expand className="h-4 w-4" aria-hidden />
                  </span>
                </button>
              </div>
            ) : null}
            {imageFailed ? (
              <p className="mt-2 text-xs text-red-600 dark:text-red-300">{t("statusImageLoadFailed")}</p>
            ) : null}

            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold text-muted">
              {isOwnStatus ? (
                <span className="inline-flex items-center gap-1 rounded-full vs-chip-current px-2.5 py-1">
                  <Users className="h-3.5 w-3.5" aria-hidden />
                  {t("statusViewerCount", { count: activeItem.viewerCount ?? 0 })}
                </span>
              ) : null}
              {isOwnStatus && reactionCount > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full vs-chip-current px-2.5 py-1">
                  <Heart className="h-3.5 w-3.5" aria-hidden />
                  {t("statusReactionCount", { count: reactionCount })}
                </span>
              ) : null}
              {isOwnStatus && replyCount > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full vs-chip-current px-2.5 py-1">
                  <MessageCircle className="h-3.5 w-3.5" aria-hidden />
                  {t("statusReplyCount", { count: replyCount })}
                </span>
              ) : null}
              {myReaction ? (
                <span className="rounded-full vs-chip-current px-2.5 py-1">
                  {t("statusYourReaction", { emoji: myReaction })}
                </span>
              ) : null}
            </div>

            {!isOwnStatus ? (
              <div className="mt-4 grid gap-3 border-t vs-brand-divider pt-4 dark:border-brand-800/30">
                <div>
                  <p className="mb-2 text-xs font-semibold text-muted">{t("statusReactAction")}</p>
                  <div
                    className="flex flex-wrap gap-2"
                    role="group"
                    aria-label={t("statusReactPickerLabel")}
                  >
                    {STATUS_EMOJIS.map((emoji) => {
                      const active = myReaction === emoji;
                      return (
                        <button
                          key={emoji}
                          type="button"
                          disabled={reacting}
                          onClick={() => void react(emoji)}
                          className={cn(
                            "inline-flex h-10 min-w-10 items-center justify-center rounded-2xl border px-2 text-lg transition disabled:opacity-60",
                            active
                              ? "border-brand-500 bg-brand-100 ring-2 ring-brand-400/40 dark:border-brand-700 dark:bg-brand-900/50 dark:ring-brand-800/40"
                              : "vs-brand-inset hover:bg-brand-50 dark:hover:bg-brand-900/20",
                          )}
                          aria-label={t("statusReactEmoji", { emoji })}
                          aria-pressed={active}
                        >
                          {emoji}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <input
                    className="vs-input min-h-10 w-full flex-1 text-start"
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder={t("statusReplyPlaceholder")}
                    aria-label={t("statusReplyPlaceholder")}
                    dir={rtl ? "rtl" : "ltr"}
                    maxLength={500}
                    disabled={replying}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void sendReply();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => void sendReply()}
                    disabled={!reply.trim() || replying}
                    className="vs-btn-outline-sm min-h-10 w-full disabled:opacity-60 sm:w-auto"
                  >
                    {replying ? t("statusReplySending") : t("statusReplyAction")}
                  </button>
                </div>

                {myReplies.length > 0 ? (
                  <div className="rounded-2xl vs-brand-inset bg-brand-50/30 px-3 py-2 dark:bg-brand-900/15">
                    <p className="text-xs font-semibold text-muted">{t("statusYourRepliesTitle")}</p>
                    <ul className="mt-2 space-y-2">
                      {myReplies.map((row, idx) => (
                        <li key={`${row.userId}-${row.createdAt}-${idx}`}>
                          <p className="whitespace-pre-wrap text-sm text-ink" dir="auto">
                            {row.text}
                          </p>
                        </li>
                      ))}
                    </ul>
                    <p className="mt-2 text-[11px] leading-relaxed text-muted/90">
                      {t("statusReplyOwnerOnlyHint", { name: label })}
                    </p>
                  </div>
                ) : null}
              </div>
            ) : null}

            {isOwnStatus ? (
              <div className="mt-4 border-t vs-brand-divider pt-4 dark:border-brand-800/30">
                <p className="mb-2 text-xs font-semibold text-muted">{t("statusRepliesTitle")}</p>
                {replies.length > 0 ? (
                  <ul className="space-y-2">
                    {replies.map((row, idx) => {
                      const authorId = String(row.userId || "").trim();
                      const authorLabel = row.authorName || t("statusReplyAnonymous");
                      return (
                        <li
                          key={`${row.userId}-${row.createdAt}-${idx}`}
                          className="rounded-2xl vs-brand-inset bg-brand-50/30 px-3 py-2 dark:bg-brand-900/15"
                        >
                          {authorId ? (
                            <Link
                              href={`/user/${authorId}`}
                              className="text-xs font-semibold text-ink hover:text-brand-700 dark:hover:text-brand-200"
                            >
                              {authorLabel}
                            </Link>
                          ) : (
                            <p className="text-xs font-semibold text-ink">{authorLabel}</p>
                          )}
                          <p className="mt-1 whitespace-pre-wrap text-sm text-ink" dir="auto">
                            {row.text}
                          </p>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-xs text-muted">{t("statusRepliesEmpty")}</p>
                )}
              </div>
            ) : null}

            {isOwnStatus ? (
              <div className="mt-4 flex flex-wrap gap-2 border-t vs-brand-divider pt-4 dark:border-brand-800/30">
                <button
                  type="button"
                  onClick={() => void loadViewers()}
                  className="vs-btn-outline-sm min-h-10 px-4"
                >
                  {t("statusViewersAction")}
                </button>
                {onDelete ? (
                  <button
                    type="button"
                    onClick={() => onDelete(activeItem._id)}
                    className="inline-flex min-h-10 items-center gap-2 rounded-full border border-red-200/80 px-4 text-xs font-semibold text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:text-red-300 dark:hover:bg-red-950/40"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                    {t("statusDelete")}
                  </button>
                ) : null}
              </div>
            ) : null}

            {viewers && isOwnStatus ? (
              <ul className="mt-3 space-y-1 rounded-2xl border border-dashed vs-brand-divider bg-brand-50/30 p-3 dark:border-brand-800/30 dark:bg-brand-900/10">
                {viewers.length === 0 ? (
                  <li className="text-xs text-muted">{t("statusViewersEmpty")}</li>
                ) : (
                  viewers.map((viewer, idx) => {
                    const uid = viewerUserId(viewer);
                    const name = viewerDisplayName(viewer);
                    return (
                      <li key={`${uid || name}-${idx}`} className="truncate text-xs">
                        {uid ? (
                          <Link
                            href={`/user/${uid}`}
                            className="font-medium text-ink hover:text-brand-700 dark:hover:text-brand-200"
                          >
                            {name || "—"}
                          </Link>
                        ) : (
                          <span className="text-ink">{name || "—"}</span>
                        )}
                      </li>
                    );
                  })
                )}
              </ul>
            ) : null}

            {msg ? <p className="mt-2 text-xs text-muted">{msg}</p> : null}
          </div>
        </div>
      </li>

      {imageOpen && imageSrc ? (
        <div
          className="fixed inset-0 z-[400] flex items-center justify-center bg-black/85 p-4"
          role="dialog"
          aria-modal="true"
          onClick={() => setImageOpen(false)}
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label={t("close")}
            onClick={() => setImageOpen(false)}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imageSrc}
            alt=""
            className="relative z-[1] max-h-[90vh] max-w-full rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      ) : null}
    </>
  );
}
