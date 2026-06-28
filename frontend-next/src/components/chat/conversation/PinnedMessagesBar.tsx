"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, Pin } from "lucide-react";
import { cn } from "@/lib/classNames";

export default function PinnedMessagesBar({
  pinnedMessages,
  decryptedById,
  t,
  onJump,
  rtl = false,
}) {
  const [index, setIndex] = useState(0);

  if (!pinnedMessages?.length) return null;

  const safeIndex = Math.min(index, pinnedMessages.length - 1);
  const current = pinnedMessages[safeIndex];
  const preview = (
    decryptedById[String(current._id)] ||
    current.text ||
    current.fileName ||
    ""
  ).slice(0, 120);
  const fullLen = (
    decryptedById[String(current._id)] ||
    current.text ||
    ""
  ).length;
  const multi = pinnedMessages.length > 1;

  return (
    <div
      dir={rtl ? "rtl" : "ltr"}
      className="flex w-full items-center gap-1 border-b border-brand-200/45 bg-brand-50/50 px-2 py-2 vs-dark-brand-surface-soft"
    >
      {multi ? (
        <button
          type="button"
          onClick={() => setIndex((i) => (i <= 0 ? pinnedMessages.length - 1 : i - 1))}
          className="shrink-0 rounded-full p-1.5 text-brand-700 hover:bg-brand-100/80 vs-dark-brand-surface-hover"
          aria-label={t("mediaPrev")}
        >
          <ChevronLeft className={cn("h-4 w-4", rtl && "rotate-180")} />
        </button>
      ) : null}
      <button
        type="button"
        onClick={() => onJump?.(current._id)}
        className="flex min-w-0 flex-1 items-center gap-2 text-start text-xs"
      >
        <Pin className="h-3.5 w-3.5 shrink-0 text-brand-600 vs-dark-brand-pin-icon" aria-hidden />
        <span className="font-semibold text-brand-800 vs-dark-brand-text">
          {t("pinnedInChat")}
          {multi ? ` (${safeIndex + 1}/${pinnedMessages.length})` : ""}
        </span>
        <span className="min-w-0 flex-1 truncate text-ink/90 vs-dark-brand-text-muted">
          {preview}
          {fullLen > 120 ? "…" : ""}
        </span>
      </button>
      {multi ? (
        <button
          type="button"
          onClick={() => setIndex((i) => (i >= pinnedMessages.length - 1 ? 0 : i + 1))}
          className="shrink-0 rounded-full p-1.5 text-brand-700 hover:bg-brand-100/80 vs-dark-brand-surface-hover"
          aria-label={t("mediaNext")}
        >
          <ChevronRight className={cn("h-4 w-4", rtl && "rotate-180")} />
        </button>
      ) : null}
    </div>
  );
}
