"use client";

import dynamic from "next/dynamic";
import { useRef, useState } from "react";
import {
  Clock3,
  BarChart3,
  AtSign,
  MapPin,
  Radio,
  UserRound,
  Smile,
  Paperclip,
} from "lucide-react";
import { cn } from "@/lib/classNames";
import { readLocalPref } from "@/lib/localPrefs";
import PollComposer from "@/components/chat/conversation/PollComposer";
import VoiceRecorderButton from "@/components/chat/conversation/VoiceRecorderButton";
import VoicePreviewModal from "@/components/chat/conversation/VoicePreviewModal";
import SmartReplyBar from "@/components/ai/SmartReplyBar";
import ComposerFloatingPanel from "@/components/chat/conversation/ComposerFloatingPanel";
import HorizontalScrollRail from "@/components/ui/HorizontalScrollRail";
import { minDatetimeLocalValue } from "@/lib/localDateTimeInput";
import { voiceFileExtension, normalizeAudioMime } from "@/lib/messageFormat";

const ComposerEmojiPicker = dynamic(
  () => import("@/components/chat/conversation/ComposerEmojiPicker"),
  { ssr: false },
);

const COMPOSER_ACTIVE_CLASS =
  "border-brand-300 bg-brand-50 text-brand-700 hover:bg-brand-100 vs-dark-brand-chip";

export default function ConversationComposer(props) {
  const {
    t,
    rtl,
    sendBlocked,
    cannotPostHint,
    dmE2eActive,
    e2eConvKey,
    canEnableE2e,
    onEnableE2e,
    onDisableE2e,
    voiceMsg,
    forwardStatus,
    user,
    cid,
    peerUserId,
    peerDisplayName,
    groupPeerIds,
    groupParticipantLabels,
    mentionsOnly,
    setMentionsOnly,
    pollOpen,
    pollQuestion,
    setPollQuestion,
    pollOptions,
    setPollOptions,
    pollAllowsMultiple,
    setPollAllowsMultiple,
    pollClosesAt,
    setPollClosesAt,
    resetPollComposer,
    sendPoll,
    uploading,
    failedUpload,
    uploadAttachmentDraft,
    clearFailedUpload,
    fileRef,
    onFileChange,
    attachAccept,
    emojiComposerOpen,
    setEmojiComposerOpen,
    text,
    setText,
    textInputRef,
    bumpTyping,
    shareLocationOpen,
    setShareLocationOpen,
    shareMyLocation,
    liveLocationActive,
    liveLocationBusy,
    startLiveLocation,
    stopLiveLocation,
    shareContactOpen,
    setShareContactOpen,
    shareContactQuery,
    setShareContactQuery,
    shareContactBusy,
    conversations,
    sharePersonAsContact,
    voiceDraft,
    setVoiceDraft,
    voiceOpen,
    setVoiceOpen,
    setVoiceMsg,
    activeConv,
    setPollOpen,
    scheduleOpen,
    setScheduleOpen,
    scheduledFor,
    setScheduledFor,
    mentionSuggestions,
    mentionIndex,
    setMentionIndex,
    insertMention,
    send,
    activeTopicId,
    conversationId,
    smartReplyMessages,
    smartReplyTriggerKey,
    smartReplySubject,
    smartReplyConversationKind,
  } = props;

  const emojiBtnRef = useRef(null);
  const locationBtnRef = useRef(null);
  const contactBtnRef = useRef(null);
  const scheduleBtnRef = useRef(null);
  const toolsScrollRef = useRef(null);
  const [voiceRecording, setVoiceRecording] = useState(false);
  const [voiceElapsed, setVoiceElapsed] = useState(0);
  const [voiceMicHeard, setVoiceMicHeard] = useState(false);
  const isDirectConversation = Boolean(
    peerUserId &&
      activeConv &&
      !activeConv.isGroup &&
      !activeConv.isChannel,
  );
  const showE2eSetupHint = Boolean(
    isDirectConversation &&
      !dmE2eActive &&
      !canEnableE2e,
  );

  const closeComposerPanels = () => {
    setEmojiComposerOpen(false);
    setShareLocationOpen(false);
    setShareContactOpen(false);
    setScheduleOpen(false);
  };

  const closeVoicePreview = () => {
    setVoiceDraft((prev) => {
      if (prev?.previewUrl) {
        try {
          URL.revokeObjectURL(prev.previewUrl);
        } catch {
          /* ignore */
        }
      }
      return null;
    });
    setVoiceOpen(false);
  };

  return (
    <>
      <div className="sticky bottom-0 z-10 border-t border-brand-200/45 bg-surface/92 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_24px_-8px_rgba(168,42,96,0.18)] backdrop-blur-xl dark:border-white/10 dark:bg-black/85 dark:shadow-black/30 md:p-4">
        {canEnableE2e ? (
          <div className="vs-composer-panel mb-2 flex flex-col items-center gap-2 border-brand-300/50 sm:flex-row sm:justify-between">
            <p className="text-center text-xs font-semibold text-ink sm:text-start">
              {t("e2eEnableHint")}
            </p>
            <button
              type="button"
              onClick={() => void onEnableE2e?.()}
              className="vs-btn-primary-sm min-h-9 shrink-0 px-4"
            >
              {t("e2eEnableButton")}
            </button>
          </div>
        ) : dmE2eActive && onDisableE2e ? (
          <div className="vs-composer-panel mb-2 flex flex-col items-center gap-2 border-brand-300/50 sm:flex-row sm:justify-between">
            <p className="text-center text-xs font-semibold text-ink sm:text-start">
              {t("privacyE2eEnabled") || "End-to-end encryption is on"}
            </p>
            <button
              type="button"
              onClick={() => void onDisableE2e?.()}
              className="vs-btn-outline-sm min-h-9 shrink-0 px-4"
            >
              {t("e2eDisableButton") || "Turn off encryption"}
            </button>
          </div>
        ) : showE2eSetupHint ? (
          <div className="vs-composer-panel mb-2 flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
            <p className="text-center text-xs text-muted sm:text-start">
              {t("e2eSetupHint")}
            </p>
            <a
              href="/privacy"
              className="vs-btn-outline-sm min-h-9 shrink-0 px-4"
            >
              {t("e2eSetupButton")}
            </a>
          </div>
        ) : null}
        {sendBlocked ? (
          <p className="mb-2 text-center text-xs text-brand-800 dark:text-[rgb(var(--vega-ink))]/90">
            {dmE2eActive && !e2eConvKey
              ? t("e2eCannotSend")
              : cannotPostHint || t("chatCannotPostHint")}
          </p>
        ) : null}
        {voiceMsg ? (
          <p className="mb-2 text-center text-xs text-red-600 dark:text-red-300">
            {voiceMsg}
          </p>
        ) : null}
        {forwardStatus && (
          <p className="mb-2 text-center text-xs text-muted">{forwardStatus}</p>
        )}
        {mentionsOnly ? (
          <div className="vs-composer-panel mb-2 flex items-center justify-between gap-2">
            <span className="text-muted">{t("mentionsOnlyActive")}</span>
            <button
              type="button"
              onClick={() => setMentionsOnly(false)}
              className="rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-700 outline-none transition hover:bg-brand-200 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas vs-dark-brand-chip dark:focus-visible:ring-offset-gray-950"
            >
              {t("cancel")}
            </button>
          </div>
        ) : null}
        {pollOpen ? (
          <PollComposer
            question={pollQuestion}
            setQuestion={setPollQuestion}
            options={pollOptions}
            setOptions={setPollOptions}
            allowsMultiple={pollAllowsMultiple}
            setAllowsMultiple={setPollAllowsMultiple}
            closesAt={pollClosesAt}
            setClosesAt={setPollClosesAt}
            onCancel={resetPollComposer}
            onSend={sendPoll}
            t={t}
          />
        ) : null}
        {uploading ? (
          <div className="vs-alert-brand mb-3">
            <div className="flex items-center justify-between gap-3">
              <span>
                {t("messageUploadProgress", {
                  name: uploading.name,
                  progress: uploading.progress,
                })}
              </span>
              <span className="font-semibold">{uploading.progress}%</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-200/70 vs-dark-brand-progress-track">
              <div
                className="h-full rounded-full bg-brand-600 transition-all vs-dark-brand-progress-fill"
                style={{ width: `${Math.max(6, uploading.progress)}%` }}
              />
            </div>
          </div>
        ) : null}
        {failedUpload ? (
          <div className="vs-alert-error mb-3 py-3 text-xs">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="font-semibold text-red-800 dark:text-red-200">
                  {failedUpload.name || t("voiceMessage")}
                </p>
                <p className="mt-1 text-red-700/90 dark:text-red-200/90">
                  {failedUpload.error || t("messageUploadFailed")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => uploadAttachmentDraft(failedUpload)}
                  className="rounded-xl bg-red-600 px-3 py-1.5 text-xs font-semibold text-white outline-none transition hover:bg-red-700 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:focus-visible:ring-offset-gray-950"
                >
                  {t("messageRetry")}
                </button>
                <button
                  type="button"
                  onClick={clearFailedUpload}
                  className="rounded-xl border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-700 outline-none transition hover:bg-red-100 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:border-red-900/40 dark:text-red-200 dark:hover:bg-red-950/40 dark:focus-visible:ring-offset-gray-950"
                >
                  {t("cancel")}
                </button>
              </div>
            </div>
          </div>
        ) : null}
        {voiceRecording ? (
          <div
            className="mb-2 flex items-center gap-2 rounded-2xl border border-brand-300/60 bg-brand-50/90 px-3 py-2 dark:border-brand-700/45 dark:bg-brand-950/35"
            dir={rtl ? "rtl" : "ltr"}
          >
            <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-red-500" aria-hidden />
            <span className="text-xs font-semibold text-red-700 dark:text-red-200">
              {t("recording")} · {voiceElapsed}s
            </span>
            <span className="ms-auto text-[11px] text-muted">
              {voiceMicHeard ? t("voiceMicHint") : t("voiceMicWaiting")}
            </span>
          </div>
        ) : null}
        {!pollOpen && !sendBlocked && smartReplyTriggerKey ? (
          <SmartReplyBar
            recentMessages={smartReplyMessages}
            subject={smartReplySubject}
            conversationKind={smartReplyConversationKind}
            triggerKey={smartReplyTriggerKey}
            autoGenerate
            showControls={false}
            onPick={(value) => {
              setText(String(value || ""));
              textInputRef.current?.focus?.({ preventScroll: true });
            }}
          />
        ) : null}
        <form
          className="flex min-w-0 flex-col gap-2 md:flex-row md:items-center md:gap-1.5 lg:gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept={attachAccept || "image/*,video/*,audio/*,.png,.jpeg,.jpg,.gif,.mp4,.mp3,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar"}
            className="hidden"
            onChange={onFileChange}
          />
          <div className="relative min-w-0 w-full md:w-auto md:shrink-0">
            <div
              ref={toolsScrollRef}
              dir={rtl ? "rtl" : "ltr"}
              className="vs-composer-tools-scroll"
            >
            <button
              ref={emojiBtnRef}
              type="button"
              onClick={() => {
                const next = !emojiComposerOpen;
                closeComposerPanels();
                setEmojiComposerOpen(next);
              }}
              className={cn(
                "vs-composer-icon-btn vs-composer-icon-btn-sm",
                emojiComposerOpen
                  ? COMPOSER_ACTIVE_CLASS
                  : "",
              )}
              title={t("reactMessage") || "Emoji"}
              aria-label={t("reactMessage") || "Emoji"}
            >
              <Smile className="h-5 w-5" />
            </button>
            <button
              type="button"
              disabled={Boolean(uploading)}
              onClick={() => {
                closeComposerPanels();
                fileRef.current?.click();
              }}
              className="vs-composer-icon-btn vs-composer-icon-btn-sm"
              title={t("attach")}
              aria-label={t("attach")}
            >
              <Paperclip className="h-5 w-5" aria-hidden />
            </button>
            <button
              ref={locationBtnRef}
              type="button"
              disabled={!user?._id || shareContactBusy}
              onClick={() => {
                const next = !shareLocationOpen;
                closeComposerPanels();
                setShareLocationOpen(next);
              }}
              className={cn(
                "vs-composer-icon-btn vs-composer-icon-btn-sm shadow-sm transition",
                shareLocationOpen
                  ? COMPOSER_ACTIVE_CLASS
                  : "",
              )}
              title={t("shareLocation")}
            >
              <MapPin className="h-5 w-5" />
            </button>
            <button
              ref={contactBtnRef}
              type="button"
              disabled={!user?._id || shareContactBusy}
              onClick={() => {
                const next = !shareContactOpen;
                closeComposerPanels();
                setShareContactOpen(next);
              }}
              className={cn(
                "vs-composer-icon-btn vs-composer-icon-btn-sm shadow-sm transition",
                shareContactOpen
                  ? COMPOSER_ACTIVE_CLASS
                  : "",
              )}
              title={t("shareContact")}
            >
              <UserRound className="h-5 w-5" />
            </button>
            <VoiceRecorderButton
              disabled={!user?._id || Boolean(uploading)}
              onRecordingChange={(active, sec, meta) => {
                setVoiceRecording(active);
                setVoiceElapsed(sec);
                setVoiceMicHeard(Boolean(meta?.heard));
                if (active) closeComposerPanels();
              }}
              onError={(msg) => {
                setVoiceMsg(msg);
                closeVoicePreview();
                setVoiceRecording(false);
                setVoiceMicHeard(false);
              }}
              onRecorded={(blob, mime, sec) => {
                setVoiceMsg("");
                setVoiceRecording(false);
                setVoiceMicHeard(false);
                setVoiceDraft((prev) => {
                  if (prev?.previewUrl) {
                    try {
                      URL.revokeObjectURL(prev.previewUrl);
                    } catch {
                      /* ignore */
                    }
                  }
                  return {
                    blob,
                    mime,
                    sec,
                    previewUrl: URL.createObjectURL(blob),
                  };
                });
                setVoiceOpen(true);
              }}
            />
            {activeConv?.isGroup || activeConv?.isChannel ? (
              <button
                type="button"
                onClick={() => {
                  closeComposerPanels();
                  setMentionsOnly(!mentionsOnly);
                }}
                className={cn(
                  "vs-composer-icon-btn vs-composer-icon-btn-sm shadow-sm transition",
                  mentionsOnly
                    ? COMPOSER_ACTIVE_CLASS
                    : "",
                )}
                title={mentionsOnly ? t("mentionsOnlyActive") : t("chatMentionsOnlyToggle")}
                aria-label={mentionsOnly ? t("mentionsOnlyActive") : t("chatMentionsOnlyToggle")}
              >
                <AtSign className="h-5 w-5" />
              </button>
            ) : null}
            {activeConv?.isGroup || activeConv?.isChannel ? (
              <button
                type="button"
                onClick={() => {
                  closeComposerPanels();
                  setPollOpen((value) => !value);
                }}
                className={cn(
                  "vs-composer-icon-btn vs-composer-icon-btn-sm shadow-sm transition",
                  pollOpen
                    ? COMPOSER_ACTIVE_CLASS
                    : "",
                )}
                title={t("pollCreateTitle")}
              >
                <BarChart3 className="h-5 w-5" />
              </button>
            ) : null}
            <button
              ref={scheduleBtnRef}
              type="button"
              onClick={() => {
                const next = !scheduleOpen;
                closeComposerPanels();
                setScheduleOpen(next);
                setPollOpen(false);
              }}
              className={cn(
                "vs-composer-icon-btn vs-composer-icon-btn-sm text-muted shadow-sm transition",
                scheduledFor || scheduleOpen
                  ? COMPOSER_ACTIVE_CLASS
                  : "",
              )}
              title={t("scheduleMessage")}
            >
              <Clock3 className="h-5 w-5" />
            </button>
            </div>
            <HorizontalScrollRail
              listRef={toolsScrollRef}
              rtl={rtl}
              ariaLabel={t("composerToolsScroll")}
              className="mt-1.5 md:hidden"
              hideFrom="md"
            />
          </div>
          <div className="flex min-w-0 flex-1 items-end gap-1.5 sm:gap-2 md:contents">
          <textarea
            ref={textInputRef}
            rows={1}
            className="vs-composer-input min-w-0 flex-1"
            value={text}
            placeholder={t("addMessage")}
            onChange={(e) => {
              setText(e.target.value);
              bumpTyping();
            }}
            onKeyDown={(e) => {
              if (mentionSuggestions.length) {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setMentionIndex((i) => (i + 1) % mentionSuggestions.length);
                  return;
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setMentionIndex(
                    (i) =>
                      (i - 1 + mentionSuggestions.length) %
                      mentionSuggestions.length,
                  );
                  return;
                }
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  insertMention(
                    mentionSuggestions[mentionIndex] || mentionSuggestions[0],
                  );
                  return;
                }
              }
              const enterToSend = readLocalPref("vs_enter_to_send", true) !== false;
              if (e.key === "Enter" && !e.shiftKey && enterToSend) {
                e.preventDefault();
                send();
              }
            }}
            dir={rtl ? "rtl" : "ltr"}
          />
          <button
            type="submit"
            disabled={sendBlocked}
            title={
              sendBlocked
                ? dmE2eActive && !e2eConvKey
                  ? t("e2eCannotSend")
                  : cannotPostHint || t("chatCannotPostHint")
                : undefined
            }
            className="vs-composer-send shrink-0 md:shrink-0"
          >
            {scheduledFor ? t("scheduleSendAction") : t("send")}
          </button>
          </div>
        </form>
        {mentionSuggestions.length ? (
          <div className="vs-popover mt-2 p-2">
            <div className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-wide text-muted">
              {t("mentionSuggestions")}
            </div>
            <div className="space-y-1">
              {mentionSuggestions.map((member, idx) => (
                <button
                  key={member._id}
                  type="button"
                  onClick={() => insertMention(member)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2 text-left outline-none transition hover:bg-subtle focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-inset",
                    idx === mentionIndex && "bg-brand-50 vs-dark-brand-surface-soft",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-ink">
                      @{member.label.replace(/\s+/g, "")}
                    </span>
                    <span className="block truncate text-[11px] text-muted">
                      {member.label}
                    </span>
                  </span>
                  {member.subtitle ? (
                    <span className="truncate text-[10px] text-muted">
                      {member.subtitle}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <ComposerFloatingPanel
        open={emojiComposerOpen}
        onClose={() => setEmojiComposerOpen(false)}
        anchorRef={emojiBtnRef}
        rtl={rtl}
        className="!p-0"
      >
        <ComposerEmojiPicker
          searchPlaceholder={t("emojiSearchPlaceholder")}
          onPick={(emoji) => {
            setText((prev) => `${String(prev || "")}${emoji}`);
            setTimeout(() => textInputRef.current?.focus?.(), 0);
          }}
        />
      </ComposerFloatingPanel>

      <ComposerFloatingPanel
        open={shareLocationOpen}
        onClose={() => setShareLocationOpen(false)}
        anchorRef={locationBtnRef}
        rtl={rtl}
      >
        <div className="mb-2 text-sm font-semibold text-ink">{t("shareLocation")}</div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={!user?._id || shareContactBusy}
            onClick={() => {
              void shareMyLocation();
              setShareLocationOpen(false);
            }}
            className="vs-btn-primary-sm rounded-full"
          >
            {t("useMyLocation")}
          </button>
          <button
            type="button"
            disabled={!user?._id || liveLocationBusy}
            onClick={() => {
              if (liveLocationActive) {
                stopLiveLocation?.();
              } else {
                startLiveLocation?.();
              }
              setShareLocationOpen(false);
            }}
            className={cn(
              "vs-btn-outline-sm rounded-full",
              liveLocationActive && "border-brand-300 bg-brand-50 text-brand-700",
            )}
          >
            <span className="inline-flex items-center gap-1.5">
              <Radio className="h-3.5 w-3.5" aria-hidden />
              {liveLocationBusy
                ? t("liveLocationStarting")
                : liveLocationActive
                  ? t("liveLocationStop")
                  : t("liveLocationStart")}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setShareLocationOpen(false)}
            className="vs-btn-outline-sm rounded-full"
          >
            {t("cancel")}
          </button>
        </div>
        <p className="mt-3 text-[11px] leading-relaxed text-muted">
          {liveLocationActive ? t("liveLocationSharingHint") : t("locationAutoFallbackHint")}
        </p>
      </ComposerFloatingPanel>

      <ComposerFloatingPanel
        open={shareContactOpen}
        onClose={() => {
          setShareContactOpen(false);
          setShareContactQuery("");
        }}
        anchorRef={contactBtnRef}
        rtl={rtl}
        align="end"
      >
        <div className="mb-3 flex items-center gap-2 border-b border-brand-200/40 pb-2 dark:border-white/10">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-brand-700 vs-dark-brand-icon-tile">
            <UserRound className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-ink">{t("shareContact")}</div>
            <div className="text-[11px] text-muted">{t("shareContactHint")}</div>
          </div>
        </div>
        <input
          className="vs-input !h-10"
          placeholder={t("search")}
          value={shareContactQuery}
          onChange={(e) => setShareContactQuery(e.target.value)}
        />
        <div className="mt-2 max-h-52 space-y-1 overflow-y-auto overscroll-contain">
          {conversations
            .filter((c) => !c?.isSelfChat && !c?.isChannel && !c?.isGroup)
            .map((c) => c?.members?.[0])
            .filter(Boolean)
            .filter((m) => {
              const q = String(shareContactQuery || "").trim().toLowerCase();
              if (!q) return true;
              const hay =
                `${m?.name || ""} ${m?.username || ""} ${m?.email || ""}`.toLowerCase();
              return hay.includes(q);
            })
            .slice(0, 18)
            .map((m) => (
              <button
                key={String(m._id)}
                type="button"
                onClick={() => sharePersonAsContact(m)}
                className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-sm transition hover:bg-brand-50/80 dark:hover:bg-gradient-to-r dark:hover:from-brand-900/30 dark:hover:to-red-950/20"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-100 text-sm font-semibold text-brand-800 vs-dark-brand-icon-tile">
                  {m?.profilePic ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.profilePic} alt="" className="h-full w-full object-cover" />
                  ) : (
                    String(m?.name || m?.email || "?").trim().slice(0, 1).toUpperCase()
                  )}
                </span>
                <span className="min-w-0 flex-1 text-start">
                  <span className="block truncate font-semibold text-ink" dir="auto">
                    {m?.name || m?.username || m?.email || "User"}
                  </span>
                  <span className="block truncate text-[11px] text-muted" dir="auto">
                    {m?.username ? `@${m.username}` : m?.email || ""}
                  </span>
                </span>
              </button>
            ))}
        </div>
      </ComposerFloatingPanel>

      <ComposerFloatingPanel
        open={scheduleOpen}
        onClose={() => setScheduleOpen(false)}
        anchorRef={scheduleBtnRef}
        rtl={rtl}
        align="end"
      >
        <div className="mb-2 flex items-center gap-2">
          <Clock3 className="h-4 w-4 text-brand-600 vs-dark-brand-pin-icon" aria-hidden />
          <div className="text-sm font-semibold text-ink">{t("scheduleMessage")}</div>
        </div>
        <input
          type="datetime-local"
          aria-label={t("scheduleMessage")}
          value={scheduledFor}
          min={minDatetimeLocalValue()}
          onChange={(e) => setScheduledFor(e.target.value)}
          className="vs-input w-full"
        />
        <p className="mt-2 text-[11px] leading-relaxed text-muted">
          {scheduledFor
            ? t("scheduledForLabel", {
                date: new Date(scheduledFor).toLocaleString(),
              })
            : t("scheduleMessageHint")}
        </p>
        <div className="mt-3 flex items-center justify-end gap-2">
          {scheduledFor ? (
            <button
              type="button"
              onClick={() => setScheduledFor("")}
              className="vs-btn-outline-sm rounded-full"
            >
              {t("cancel")}
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => setScheduleOpen(false)}
            className="vs-btn-primary-sm rounded-full"
          >
            {t("close")}
          </button>
        </div>
      </ComposerFloatingPanel>

      <VoicePreviewModal
        open={voiceOpen}
        draft={voiceDraft}
        t={t}
        uploading={Boolean(uploading)}
        retryLabel={
          failedUpload?.kind === "audio" ? t("messageRetry") : undefined
        }
        onCancel={closeVoicePreview}
        onSend={async () => {
          if (!user?._id || !conversationId || !voiceDraft?.blob) return;
          const ext = voiceFileExtension(voiceDraft.mime);
          const draft = {
            kind: "audio",
            uploadKind: "audio",
            file: new File(
              [voiceDraft.blob],
              `voice-note.${ext}`,
              { type: normalizeAudioMime(voiceDraft.mime) },
            ),
            name: t("voiceMessage"),
            fileName: `voice-note.${ext}`,
            audioDuration: voiceDraft.sec,
            topicId: activeTopicId || "general",
            previewUrl: voiceDraft.previewUrl,
          };
          const result = await uploadAttachmentDraft(draft);
          if (result.ok) {
            closeVoicePreview();
          } else {
            setVoiceMsg(result.message || t("messageUploadFailed"));
            closeVoicePreview();
          }
        }}
      />
    </>
  );
}
