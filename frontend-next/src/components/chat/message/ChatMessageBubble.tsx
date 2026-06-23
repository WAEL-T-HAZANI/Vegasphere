"use client";

import { memo, useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { cn } from "@/lib/classNames";
import {
  isVideoLike,
  resolveAssetUrl,
  safeParseJson,
  normalizeReactionGroups,
  countPollVotes,
} from "@/lib/messageFormat";
import MessageBubbleActionsMenu from "@/components/chat/message/MessageBubbleActionsMenu";
import MessageBubbleBody from "@/components/chat/message/MessageBubbleBody";
import { renderHighlightedText } from "@/components/chat/message/MessageText";

function ChatMessageBubble({
  message: m,
  replyParent,
  displayText,
  replyDisplayText,
  isMine,
  currentUserId,
  onReply,
  onForward,
  onOpenMedia,
  onEdit,
  onDelete,
  onCancelSchedule,
  onReact,
  onPin,
  onStar,
  selectionMode = false,
  selected = false,
  onToggleSelect,
  listVariant = "default",
  peerUserId = null,
  isGroupChat = false,
  groupRecipientCount = 0,
  readReceiptsEnabled = true,
  onRetry,
  searchQuery = "",
  isSearchFocused = false,
  groupPosition = "single",
  senderLabel = "",
  onJumpToReply,
  onVote,
  onViewThread,
}) {
  const { t, i18n } = useTranslation();
  const rtl = i18n.dir() === "rtl";
  const [translation, setTranslation] = useState("");
  const [translateErr, setTranslateErr] = useState("");
  const [translating, setTranslating] = useState(false);
  const [mediaFailed, setMediaFailed] = useState(false);
  const [mediaLoading, setMediaLoading] = useState(false);
  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);
  const [audioRate, setAudioRate] = useState(1);
  const [nowTick, setNowTick] = useState(() => Date.now());

  useEffect(() => {
    setTranslation("");
    setTranslateErr("");
    setMediaFailed(false);
    setMediaLoading(false);
    setEmojiPickerOpen(false);
    setAudioRate(1);
  }, [m._id]);

  const disappearAfter = Number(m.disappearAfterSec) || 0;
  const computedExpiresAtMs = useMemo(() => {
    if (disappearAfter <= 0) return null;
    const exp = m.expiresAt ? new Date(m.expiresAt).getTime() : NaN;
    if (Number.isFinite(exp)) return exp;
    const created = m.createdAt ? new Date(m.createdAt).getTime() : NaN;
    if (Number.isFinite(created)) return created + disappearAfter * 1000;
    return null;
  }, [disappearAfter, m.expiresAt, m.createdAt]);

  useEffect(() => {
    if (!computedExpiresAtMs) return;
    if (m.deletedForEveryone) return;
    // Keep countdown reasonably fresh without heavy re-rendering.
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, [computedExpiresAtMs, m.deletedForEveryone]);

  const remainingSec = useMemo(() => {
    if (!computedExpiresAtMs) return null;
    const diff = Math.ceil((computedExpiresAtMs - nowTick) / 1000);
    return Number.isFinite(diff) ? diff : null;
  }, [computedExpiresAtMs, nowTick]);

  const locallyExpired =
    disappearAfter > 0 &&
    !m.deletedForEveryone &&
    remainingSec != null &&
    remainingSec <= 0;

  const mentionedMe =
    Array.isArray(m.mentionedUserIds) &&
    currentUserId &&
    m.mentionedUserIds.some((id) => String(id) === String(currentUserId));

  const mediaUrl = resolveAssetUrl(m.imageUrl || "");
  const fileUrl = resolveAssetUrl(m.fileData || "");
  const fileType = String(m.fileType || "");
  const isImageFileMessage =
    m.messageType === "file" && fileType.startsWith("image/") && Boolean(fileUrl);
  const isVideoFileMessage =
    m.messageType === "file" &&
    Boolean(fileUrl || mediaUrl) &&
    isVideoLike({ url: fileUrl || mediaUrl, fileType, fileName: m.fileName });
  const effectiveImageUrl =
    m.messageType === "image" || isImageFileMessage
      ? String(mediaUrl || fileUrl || "")
      : String(mediaUrl || "");
  const effectiveVideoUrl =
    m.messageType === "video" || isVideoFileMessage
      ? String(mediaUrl || fileUrl || "")
      : isVideoLike({ url: mediaUrl, fileType, fileName: m.fileName })
        ? String(mediaUrl || fileUrl || "")
        : "";
  const showVideo =
    Boolean(effectiveVideoUrl) &&
    (m.messageType === "video" ||
      isVideoFileMessage ||
      isVideoLike({ url: effectiveVideoUrl, fileType, fileName: m.fileName }));
  const showImage = !mediaFailed && effectiveImageUrl && !showVideo;
  const showImageFallbackCard =
    mediaFailed && (m.messageType === "image" || isImageFileMessage) && Boolean(fileUrl || mediaUrl);
  const isStarred =
    Array.isArray(m.starredBy) &&
    m.starredBy.some((id) => String(id) === String(currentUserId));
  const showFile =
    m.messageType === "file" &&
    !isImageFileMessage &&
    !isVideoFileMessage &&
    (m.fileData || m.fileName || m.text);
  const hasAudio = m.messageType === "audio";
  const audioUrl = resolveAssetUrl(m.audioData || "");
  const hasAudioData = Boolean(audioUrl);
  const rawText = displayText !== undefined ? displayText : m.text;
  const hasText = String(rawText || "").trim().length > 0;
  const hideAutoTextForMedia =
    (m.messageType === "image" ||
      m.messageType === "video" ||
      isImageFileMessage ||
      isVideoFileMessage) &&
    (!String(m.text || "").trim() ||
      String(m.text || "").trim() === String(m.fileName || "").trim() ||
      /^https?:\/\//i.test(String(m.text || "").trim()));
  const hasLocation =
    m.messageType === "location" &&
    Number.isFinite(Number(m.location?.lat)) &&
    Number.isFinite(Number(m.location?.lng));
  const contactPayload =
    m.messageType === "contact" ? safeParseJson(m.fileData) : null;
  const hasContact =
    m.messageType === "contact" && Boolean(contactPayload?.contactUserId);
  const hasAnyContent =
    hasText ||
    showImage ||
    showVideo ||
    showFile ||
    hasAudio ||
    hasAudioData ||
    hasLocation ||
    hasContact ||
    showImageFallbackCard;
  const isSending = m.clientStatus === "sending";
  const isFailed = m.clientStatus === "failed";
  const canOpenMenu = !isSending && !isFailed && !locallyExpired && !selectionMode;
  const isPoll = m.messageType === "poll" && m.poll?.question && m.poll?.options?.length;
  const isMediaOnly =
    (showImage || showVideo) &&
    !hasText &&
    !hasAudio &&
    !hasAudioData &&
    !showFile &&
    !hasLocation &&
    !hasContact &&
    !isPoll &&
    !showImageFallbackCard;
  const highlightedText = useMemo(
    () =>
      searchQuery && hasText
        ? renderHighlightedText(rawText, searchQuery)
        : null,
    [searchQuery, hasText, rawText]
  );
  const reactionGroups = useMemo(() => normalizeReactionGroups(m), [m]);
  const totalPollVotes = useMemo(() => countPollVotes(m.poll), [m.poll]);
  const selectedPollOptionIds = useMemo(() => {
    const uid = String(currentUserId || "");
    if (!uid || !m.poll?.options?.length) return new Set();
    return new Set(
      m.poll.options
        .filter((option) =>
          Array.isArray(option?.voterIds) &&
          option.voterIds.some((id) => String(id?._id || id) === uid)
        )
        .map((option) => String(option.id))
    );
  }, [currentUserId, m.poll]);
  const showSenderLabel =
    !isMine &&
    isGroupChat &&
    senderLabel &&
    (groupPosition === "single" || groupPosition === "start");
  const timeLabel = useMemo(() => {
    if (!m.createdAt) return "";
    const d = new Date(m.createdAt);
    if (Number.isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat(i18n.language || "en", {
      hour: "numeric",
      minute: "2-digit",
    }).format(d);
  }, [m.createdAt, i18n.language]);

  const scheduledLabel = useMemo(() => {
    if (!m?.scheduledFor) return "";
    const d = new Date(m.scheduledFor);
    if (Number.isNaN(d.getTime())) return "";
    return new Intl.DateTimeFormat(i18n.language || "en", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  }, [m?.scheduledFor, i18n.language]);

  useEffect(() => {
    if (showImage) setMediaLoading(true);
  }, [showImage, m._id]);

  // Defensive: avoid rendering "empty bubbles" when a message has no usable payload.
  if (!hasAnyContent && !m.deletedForEveryone && !locallyExpired) return null;

  return (
    <li
      className={cn(
        "flex items-end gap-2",
        isMine ? "justify-end" : "justify-start"
      )}
    >
      {selectionMode && (
        <button
          type="button"
          role="checkbox"
          aria-checked={selected}
          onClick={() => onToggleSelect?.(m)}
          className={cn(
            "mb-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition",
            selected
              ? "border-brand-600 bg-brand-600 text-white vs-dark-brand-select"
              : "border-brand-300/70 bg-surface/90 dark:border-white/25 dark:bg-white/5",
          )}
          aria-label={t("chatSelectMessages")}
        >
          {selected ? <Check className="h-3 w-3" strokeWidth={3} aria-hidden /> : null}
        </button>
      )}
      <div
        className={cn(
          // Modern bubble sizing + depth
          "group relative max-w-[88%] rounded-3xl px-3.5 py-2.5 pe-10 text-sm shadow-md ring-1 ring-black/[0.06] dark:ring-white/[0.08] md:max-w-[72%]",
          selectionMode && "cursor-pointer",
          isMediaOnly &&
            "bg-transparent px-0 py-0 pe-0 shadow-none ring-0 dark:ring-0",
          groupPosition === "start" &&
            (isMine ? "rounded-br-xl" : "rounded-bl-xl"),
          groupPosition === "middle" &&
            (isMine
              ? "rounded-tr-xl rounded-br-xl"
              : "rounded-tl-xl rounded-bl-xl"),
          groupPosition === "end" &&
            (isMine ? "rounded-tr-xl" : "rounded-tl-xl"),
          selected && "ring-2 ring-brand-500",
          m.isPinned && "ring-1 ring-brand-400/80",
          mentionedMe && "ring-2 ring-brand-500/80",
          isSearchFocused &&
            "ring-2 ring-brand-500 shadow-brand-500/20 vs-dark-brand-ring",
          !isMediaOnly &&
            (isMine
              ? "bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-brand-600/25 dark:from-brand-700 dark:via-brand-800 dark:to-red-900/95 dark:shadow-red-950/30"
              : isGroupChat
                ? "vs-msg-bubble--group-peer"
                : "vs-msg-bubble--peer")
        )}
        onClick={(e) => {
          if (!selectionMode) return;
          if (!(e.target instanceof Element)) return;
          if (
            e.target.closest(
              "button,a,input,textarea,select,video,audio,label",
            )
          ) {
            return;
          }
          onToggleSelect?.(m);
        }}
      >
        {showSenderLabel ? (
          <div className="mb-1 text-[11px] font-semibold text-brand-800 vs-dark-brand-text-muted">
            {senderLabel}
          </div>
        ) : null}
        {m.isPinned && (
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-brand-200 dark:text-brand-100">
            {t("pinnedInChat")}
          </div>
        )}
        <MessageBubbleActionsMenu
          m={m}
          t={t}
          i18n={i18n}
          rtl={rtl}
          isMine={isMine}
          listVariant={listVariant}
          canOpenMenu={canOpenMenu}
          isStarred={isStarred}
          hasText={hasText}
          rawText={rawText}
          fileUrl={fileUrl}
          mediaUrl={mediaUrl}
          isPoll={isPoll}
          translating={translating}
          setTranslating={setTranslating}
          setTranslateErr={setTranslateErr}
          setTranslation={setTranslation}
          setEmojiPickerOpen={setEmojiPickerOpen}
          onReply={onReply}
          onForward={onForward}
          onReact={onReact}
          onPin={onPin}
          onStar={onStar}
          onEdit={onEdit}
          onDelete={onDelete}
          onCancelSchedule={onCancelSchedule}
          onViewThread={onViewThread}
        />

        <MessageBubbleBody
          m={m}
          t={t}
          isMine={isMine}
          replyParent={replyParent}
          replyDisplayText={replyDisplayText}
          onJumpToReply={onJumpToReply}
          isPoll={isPoll}
          totalPollVotes={totalPollVotes}
          selectedPollOptionIds={selectedPollOptionIds}
          onVote={onVote}
          disappearAfter={disappearAfter}
          locallyExpired={locallyExpired}
          remainingSec={remainingSec}
          showVideo={showVideo}
          showImage={showImage}
          showImageFallbackCard={showImageFallbackCard}
          showFile={showFile}
          effectiveVideoUrl={effectiveVideoUrl}
          effectiveImageUrl={effectiveImageUrl}
          fileUrl={fileUrl}
          mediaUrl={mediaUrl}
          fileType={fileType}
          mediaLoading={mediaLoading}
          mediaFailed={mediaFailed}
          setMediaLoading={setMediaLoading}
          setMediaFailed={setMediaFailed}
          onOpenMedia={onOpenMedia}
          hasAudio={hasAudio}
          hasAudioData={hasAudioData}
          audioUrl={audioUrl}
          audioRate={audioRate}
          setAudioRate={setAudioRate}
          hasLocation={hasLocation}
          hasContact={hasContact}
          contactPayload={contactPayload}
          hasText={hasText}
          hideAutoTextForMedia={hideAutoTextForMedia}
          highlightedText={highlightedText}
          displayText={displayText}
          isGroupChat={isGroupChat}
          timeLabel={timeLabel}
          scheduledLabel={scheduledLabel}
          isSending={isSending}
          isFailed={isFailed}
          onRetry={onRetry}
          currentUserId={currentUserId}
          peerUserId={peerUserId}
          groupRecipientCount={groupRecipientCount}
          readReceiptsEnabled={readReceiptsEnabled}
          translateErr={translateErr}
          translation={translation}
          emojiPickerOpen={emojiPickerOpen}
          setEmojiPickerOpen={setEmojiPickerOpen}
          onReact={onReact}
          reactionGroups={reactionGroups}
          isStarred={isStarred}
        />
      </div>
    </li>
  );
}

export default memo(ChatMessageBubble);
