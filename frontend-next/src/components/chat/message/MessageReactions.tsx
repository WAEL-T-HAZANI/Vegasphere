"use client";

import { useState, useEffect } from "react";
import { SmilePlus } from "lucide-react";
import { cn } from "@/lib/classNames";

export default function MessageReactions({
  reactionGroups,
  isMine,
  currentUserId,
  onReact,
  message,
  t,
}) {
  const [activeReactionEmoji, setActiveReactionEmoji] = useState("");

  useEffect(() => {
    setActiveReactionEmoji("");
  }, [message?._id]);

  const activeReactionGroup = reactionGroups.find(
    (row) => row.emoji === activeReactionEmoji
  );

  if (!reactionGroups.length) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {reactionGroups.map((row) => {
          const reactedByMe = row.users.some(
            (u) => String(u?._id || u) === String(currentUserId)
          );
          return (
            <button
              key={row.emoji}
              type="button"
              onClick={() =>
                setActiveReactionEmoji((prev) =>
                  prev === row.emoji ? "" : row.emoji
                )
              }
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold transition",
                reactedByMe
                  ? isMine
                    ? "border-white/30 bg-white/15 text-white"
                    : "border-brand-500/30 bg-brand-500/10 text-brand-800 dark:text-brand-200"
                  : isMine
                    ? "border-white/20 bg-white/10 text-white/90"
                    : "border-gray-200 bg-canvas text-ink dark:border-gray-700"
              )}
              aria-label={`${row.emoji} ${row.users.length}`}
            >
              <span className="text-sm leading-none">{row.emoji}</span>
              <span>{row.users.length || 1}</span>
            </button>
          );
        })}
      </div>
      {activeReactionGroup ? (
        <div
          className={cn(
            "rounded-2xl border px-3 py-2 text-xs",
            isMine
              ? "border-white/20 bg-white/10 text-white/90"
              : "border-gray-200 bg-canvas text-ink dark:border-gray-700"
          )}
        >
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold">
              {activeReactionGroup.emoji} {t("reactionsViewers")}
            </span>
            <button
              type="button"
              onClick={() => onReact?.(message, activeReactionGroup.emoji)}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] font-semibold transition",
                isMine
                  ? "border-white/20 hover:bg-white/10"
                  : "border-gray-200 hover:bg-subtle dark:border-gray-700"
              )}
            >
              <SmilePlus className="h-3.5 w-3.5" />
              {activeReactionGroup.users.some(
                (u) => String(u?._id || u) === String(currentUserId)
              )
                ? t("reactionRemove")
                : t("reactionAdd")}
            </button>
          </div>
          <div className="mt-2 space-y-1">
            {activeReactionGroup.users.length ? (
              activeReactionGroup.users.map((u, idx) => (
                <div
                  key={`${activeReactionGroup.emoji}-${u?._id || u}-${idx}`}
                  className={cn(
                    "truncate rounded-xl px-2 py-1",
                    isMine ? "bg-white/10" : "bg-subtle"
                  )}
                >
                  {u?.name || u?.email || String(u)}
                </div>
              ))
            ) : (
              <div className="text-muted">{t("reactionNoViewers")}</div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
