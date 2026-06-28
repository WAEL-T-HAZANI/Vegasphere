"use client";

import {
  Mic,
  Gauge,
  Clock3,
  MapPin,
  ExternalLink,
  UserRound,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/classNames";
import {
  mapHrefFromLocation,
  EMOJI_PICKER,
  triggerBrowserDownload,
} from "@/lib/messageFormat";
import { api } from "@/lib/api";
import ReadReceipt from "@/components/chat/message/ReadReceipt";
import ReplyPreview from "@/components/chat/message/ReplyPreview";
import MessagePoll from "@/components/chat/message/MessagePoll";
import MessageMedia from "@/components/chat/message/MessageMedia";
import MessageReactions from "@/components/chat/message/MessageReactions";
import { formatTextWithAtHighlights } from "@/components/chat/message/MessageText";

function MessageBubbleBody({
  m,
  t,
  isMine,
  replyParent,
  replyDisplayText,
  onJumpToReply,
  isPoll,
  totalPollVotes,
  selectedPollOptionIds,
  onVote,
  disappearAfter,
  locallyExpired,
  remainingSec,
  showVideo,
  showImage,
  showImageFallbackCard,
  showFile,
  effectiveVideoUrl,
  effectiveImageUrl,
  fileUrl,
  mediaUrl,
  fileType,
  mediaLoading,
  mediaFailed,
  setMediaLoading,
  setMediaFailed,
  onOpenMedia,
  hasAudio,
  hasAudioData,
  audioUrl = "",
  audioRate,
  setAudioRate,
  hasLocation,
  hasContact,
  contactPayload,
  hasText,
  hideAutoTextForMedia,
  highlightedText,
  displayText,
  isGroupChat,
  timeLabel,
  scheduledLabel,
  isSending,
  isFailed,
  onRetry,
  currentUserId,
  peerUserId,
  groupRecipientCount,
  readReceiptsEnabled = true,
  translateErr,
  translation,
  emojiPickerOpen,
  setEmojiPickerOpen,
  onReact,
  reactionGroups,
  isStarred,
}) {
  const badgeTone = isMine ? "vs-msg-badge--mine" : "vs-msg-badge--peer";
  const cardTone = isMine
    ? "vs-msg-special-card--mine"
    : "vs-msg-special-card--peer";
  const iconTone = isMine ? "vs-msg-icon-tile--mine" : "vs-msg-icon-tile--peer";
  const labelTone = isMine
    ? "vs-msg-special-label--mine"
    : "vs-msg-special-label--peer";
  const voiceTone = isMine ? "vs-msg-voice--mine" : "vs-msg-voice--peer";
  const waveTone = isMine
    ? "vs-msg-voice-wave--mine"
    : "vs-msg-voice-wave--peer";
  const avatarTone = isMine
    ? "vs-msg-contact-avatar--mine"
    : "vs-msg-contact-avatar--peer";
  const showMetaBadges =
    m.viewOnce ||
    (disappearAfter > 0 && !m.deletedForEveryone && !locallyExpired) ||
    (isMine && m.scheduledStatus === "pending");

  return (
    <>
      {m.replyTo && replyParent ? (
        <ReplyPreview
          replyParent={replyParent}
          replyDisplayText={replyDisplayText}
          isMine={isMine}
          onJumpToReply={onJumpToReply}
          t={t}
        />
      ) : null}

      {m.forwardedFrom?.previewText && (
        <div
          className={cn(
            "mb-1 border-l-2 pl-2 text-xs opacity-90",
            isMine ? "border-white/50" : "border-brand-600/40"
          )}
        >
          {t("forwardMessage")}: {m.forwardedFrom.originalSenderName} —{" "}
          {m.forwardedFrom.previewText}
        </div>
      )}

      {isPoll ? (
        <MessagePoll
          poll={m.poll}
          isMine={isMine}
          totalPollVotes={totalPollVotes}
          selectedPollOptionIds={selectedPollOptionIds}
          onVote={onVote}
          message={m}
          t={t}
        />
      ) : null}

      {showMetaBadges ? (
        <div className="mb-2 flex flex-wrap items-center gap-1.5">
          {isMine && m.scheduledStatus === "pending" ? (
            <span className={cn("vs-msg-badge", badgeTone)} title={scheduledLabel || undefined}>
              <Clock3 className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate normal-case tracking-normal">
                {t("messageScheduled")}
                {scheduledLabel ? ` · ${scheduledLabel}` : ""}
              </span>
            </span>
          ) : null}
          {m.viewOnce ? (
            <span className={cn("vs-msg-badge", badgeTone)}>
              <Eye className="h-3 w-3 shrink-0" aria-hidden />
              {t("viewOnceLabel")}
            </span>
          ) : null}
          {disappearAfter > 0 && !m.deletedForEveryone && !locallyExpired ? (
            <span
              className={cn("vs-msg-badge", badgeTone, "normal-case tracking-normal")}
              title={t("disappearAfterLabel", { seconds: disappearAfter })}
            >
              <Clock3 className="h-3 w-3 shrink-0" aria-hidden />
              <span className="truncate">
                {remainingSec != null && remainingSec > 0
                  ? t("disappearInLabel", { seconds: remainingSec })
                  : t("disappearAfterLabel", { seconds: disappearAfter })}
              </span>
            </span>
          ) : null}
        </div>
      ) : null}

      <MessageMedia
        message={m}
        isMine={isMine}
        isGroupChat={isGroupChat}
        t={t}
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
        onMediaLoad={() => setMediaLoading(false)}
        onMediaError={() => {
          setMediaLoading(false);
          setMediaFailed(true);
        }}
        onManualMediaLoad={() => {
          setMediaFailed(false);
          setMediaLoading(true);
        }}
        onOpenMedia={onOpenMedia}
      />

      {hasAudio ? (
        hasAudioData ? (
          <div className={cn("vs-msg-voice", voiceTone)} dir="ltr">
            <div className={cn("vs-msg-special-label", labelTone)}>
              <Mic className="h-3 w-3 shrink-0" aria-hidden />
              {t("voiceMessage")}
            </div>
            <div className="mb-2.5 flex items-end gap-1" aria-hidden>
              {[8, 16, 11, 24, 14, 28, 18, 12, 22, 10, 20, 15, 26, 13].map(
                (h, idx) => (
                  <span
                    key={`${m._id}-${h}-${idx}`}
                    className={cn("w-1.5 rounded-full", waveTone)}
                    style={{ height: `${h}px` }}
                  />
                ),
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn("vs-msg-icon-tile h-8 w-8", iconTone)}
                aria-hidden
              >
                <Mic className="h-4 w-4" />
              </span>
              <audio
                data-voice-id={String(m._id)}
                src={audioUrl}
                controls
                className={cn(
                  "h-9 min-w-0 flex-1 overflow-hidden rounded-full",
                  isMine ? "accent-white" : "accent-brand-600 dark:accent-brand-400",
                )}
                preload="metadata"
                onLoadedMetadata={(e) => {
                  e.currentTarget.playbackRate = audioRate;
                }}
              />
              <button
                type="button"
                onClick={() => {
                  const next =
                    audioRate >= 2
                      ? 1
                      : audioRate === 1
                        ? 1.25
                        : audioRate === 1.25
                          ? 1.5
                          : 2;
                  setAudioRate(next);
                  const audio = document.querySelector(
                    `[data-voice-id="${String(m._id)}"]`,
                  ) as HTMLAudioElement | null;
                  if (audio) {
                    audio.playbackRate = next;
                  }
                }}
                className={cn(
                  "inline-flex h-8 items-center gap-1 rounded-full border px-2.5 text-[11px] font-semibold transition",
                  isMine
                    ? "border-white/25 bg-white/10 text-white hover:bg-white/15"
                    : "border-brand-300/60 bg-brand-50 text-brand-800 hover:bg-brand-100 vs-dark-brand-chip",
                )}
              >
                <Gauge className="h-3.5 w-3.5" />
                {audioRate}x
              </button>
            </div>
          </div>
        ) : (
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-xs font-semibold",
              isMine ? "text-white/90" : "text-brand-700 vs-dark-brand-text-muted",
            )}
          >
            <Mic className="h-3.5 w-3.5" aria-hidden />
            {t("voiceMessage")}
          </span>
        )
      ) : null}

      {hasLocation ? (
        <a
          href={mapHrefFromLocation(m.location)}
          target="_blank"
          rel="noreferrer"
          className={cn(
            "mb-1 block overflow-hidden rounded-2xl border p-3 text-left transition hover:bg-subtle",
            isMine
              ? "border-white/20 bg-white/10 hover:bg-white/15"
              : "vs-msg-special-card vs-msg-special-card--peer"
          )}
        >
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                isMine
                  ? "bg-white/12 text-white"
                  : "vs-msg-icon-tile h-10 w-10 vs-msg-icon-tile--peer"
              )}
              aria-hidden
            >
              <MapPin className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  "block text-xs font-semibold",
                  isMine ? "text-white" : "text-ink"
                )}
              >
                {m.location?.label ? String(m.location.label) : t("shareLocation")}
              </span>
              <span
                className={cn(
                  "mt-0.5 block truncate text-[11px] opacity-90",
                  isMine ? "text-white/80" : "text-muted"
                )}
              >
                {Number(m.location.lat).toFixed(5)}, {Number(m.location.lng).toFixed(5)}
              </span>
            </span>
            <ExternalLink
              className={cn(
                "h-4 w-4 shrink-0 opacity-70",
                isMine ? "text-white/90" : "text-muted"
              )}
              aria-hidden
            />
          </div>
        </a>
      ) : null}

      {hasContact ? (
        <div className={cn("vs-msg-special-card", cardTone)}>
          <div className={cn("vs-msg-special-label", labelTone)}>
            <UserRound className="h-3 w-3 shrink-0" aria-hidden />
            {t("shareContact")}
          </div>
          <div className="flex items-center gap-3">
            <span className={cn("vs-msg-contact-avatar bg-brand-100 vs-dark-brand-icon-tile", avatarTone)}>
              {contactPayload?.profilePic ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={String(contactPayload.profilePic)}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span
                  className={cn(
                    "flex h-full w-full items-center justify-center text-sm font-semibold",
                    isMine
                      ? "text-brand-800 dark:text-brand-100"
                      : "text-brand-800 dark:text-brand-100",
                  )}
                >
                  {String(
                    contactPayload?.name ||
                      contactPayload?.username ||
                      contactPayload?.email ||
                      "?",
                  )
                    .trim()
                    .slice(0, 1)
                    .toUpperCase()}
                </span>
              )}
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  "block truncate text-sm font-semibold",
                  isMine ? "text-white" : "text-ink dark:text-white",
                )}
              >
                {String(
                  contactPayload?.name ||
                    contactPayload?.username ||
                    contactPayload?.email ||
                    t("shareContact"),
                )}
              </span>
              <span
                className={cn(
                  "mt-0.5 block truncate text-[11px] font-medium",
                  isMine ? "text-white/80" : "text-ink/70 dark:text-white/70",
                )}
              >
                {contactPayload?.username
                  ? `@${String(contactPayload.username)}`
                  : String(contactPayload?.email || "").trim()}
              </span>
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <a
              href={`/user/${encodeURIComponent(String(contactPayload.contactUserId))}`}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold",
                isMine
                  ? "bg-white/15 text-white hover:bg-white/20"
                  : "bg-brand-100 text-brand-800 hover:bg-brand-200 dark:bg-brand-900/40 dark:text-brand-100",
              )}
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              {t("navProfile")}
            </a>
            <button
              type="button"
              onClick={async () => {
                const uid = String(contactPayload.contactUserId || "");
                if (!uid) return;
                try {
                  const { data } = await api.get(`/user/${uid}/contact.vcf`, {
                    responseType: "blob",
                  });
                  const blob =
                    data instanceof Blob
                      ? data
                      : new Blob([String(data)], { type: "text/vcard" });
                  const url = URL.createObjectURL(blob);
                  const fname = String(
                    contactPayload?.name || contactPayload?.username || "contact",
                  )
                    .replace(/[^\w\s-]/g, "")
                    .trim();
                  triggerBrowserDownload(url, `${fname || "contact"}.vcf`);
                  URL.revokeObjectURL(url);
                } catch {
                  /* ignore */
                }
              }}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold",
                isMine
                  ? "bg-white/15 text-white hover:bg-white/20"
                  : "bg-brand-100 text-brand-800 hover:bg-brand-200 dark:bg-brand-900/40 dark:text-brand-100",
              )}
            >
              {t("downloadContact") || "Save contact"}
            </button>
          </div>
        </div>
      ) : null}

      {m.deletedForEveryone || locallyExpired ? (
        <span
          className={cn(
            "block whitespace-pre-wrap rounded-2xl border px-2.5 py-2 text-xs italic shadow-sm ring-1",
            isMine
              ? "border-white/20 bg-white/10 text-white/85 ring-white/10"
              : "border-brand-200/50 bg-brand-50/70 text-brand-800 ring-brand-400/10 dark:border-brand-700/40 dark:bg-gradient-to-br dark:from-brand-900/40 dark:to-red-950/25 dark:text-brand-100 dark:ring-red-900/20",
          )}
        >
          {Number(m.disappearAfterSec) > 0
            ? t("messageDisappeared") || "This message disappeared."
            : t("messageDeletedForEveryone")}
        </span>
      ) : hasText &&
        !hideAutoTextForMedia &&
        !hasLocation &&
        !hasContact &&
        m.messageType !== "file" &&
        m.messageType !== "poll" ? (
        <span
          className={cn(
            "whitespace-pre-wrap leading-relaxed",
            !isMine && isGroupChat && "text-ink dark:text-[rgb(248,248,250)]",
          )}
        >
          {highlightedText ||
            (displayText !== undefined
              ? displayText
              : isGroupChat
                ? formatTextWithAtHighlights(m.text, isMine)
                : m.text)}
        </span>
      ) : null}

      {/* Footer line keeps read ticks away from the menu dots */}
      <div className={cn("mt-1 flex items-center gap-2 text-[10px]", isMine ? "justify-end opacity-80" : "justify-start", !isMine && isGroupChat && "opacity-100")}>
        {timeLabel ? (
          <span
            className={cn(
              isMine
                ? "text-white/80"
                : isGroupChat
                  ? "text-muted dark:text-white/75"
                  : "text-ink/55 opacity-80 dark:text-white/55",
            )}
          >
            {timeLabel}
          </span>
        ) : null}
        {isMine && isSending ? (
          <span className={cn(isMine ? "text-white/80" : "text-muted")}>
            {t("messageSending")}
          </span>
        ) : null}
        {isMine && isFailed ? (
          <>
            <span className="font-medium text-brand-200 dark:text-brand-300">
              {t("messageFailed")}
            </span>
            <button
              type="button"
              onClick={() => onRetry?.(m)}
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-semibold transition",
                isMine
                  ? "border-white/30 text-white hover:bg-white/10"
                  : "border-brand-500/30 text-brand-700 hover:bg-brand-500/10 vs-dark-brand-text-muted dark:hover:bg-gradient-to-r dark:hover:from-brand-900/30 dark:hover:to-red-950/20"
              )}
            >
              {t("messageRetry")}
            </button>
          </>
        ) : null}
        {m.isEdited && !m.deletedForEveryone ? (
          <span
            className={cn(
              isMine
                ? "text-white/80"
                : isGroupChat
                  ? "text-muted dark:text-white/75"
                  : "text-ink/55 opacity-80 dark:text-white/55",
            )}
          >
            {t("editedLabel")}
          </span>
        ) : null}
        {!isSending && !isFailed ? (
          <ReadReceipt
            m={m}
            isMine={isMine}
            meId={currentUserId}
            peerUserId={peerUserId}
            isGroupChat={isGroupChat}
            groupRecipientCount={groupRecipientCount}
            readReceiptsEnabled={readReceiptsEnabled}
            t={t}
          />
        ) : null}
      </div>

      {translateErr ? (
        <p
          className={cn(
            "mt-1 text-[10px]",
            isMine
              ? "text-red-200 dark:text-red-300"
              : "text-red-600 dark:text-red-400"
          )}
        >
          {translateErr}
        </p>
      ) : null}
      {translation ? (
        <div
          className={cn(
            "mt-2 border-t border-white/25 pt-2 text-xs leading-snug opacity-95 dark:border-white/20",
            !isMine && "border-brand-600/30 dark:border-red-900/30"
          )}
        >
          <span className="font-semibold opacity-90">{t("translationLabel")}</span>{" "}
          {translation}
        </div>
      ) : null}
      {emojiPickerOpen ? (
        <div
          className={cn(
            "mt-2 rounded-2xl border p-2",
            isMine
              ? "border-white/20 bg-white/10"
              : "border-gray-200 bg-canvas dark:border-gray-700 dark:bg-white/[0.03]"
          )}
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className={cn("text-[11px] font-semibold uppercase tracking-wide opacity-90", isMine ? "text-white/80" : "text-muted")}>
              {t("reactMessage")}
            </span>
            <button
              type="button"
              className={cn(
                "rounded-full border px-2 py-0.5 text-[11px] font-semibold transition",
                isMine
                  ? "border-white/20 text-white/85 hover:bg-white/10"
                  : "border-gray-200 text-muted hover:bg-subtle dark:border-gray-700"
              )}
              onClick={() => setEmojiPickerOpen(false)}
            >
              {t("close") || "Close"}
            </button>
          </div>
          <div className="max-h-52 overflow-auto pr-1">
            <div className="grid grid-cols-8 gap-1 sm:grid-cols-10">
              {EMOJI_PICKER.map((e) => (
                <button
                  key={e}
                  type="button"
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl text-lg transition hover:bg-subtle",
                    isMine ? "hover:bg-white/10" : ""
                  )}
                  onClick={() => {
                    onReact?.(m, e);
                    setEmojiPickerOpen(false);
                  }}
                  aria-label={e}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
      <MessageReactions
        reactionGroups={reactionGroups}
        isMine={isMine}
        currentUserId={currentUserId}
        onReact={onReact}
        message={m}
        t={t}
      />

      {isStarred && (
        <span className="mt-0.5 block text-[10px] opacity-80">★</span>
      )}
    </>
  );
}

export default MessageBubbleBody;
