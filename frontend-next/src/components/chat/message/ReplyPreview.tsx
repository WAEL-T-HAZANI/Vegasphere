"use client";

import {
  CornerUpLeft,
  FileText,
  ImageIcon,
  Mic,
} from "lucide-react";
import { cn } from "@/lib/classNames";
import { replyPreviewKind, replyPreviewText } from "@/lib/messageFormat";

export default function ReplyPreview({
  replyParent,
  replyDisplayText,
  isMine,
  onJumpToReply,
  t,
}) {
  if (!replyParent) return null;

  return (
    <button
      type="button"
      onClick={() => onJumpToReply?.(replyParent)}
      className={cn(
        "mb-2 flex w-full items-center gap-2 rounded-2xl border px-2.5 py-2 text-left transition",
        isMine
          ? "border-white/20 bg-white/10 hover:bg-white/15"
          : "border-brand-500/20 bg-brand-500/5 hover:bg-brand-500/10 dark:border-brand-700/40 dark:bg-gradient-to-br dark:from-brand-900/35 dark:to-red-950/22 dark:hover:from-brand-900/45 dark:hover:to-red-950/30"
      )}
    >
      <span
        className={cn(
          "mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
          isMine
            ? "bg-white/12 text-white"
            : "bg-brand-500/10 text-brand-700 vs-dark-brand-icon-tile"
        )}
        aria-hidden
      >
        {replyParent.messageType === "file" ? (
          <FileText className="h-4 w-4" />
        ) : replyParent.messageType === "audio" || replyParent.audioData ? (
          <Mic className="h-4 w-4" />
        ) : replyParent.imageUrl ? (
          <ImageIcon className="h-4 w-4" />
        ) : (
          <CornerUpLeft className="h-4 w-4" />
        )}
      </span>
      <span className="min-w-0 flex-1 overflow-hidden">
        <span
          className={cn(
            "block text-[10px] font-semibold uppercase tracking-wide",
            isMine ? "text-white/80" : "text-brand-700 vs-dark-brand-text-muted"
          )}
        >
          {replyPreviewKind(replyParent, t)}
        </span>
        <span className="mt-0.5 block truncate text-xs font-semibold">
          {replyParent.senderId?.name || replyParent.senderName || t("replyTo")}
        </span>
        <span className="mt-0.5 block truncate text-xs opacity-90">
          {replyPreviewText(replyParent, t, replyDisplayText)}
        </span>
      </span>
    </button>
  );
}
