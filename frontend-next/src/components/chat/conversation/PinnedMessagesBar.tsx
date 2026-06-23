"use client";

import { Pin } from "lucide-react";

export default function PinnedMessagesBar({
  pinnedMessages,
  decryptedById,
  t,
  onJump,
  rtl = false,
}) {
  if (!pinnedMessages?.length) return null;

  const first = pinnedMessages[0];
  const preview = (
    decryptedById[String(first._id)] ||
    first.text ||
    first.fileName ||
    ""
  ).slice(0, 120);
  const fullLen = (
    decryptedById[String(first._id)] ||
    first.text ||
    ""
  ).length;

  return (
    <button
      type="button"
      onClick={() => onJump?.(first._id)}
      dir={rtl ? "rtl" : "ltr"}
      className="flex w-full items-center gap-2 border-b border-brand-200/45 bg-brand-50/50 px-4 py-2 text-start text-xs transition hover:bg-brand-50/80 vs-dark-brand-surface-soft vs-dark-brand-surface-hover"
    >
      <Pin className="h-3.5 w-3.5 shrink-0 text-brand-600 vs-dark-brand-pin-icon" aria-hidden />
      <span className="font-semibold text-brand-800 vs-dark-brand-text">
        {t("pinnedInChat")}
      </span>
      <span className="min-w-0 flex-1 truncate text-ink/90 vs-dark-brand-text-muted">
        {preview}
        {fullLen > 120 ? "…" : ""}
      </span>
    </button>
  );
}
