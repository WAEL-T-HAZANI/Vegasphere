"use client";

import { useMemo } from "react";
import { Clock3, X } from "lucide-react";
import { cn } from "@/lib/classNames";

export default function ScheduledMessagesBar({
  messages,
  userId,
  t,
  onCancelSchedule,
}) {
  const pending = useMemo(
    () =>
      (messages || []).filter(
        (m) =>
          m?.scheduledStatus === "pending" &&
          String(m.senderId?._id || m.senderId) === String(userId),
      ),
    [messages, userId],
  );

  if (!pending.length) return null;

  return (
    <div className="border-b border-brand-200/45 bg-brand-50/80 px-3 py-2 dark:border-brand-800/30 dark:bg-brand-900/20">
      <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-brand-800 dark:text-[rgb(var(--vega-ink))]/90">
        <Clock3 className="h-3.5 w-3.5" aria-hidden />
        {t("scheduledMessagesTitle", { count: pending.length })}
      </div>
      <ul className="space-y-1">
        {pending.map((m) => (
          <li
            key={String(m._id)}
            className="flex items-center justify-between gap-2 rounded-lg bg-surface/80 px-2 py-1.5 text-xs dark:bg-black/30"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium text-ink">
                {m.text || t("fileAttachment")}
              </div>
              {m.scheduledFor ? (
                <div className="text-[10px] text-muted">
                  {new Date(m.scheduledFor).toLocaleString()}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold",
                "text-red-700 hover:bg-red-50 dark:text-red-200 dark:hover:bg-red-950/40",
              )}
              onClick={() => onCancelSchedule?.(m)}
            >
              <X className="h-3 w-3" aria-hidden />
              {t("cancelScheduledMessage")}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
