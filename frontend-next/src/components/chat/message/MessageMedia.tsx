"use client";

import { useEffect, useState } from "react";
import { ImageIcon, ExternalLink, FileText, Play } from "lucide-react";
import { cn } from "@/lib/classNames";
import {
  fileKindLabel,
  formatFileSize,
  triggerBrowserDownload,
} from "@/lib/messageFormat";
import { shouldAutoLoadMedia } from "@/lib/localPrefs";

function videoPreviewSrc(url) {
  const base = String(url || "").trim();
  if (!base) return "";
  return base.includes("#") ? base : `${base}#t=0.001`;
}

export default function MessageMedia({
  message: m,
  isMine,
  t,
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
  mediaFailed: _mediaFailed,
  onMediaLoad,
  onMediaError,
  onManualMediaLoad,
  onOpenMedia,
}) {
  const autoLoadMedia = shouldAutoLoadMedia();
  const [manualMediaLoad, setManualMediaLoad] = useState(false);
  const [videoPosterReady, setVideoPosterReady] = useState(false);
  const loadInlineMedia = autoLoadMedia || manualMediaLoad;

  const requestInlineLoad = () => {
    onManualMediaLoad?.();
    setManualMediaLoad(true);
  };

  useEffect(() => {
    setManualMediaLoad(false);
  }, [m?._id]);

  useEffect(() => {
    setVideoPosterReady(false);
  }, [effectiveVideoUrl, m?._id]);

  const bindInlineImage = (node) => {
    if (node?.complete && node.naturalWidth > 0) {
      onMediaLoad?.();
    }
  };

  return (
    <>
      {showVideo ? (
        <button
          type="button"
          className="mb-1 block w-full min-w-[12rem] text-left"
          onClick={() => onOpenMedia?.(m)}
        >
          <div
            className={cn(
              "relative h-40 w-full overflow-hidden rounded-lg",
              isMine ? "bg-black/25" : "bg-black/10 dark:bg-black/35",
            )}
          >
            <video
              src={videoPreviewSrc(effectiveVideoUrl)}
              className={cn(
                "absolute inset-0 h-full w-full object-cover",
                videoPosterReady ? "opacity-100" : "opacity-0",
              )}
              muted
              playsInline
              preload="metadata"
              onLoadedData={(e) => {
                try {
                  e.currentTarget.currentTime = 0.001;
                } catch {
                  /* ignore */
                }
                setVideoPosterReady(true);
                onMediaLoad?.();
              }}
              onError={() => {
                setVideoPosterReady(false);
                onMediaError?.();
              }}
            />
            <div
              className={cn(
                "absolute inset-0 flex flex-col items-center justify-center gap-2 px-3 text-center",
                videoPosterReady ? "bg-black/20" : "",
                isMine && !videoPosterReady
                  ? "bg-white/10 text-white/90"
                  : !videoPosterReady
                    ? "bg-black/5 text-muted dark:bg-white/10"
                    : "text-white",
              )}
            >
              <span
                className={cn(
                  "inline-flex h-11 w-11 items-center justify-center rounded-full shadow-md",
                  isMine
                    ? "bg-white/20 text-white ring-1 ring-white/30"
                    : "bg-brand-500/15 text-brand-700 ring-1 ring-brand-400/25 dark:bg-white/15 dark:text-white dark:ring-white/20",
                )}
                aria-hidden
              >
                <Play className="h-5 w-5 fill-current" />
              </span>
              <span className="max-w-full truncate text-[11px] font-medium opacity-90">
                {m.fileName || fileKindLabel({ fileType, fileName: m.fileName }) || t("replyBannerMedia")}
                {formatFileSize(m.fileSize) ? ` · ${formatFileSize(m.fileSize)}` : ""}
              </span>
            </div>
          </div>
        </button>
      ) : null}

      {showImage ? (
        <button
          type="button"
          className="mb-1 block w-full max-w-full text-left"
          onClick={() => {
            if (!loadInlineMedia) requestInlineLoad();
            else onOpenMedia?.(m);
          }}
        >
          <span
            className={cn(
              "relative block h-40 min-w-[12rem] w-full overflow-hidden rounded-lg",
              isMine ? "bg-white/10" : "bg-black/5 dark:bg-white/10",
            )}
          >
            {!loadInlineMedia ? (
              <span
                className={cn(
                  "flex h-full w-full items-center justify-center px-3 text-xs font-medium",
                  isMine ? "text-white/90" : "text-muted",
                )}
              >
                {t("chatTapToLoadMedia")}
              </span>
            ) : (
              <>
                {mediaLoading ? (
                  <span className="absolute inset-0 z-[1] flex items-center justify-center">
                    <span
                      className={cn(
                        "h-7 w-7 animate-spin rounded-full border-2 border-white/30 border-t-white/80",
                        !isMine &&
                          "border-black/20 border-t-brand-600 dark:border-white/20 dark:border-t-brand-300",
                      )}
                    />
                  </span>
                ) : null}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  ref={bindInlineImage}
                  key={`${m?._id}-${effectiveImageUrl}`}
                  src={effectiveImageUrl}
                  alt=""
                  loading="eager"
                  decoding="async"
                  className={cn(
                    "h-full w-full object-cover transition-opacity duration-200",
                    mediaLoading ? "opacity-0" : "opacity-100",
                  )}
                  onLoad={onMediaLoad}
                  onError={onMediaError}
                />
              </>
            )}
          </span>
        </button>
      ) : null}

      {showImageFallbackCard ? (
        <button
          type="button"
          onClick={() => {
            void triggerBrowserDownload(
              effectiveImageUrl || mediaUrl || fileUrl,
              m.fileName || "",
            );
          }}
          className={cn(
            "mb-1 block w-full overflow-hidden rounded-2xl border p-3 text-left transition hover:bg-subtle",
            isMine
              ? "border-white/20 bg-white/10 hover:bg-white/15"
              : "border-gray-200 bg-canvas dark:border-gray-700 dark:bg-white/[0.03]"
          )}
        >
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                isMine
                  ? "bg-white/12 text-white"
                  : "bg-brand-500/10 text-brand-700 dark:text-brand-200"
              )}
              aria-hidden
            >
              <ImageIcon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  "block truncate text-xs font-semibold",
                  isMine ? "text-white" : "text-ink"
                )}
              >
                {m.fileName || t("replyBannerMedia") || "Image"}
              </span>
              <span
                className={cn(
                  "mt-0.5 block truncate text-[11px] opacity-90",
                  isMine ? "text-white/80" : "text-muted"
                )}
              >
                {fileKindLabel({ fileType, fileName: m.fileName })}
                {formatFileSize(m.fileSize) ? ` • ${formatFileSize(m.fileSize)}` : ""}
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
        </button>
      ) : null}

      {showFile ? (
        <button
          type="button"
          onClick={() => {
            void triggerBrowserDownload(fileUrl, m.fileName || "");
          }}
          className={cn(
            "mb-1 block w-full overflow-hidden rounded-2xl border p-3 text-left transition hover:bg-subtle",
            isMine
              ? "border-white/20 bg-white/10 hover:bg-white/15"
              : "border-gray-200 bg-canvas dark:border-gray-700 dark:bg-white/[0.03]"
          )}
        >
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                isMine
                  ? "bg-white/12 text-white"
                  : "bg-brand-500/10 text-brand-700 dark:text-brand-200"
              )}
              aria-hidden
            >
              <FileText className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span
                className={cn(
                  "block truncate text-xs font-semibold",
                  isMine ? "text-white" : "text-ink"
                )}
              >
                {m.fileName || t("fileAttachment")}
              </span>
              <span
                className={cn(
                  "mt-0.5 block truncate text-[11px] opacity-90",
                  isMine ? "text-white/80" : "text-muted"
                )}
              >
                {fileKindLabel({ fileType, fileName: m.fileName })}
                {formatFileSize(m.fileSize) ? ` • ${formatFileSize(m.fileSize)}` : ""}
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
        </button>
      ) : null}
    </>
  );
}
