"use client";

import { Copy, Forward, Trash2, X } from "lucide-react";
import { cn } from "@/lib/classNames";

export default function MessageSelectionBar({
  t,
  rtl = false,
  selectedCount = 0,
  canCopy = false,
  onForward,
  onDelete,
  onCopy,
  onCancel,
}) {
  const disabled = selectedCount <= 0;

  const actionBtn =
    "inline-flex min-w-0 items-center justify-center gap-1.5 rounded-xl px-2.5 py-2 text-xs font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-brand-400 disabled:cursor-not-allowed disabled:opacity-40 sm:px-3";

  return (
    <div
      className="border-t border-brand-200/45 bg-surface/95 px-2 py-2 backdrop-blur-sm dark:border-white/10 dark:bg-black/80 sm:px-3"
      dir={rtl ? "rtl" : "ltr"}
    >
      <div className="flex items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={onCancel}
          className={cn(
            actionBtn,
            "shrink-0 text-muted hover:bg-brand-50/80 dark:hover:bg-gradient-to-br dark:hover:from-brand-900/30 dark:hover:to-red-950/20",
          )}
          aria-label={t("chatCancelSelection")}
        >
          <X className="h-4 w-4" aria-hidden />
          <span className="hidden sm:inline">{t("chatCancelSelection")}</span>
        </button>

        <span className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
          {t("chatSelectedCount", { count: selectedCount })}
        </span>

        <button
          type="button"
          disabled={disabled || !canCopy}
          onClick={onCopy}
          className={cn(
            actionBtn,
            "text-brand-700 hover:bg-brand-50/90 vs-dark-brand-text-muted dark:hover:bg-gradient-to-br dark:hover:from-brand-900/30 dark:hover:to-red-950/20",
          )}
        >
          <Copy className="h-4 w-4 shrink-0" aria-hidden />
          <span className="hidden sm:inline">{t("copy")}</span>
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={onForward}
          className={cn(
            actionBtn,
            "text-brand-700 hover:bg-brand-50/90 vs-dark-brand-text-muted dark:hover:bg-gradient-to-br dark:hover:from-brand-900/30 dark:hover:to-red-950/20",
          )}
        >
          <Forward className="h-4 w-4 shrink-0" aria-hidden />
          <span className="hidden sm:inline">{t("forwardMessage")}</span>
        </button>

        <button
          type="button"
          disabled={disabled}
          onClick={onDelete}
          className={cn(
            actionBtn,
            "text-red-600 hover:bg-red-50/90 dark:text-red-300 dark:hover:bg-red-950/35",
          )}
        >
          <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
          <span className="hidden sm:inline">{t("deleteMessage")}</span>
        </button>
      </div>
    </div>
  );
}
