"use client";

import { FileText, Images, Link2, Mic, Reply } from "lucide-react";
import { cn } from "@/lib/classNames";

export default function ReplyToBanner({
  replyTo,
  replyPreview,
  t,
  currentUserId,
  onJump,
  onClear,
  rtl = false,
}) {
  if (!replyTo) return null;

  return (
    <div
      className="border-t border-brand-200/45 bg-surface/90 px-3 py-2 dark:border-white/10 dark:bg-black/70"
      dir={rtl ? "rtl" : "ltr"}
    >
      <div className="flex items-stretch gap-2 rounded-2xl border border-brand-200/50 bg-brand-50/40 p-2 vs-dark-brand-surface-soft">
        <span
          className="w-1 shrink-0 rounded-full bg-brand-500 vs-dark-brand-accent-bar"
          aria-hidden
        />
        <button
          type="button"
          onClick={() => onJump(replyTo._id)}
          className="flex min-w-0 flex-1 items-start gap-3 text-start"
        >
          {replyTo.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={replyTo.imageUrl}
              alt=""
              className="h-11 w-11 shrink-0 rounded-xl object-cover"
            />
          ) : (
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 text-brand-700 vs-dark-brand-icon-tile">
              {replyTo.messageType === "file" ? (
                <FileText className="h-5 w-5" />
              ) : replyTo.messageType === "audio" || replyTo.audioData ? (
                <Mic className="h-5 w-5" />
              ) : replyTo.imageUrl ? (
                <Images className="h-5 w-5" />
              ) : (
                <Link2 className="h-5 w-5" />
              )}
            </span>
          )}
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-brand-700 vs-dark-brand-text-muted">
              <Reply className="h-3 w-3" aria-hidden />
              {t("replyTo")}
            </span>
            <span className="mt-0.5 block truncate text-xs font-semibold text-ink" dir="auto">
              {String(replyTo.senderId?._id || replyTo.senderId) ===
              String(currentUserId)
                ? t("savedSelfBadge")
                : replyTo.senderId?.name || replyTo.senderName || t("replyTo")}
            </span>
            <span className="mt-1 block line-clamp-2 text-xs text-muted" dir="auto">
              {replyPreview(replyTo)}
            </span>
          </span>
        </button>
        <button
          type="button"
          className={cn(
            "shrink-0 self-center rounded-xl px-2.5 py-1 text-xs font-semibold text-brand-700 outline-none transition hover:bg-brand-100/80 vs-dark-brand-text vs-dark-brand-surface-soft dark:hover:from-brand-900/32 dark:hover:to-red-950/24",
          )}
          onClick={onClear}
        >
          {t("clearReply")}
        </button>
      </div>
    </div>
  );
}
