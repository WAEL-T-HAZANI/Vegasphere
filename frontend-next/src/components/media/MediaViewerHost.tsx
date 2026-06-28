"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { motion } from "framer-motion";
import { useAppSelector, useAppDispatch } from "@/store/hooks";

import {
  closeMediaViewer,
  mediaViewerNavigate,
} from "@/store/slices/uiSlice";
import { X, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, Download } from "lucide-react";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import { triggerBrowserDownload } from "@/lib/messageFormat";
import { removeMessageFromConversation } from "@/store/slices/chatSlice";

const VIEW_ONCE_MAX_MS = 4000;

export default function MediaViewerHost() {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const mediaViewer = useAppSelector((s) => s.ui.mediaViewer);
  const open = Boolean(mediaViewer?.items?.length);
  const items = mediaViewer?.items || [];
  const index = mediaViewer?.index ?? 0;
  const media = items[index];
  const [scale, setScale] = useState(1);
  const contentRef = useRef(null);
  const openedViewOnceRef = useRef(new Set());
  const viewOnceTimerRef = useRef(null);

  const consumeViewOnce = useCallback(
    (mid) => {
      if (!mid || openedViewOnceRef.current.has(mid)) return;
      openedViewOnceRef.current.add(mid);
      api
        .post("/message/view-once-open", { messageId: mid })
        .then((res) => res?.data)
        .then((data) => {
          if (
            (data?.removeForUser || data?.removeForEveryone) &&
            data?.conversationId &&
            data?.messageId
          ) {
            dispatch(
              removeMessageFromConversation({
                conversationId: String(data.conversationId),
                messageId: String(data.messageId),
              }),
            );
          }
        })
        .catch(() => {});
    },
    [dispatch],
  );

  const closeViewer = useCallback(() => {
    if (media?.viewOnce && media?.messageId) {
      consumeViewOnce(String(media.messageId));
    }
    dispatch(closeMediaViewer());
  }, [consumeViewOnce, dispatch, media?.messageId, media?.viewOnce]);

  useEffect(() => {
    if (!open) setScale(1);
  }, [open, index]);

  useEffect(() => {
    if (viewOnceTimerRef.current) {
      clearTimeout(viewOnceTimerRef.current);
      viewOnceTimerRef.current = null;
    }
    if (!open || !media?.viewOnce || !media?.messageId) return;
    const mid = String(media.messageId);
    viewOnceTimerRef.current = setTimeout(() => {
      consumeViewOnce(mid);
      dispatch(closeMediaViewer());
    }, VIEW_ONCE_MAX_MS);
    return () => {
      if (viewOnceTimerRef.current) {
        clearTimeout(viewOnceTimerRef.current);
        viewOnceTimerRef.current = null;
      }
    };
  }, [open, media?.viewOnce, media?.messageId, consumeViewOnce, dispatch]);

  const goPrev = useCallback(() => {
    dispatch(mediaViewerNavigate(-1));
  }, [dispatch]);

  const goNext = useCallback(() => {
    dispatch(mediaViewerNavigate(1));
  }, [dispatch]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeViewer();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dispatch, goPrev, goNext]);

  const onDragEnd = (_e, info) => {
    const x = info.offset.x;
    if (x < -48) goNext();
    else if (x > 48) goPrev();
  };

  const isVideo =
    media?.type === "video" ||
    /\.(mp4|webm|ogg|mov)(\?|$)/i.test(media?.url || "");

  const multi = items.length > 1;

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(v) => {
        if (!v) closeViewer();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md" />
        <Dialog.Content
          ref={contentRef}
          tabIndex={-1}
          className="fixed left-1/2 top-1/2 z-[101] max-h-[92vh] w-[min(96vw,960px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-zinc-950 p-3 shadow-2xl outline-none"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2">
            <p className="truncate text-sm text-white/80">
              {media?.title || t("mediaViewer")}
              {multi && (
                <span className="ml-2 text-white/50">
                  {index + 1}/{items.length}
                </span>
              )}
            </p>
            {media?.viewOnce ? (
              <span className="rounded-full border border-white/15 bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/75">
                {t("viewOnceLabel")}
              </span>
            ) : null}
            <div className="flex items-center gap-1">
              {multi && (
                <>
                  <button
                    type="button"
                    className="rounded-lg p-2 text-white/80 hover:bg-white/10"
                    onClick={goPrev}
                    aria-label={t("mediaPrev")}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    className="rounded-lg p-2 text-white/80 hover:bg-white/10"
                    onClick={goNext}
                    aria-label={t("mediaNext")}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
              <button
                type="button"
                className="rounded-lg p-2 text-white/80 hover:bg-white/10"
                onClick={() => {
                  if (media?.viewOnce) return;
                  void triggerBrowserDownload(media?.url, media?.title || "", {
                    fileType: isVideo ? "video/mp4" : "image/jpeg",
                  });
                }}
                aria-label={t("downloadFile")}
                disabled={Boolean(media?.viewOnce)}
              >
                <Download className="h-4 w-4" />
              </button>
              {!isVideo && (
                <>
                  <button
                    type="button"
                    className="rounded-lg p-2 text-white/80 hover:bg-white/10"
                    onClick={() => setScale((s) => Math.max(0.5, s - 0.25))}
                    aria-label={t("zoomOut")}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    className="rounded-lg p-2 text-white/80 hover:bg-white/10"
                    onClick={() => setScale((s) => Math.min(3, s + 0.25))}
                    aria-label={t("zoomIn")}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </button>
                </>
              )}
              <Dialog.Close asChild>
                <button
                  type="button"
                  className="rounded-lg p-2 text-white/80 hover:bg-white/10"
                  aria-label={t("shortcutClose")}
                >
                  <X className="h-5 w-5" />
                </button>
              </Dialog.Close>
            </div>
          </div>
          <motion.div
            key={index}
            className="flex max-h-[min(78vh,720px)] min-h-[200px] cursor-grab touch-pan-y items-center justify-center overflow-auto p-2 active:cursor-grabbing"
            initial={{ opacity: 0.92, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.18 }}
            drag={multi ? "x" : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={onDragEnd}
          >
            {isVideo ? (
              <video
                src={media?.url}
                controls
                autoPlay
                className="max-h-full w-full rounded-lg"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={media?.url}
                alt=""
                className="max-h-full max-w-full rounded-lg object-contain shadow-lg ring-1 ring-white/10 transition-transform duration-200"
                style={{ transform: `scale(${scale})` }}
              />
            )}
          </motion.div>
          {multi && (
            <p className="mt-1 text-center text-xs text-white/40">
              {t("mediaSwipeHint")}
            </p>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
