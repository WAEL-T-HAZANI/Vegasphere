"use client";

import { cn } from "@/lib/classNames";

export default function MessagePoll({
  poll,
  isMine,
  totalPollVotes,
  selectedPollOptionIds,
  onVote,
  message,
  t,
}) {
  if (!poll?.question || !poll?.options?.length) return null;

  return (
    <div
      className={cn(
        "mb-1 rounded-2xl border px-3 py-3",
        isMine
          ? "border-white/15 bg-white/10"
          : "border-gray-200 bg-black/[0.03] dark:border-gray-700 dark:bg-white/[0.03]"
      )}
    >
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-[0.22em] opacity-75">
        {t("pollLabel")}
      </div>
      <div className="text-sm font-semibold leading-relaxed">{poll.question}</div>
      <div className="mt-1 text-[11px] opacity-75">
        {poll.allowsMultiple ? t("pollMultiChoice") : t("pollSingleChoice")}
        {poll.closesAt
          ? ` · ${t("pollClosesAtLabel", {
              date: new Date(poll.closesAt).toLocaleString(),
            })}`
          : ""}
      </div>
      <div className="mt-3 space-y-2">
        {poll.options.map((option) => {
          const votes = Array.isArray(option?.voterIds) ? option.voterIds.length : 0;
          const percent = totalPollVotes ? Math.round((votes / totalPollVotes) * 100) : 0;
          const selected = selectedPollOptionIds.has(String(option.id));
          const closed =
            Boolean(poll.closesAt) && new Date(poll.closesAt).getTime() <= Date.now();
          return (
            <button
              key={option.id}
              type="button"
              disabled={closed}
              onClick={() => onVote?.(message, option.id)}
              className={cn(
                "relative block w-full overflow-hidden rounded-2xl border px-3 py-2 text-left transition",
                selected
                  ? isMine
                    ? "border-white/35 bg-white/14"
                    : "border-brand-400/50 bg-brand-500/10"
                  : isMine
                    ? "border-white/10 bg-white/5 hover:bg-white/10"
                    : "border-gray-200 bg-surface hover:bg-subtle dark:border-gray-700",
                closed && "cursor-default opacity-80"
              )}
            >
              <span
                className={cn(
                  "absolute inset-y-0 left-0 rounded-2xl",
                  isMine ? "bg-white/10" : "bg-brand-500/10"
                )}
                style={{ width: `${percent}%` }}
                aria-hidden
              />
              <span className="relative flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">
                    {option.text}
                  </span>
                  <span className="block text-[11px] opacity-75">
                    {t("pollVotesCount", { count: votes, percent })}
                  </span>
                </span>
                {selected ? (
                  <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold">
                    {t("pollVoted")}
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-2 text-[11px] opacity-75">
        {t("pollTotalVotes", { count: totalPollVotes })}
      </div>
    </div>
  );
}
