"use client";

import { useEffect, useRef, useState } from "react";
import { Gauge, Play } from "lucide-react";
import { cn } from "@/lib/classNames";
import { normalizeAudioMime, voiceFileExtension } from "@/lib/messageFormat";

const PLAYBACK_SPEEDS = [1, 1.25, 1.5, 2];

type VoicePreviewModalProps = {
  open: boolean;
  draft: {
    blob?: Blob | null;
    mime?: string;
    sec?: number;
    previewUrl?: string;
  } | null;
  t: (_key: string, _opts?: Record<string, unknown>) => string;
  uploading?: boolean;
  retryLabel?: string;
  onCancel: () => void;
  onSend: () => void | Promise<void>;
};

export default function VoicePreviewModal({
  open,
  draft,
  t,
  uploading = false,
  retryLabel,
  onCancel,
  onSend,
}: VoicePreviewModalProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [loadError, setLoadError] = useState("");
  const [needsPlayTap, setNeedsPlayTap] = useState(false);
  const [sending, setSending] = useState(false);

  const previewUrl = draft?.previewUrl || "";
  const audioMime = normalizeAudioMime(draft?.mime);

  useEffect(() => {
    if (!open) return;
    setPlaybackRate(1);
    setLoadError("");
    setNeedsPlayTap(false);
    setSending(false);
  }, [open, previewUrl]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.playbackRate = playbackRate;
  }, [playbackRate, previewUrl]);

  useEffect(() => {
    if (!open || !previewUrl) return;
    const el = audioRef.current;
    if (!el) return;

    // WebM blobs from MediaRecorder often report Infinity duration until first play.
    el.currentTime = Number.MAX_SAFE_INTEGER;

    const tryAutoplay = () => {
      el.playbackRate = playbackRate;
      void el.play()
        .then(() => {
          el.currentTime = 0;
          setNeedsPlayTap(false);
        })
        .catch(() => setNeedsPlayTap(true));
    };

    const onLoaded = () => {
      if (Number.isFinite(el.duration) && el.duration > 0) {
        el.currentTime = 0;
      }
      tryAutoplay();
    };

    el.addEventListener("loadedmetadata", onLoaded, { once: true });
    el.addEventListener("canplay", tryAutoplay, { once: true });
    return () => {
      el.removeEventListener("loadedmetadata", onLoaded);
      el.removeEventListener("canplay", tryAutoplay);
    };
  }, [open, previewUrl, playbackRate]);

  if (!open || !previewUrl) return null;

  const cycleSpeed = () => {
    setPlaybackRate((prev) => {
      const idx = PLAYBACK_SPEEDS.indexOf(prev);
      const next = PLAYBACK_SPEEDS[(idx + 1) % PLAYBACK_SPEEDS.length];
      const el = audioRef.current;
      if (el) {
        el.playbackRate = next;
      }
      return next;
    });
  };

  const handlePlay = () => {
    const el = audioRef.current;
    if (!el) return;
    el.playbackRate = playbackRate;
    if (!Number.isFinite(el.duration) || el.duration === Infinity) {
      el.currentTime = 0;
    }
    void el.play()
      .then(() => {
        if (el.currentTime > 86400) el.currentTime = 0;
        setNeedsPlayTap(false);
      })
      .catch(() => setLoadError(t("voicePreviewFailed") || "Could not play this recording."));
  };

  const handleSend = async () => {
    if (sending || uploading) return;
    setSending(true);
    try {
      await onSend();
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4">
      <div className="vs-modal-panel w-full max-w-md">
        <h2 className="text-lg font-semibold text-ink">{t("voiceMessage")}</h2>
        <p className="mt-1 text-xs text-muted">
          {Math.max(1, Number(draft?.sec) || 1)}s ·{" "}
          {voiceFileExtension(draft?.mime).toUpperCase()}
          {draft?.blob?.size
            ? ` · ${Math.max(1, Math.round(Number(draft.blob.size) / 1024))} KB`
            : ""}
        </p>
        <div className={cn("vs-stat-tile mt-4", "!px-4 !py-4")} dir="ltr">
          <audio
            ref={audioRef}
            key={previewUrl}
            controls
            className="w-full"
            preload="auto"
            onLoadedMetadata={(e) => {
              e.currentTarget.playbackRate = playbackRate;
            }}
            onError={() =>
              setLoadError(
                t("voicePreviewFailed") || "Could not play this recording.",
              )
            }
          >
            <source src={previewUrl} type={audioMime} />
          </audio>
          {loadError ? (
            <p className="mt-2 text-xs text-red-600 dark:text-red-300">{loadError}</p>
          ) : null}
          {needsPlayTap && !loadError ? (
            <button
              type="button"
              onClick={handlePlay}
              className="mt-3 inline-flex h-9 items-center gap-2 rounded-full border border-brand-200/50 bg-brand-50 px-3 text-xs font-semibold text-brand-800 transition hover:bg-brand-100 dark:border-white/10 dark:bg-white/[0.06] dark:text-brand-100"
            >
              <Play className="h-3.5 w-3.5" aria-hidden />
              {t("voicePreviewPlay") || "Tap to listen"}
            </button>
          ) : null}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={cycleSpeed}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-brand-200/50 bg-surface px-3 text-xs font-semibold text-brand-700 transition hover:bg-brand-50 dark:border-white/10 dark:bg-white/[0.04] dark:text-brand-100 dark:hover:bg-white/[0.08]"
            >
              <Gauge className="h-3.5 w-3.5" aria-hidden />
              {playbackRate}x
            </button>
            <span className="text-[11px] text-muted">
              {t("voiceSpeedHint") || "Tap to change playback speed"}
            </span>
          </div>
        </div>
        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="vs-btn-outline px-4 py-2 text-sm"
            disabled={sending || uploading}
          >
            {t("cancel")}
          </button>
          <button
            type="button"
            onClick={handleSend}
            className="vs-btn-primary-inline disabled:opacity-60"
            disabled={
              Boolean(uploading) || sending || Boolean(loadError) || !draft?.blob
            }
          >
            {retryLabel || t("send")}
          </button>
        </div>
      </div>
    </div>
  );
}
