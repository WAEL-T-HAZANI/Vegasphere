"use client";

import { useEffect, useRef } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/classNames";
import { isSearchQueryLongEnough } from "@/lib/searchQuery";
import HorizontalScrollRail from "@/components/ui/HorizontalScrollRail";

export const CHAT_LIST_FILTERS = [
  { id: "all", labelKey: "chatListFilterAll" },
  { id: "online", labelKey: "chatListFilterOnline" },
  { id: "group", labelKey: "chatListFilterGroups" },
  { id: "channel", labelKey: "chatListFilterChannels" },
  { id: "unread", labelKey: "chatListFilterUnread" },
  { id: "drafts", labelKey: "chatListFilterDrafts" },
  { id: "muted", labelKey: "chatListFilterMuted" },
];

const FILTER_ACTIVE =
  "bg-brand-600 text-white shadow-sm shadow-brand-500/25 ring-1 ring-brand-500/35 dark:bg-gradient-to-br dark:from-brand-700 dark:via-brand-800 dark:to-red-900 dark:text-white dark:shadow-red-950/45 dark:ring-red-900/40";

const FILTER_IDLE =
  "text-muted hover:bg-brand-50/90 hover:text-brand-800 dark:text-brand-100/70 dark:hover:bg-gradient-to-br dark:hover:from-brand-900/35 dark:hover:to-red-950/22 dark:hover:text-white";

const FILTER_ROW = "flex min-w-0 gap-2 py-0.5";

const FILTER_ROW_SCROLL =
  "overflow-x-auto scroll-smooth snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

function isChipVisibleInScroller(scroller, chip) {
  const scrollerRect = scroller.getBoundingClientRect();
  const chipRect = chip.getBoundingClientRect();
  const style = getComputedStyle(scroller);
  const padStart = parseFloat(style.paddingInlineStart) || 0;
  const padEnd = parseFloat(style.paddingInlineEnd) || 0;
  const isRtl = style.direction === "rtl";

  const visibleStart = isRtl
    ? scrollerRect.left + padEnd
    : scrollerRect.left + padStart;
  const visibleEnd = isRtl
    ? scrollerRect.right - padStart
    : scrollerRect.right - padEnd;

  return (
    chipRect.left >= visibleStart - 1 && chipRect.right <= visibleEnd + 1
  );
}

export default function ChatsInboxToolbar({
  t,
  rtl = false,
  compact = false,
  q,
  setQ,
  listFilter,
  setListFilter,
}) {
  const searchActive = isSearchQueryLongEnough(q);
  const tabRefs = useRef(new Map());
  const listRef = useRef(null);

  useEffect(() => {
    const btn = tabRefs.current.get(listFilter);
    const list = listRef.current;
    if (!btn || !list) return;

    if (isChipVisibleInScroller(list, btn)) return;

    btn.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
  }, [listFilter, rtl]);

  return (
    <div
      dir={rtl ? "rtl" : "ltr"}
      className={cn(
        "flex min-w-0 flex-col gap-2.5",
        compact ? "px-3 pt-3" : "min-w-0 px-0",
      )}
    >
      <div className="relative min-w-0">
        <Search
          className={cn(
            "pointer-events-none absolute top-1/2 h-4 w-4 -translate-y-1/2 text-muted start-3",
          )}
          aria-hidden
        />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("navSearch")}
          dir={rtl ? "rtl" : "ltr"}
          aria-label={t("navSearch")}
          className={cn(
            "vs-input w-full min-h-10 border-brand-200/55 py-2 text-sm dark:border-brand-800/50 dark:bg-black/30",
            "px-9",
            q.trim() && "pe-10",
            searchActive && "border-brand-400/70 ring-1 ring-brand-500/20 dark:border-brand-600/60",
          )}
        />
        {q.trim() ? (
          <button
            type="button"
            onClick={() => setQ("")}
            className={cn(
              "absolute top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-muted transition hover:bg-brand-50 hover:text-brand-800 dark:hover:bg-brand-800/40 dark:hover:text-white end-2",
            )}
            aria-label={t("chatInboxSearchClear")}
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>
      {!searchActive ? (
        <div
          className={cn(
            "relative min-w-0",
            !compact && "sm:w-fit sm:max-w-full",
          )}
        >
          <div
            ref={listRef}
            role="tablist"
            aria-label={t("navChats")}
            dir={rtl ? "rtl" : "ltr"}
            className={cn(
              FILTER_ROW,
              compact
                ? cn(
                    FILTER_ROW_SCROLL,
                    "w-full rounded-2xl border border-brand-200/50 bg-brand-50/40 p-1.5 dark:border-brand-800/55 dark:bg-black/35",
                  )
                : cn(
                    FILTER_ROW_SCROLL,
                    "max-sm:-mx-4 max-sm:px-4 max-sm:py-1 max-sm:bg-brand-50/40 max-sm:dark:bg-black/35",
                    "sm:w-fit sm:max-w-full sm:flex-wrap sm:gap-1.5 sm:overflow-visible sm:rounded-2xl sm:border sm:border-brand-200/50 sm:bg-brand-50/40 sm:p-1.5 sm:dark:border-brand-800/55 sm:dark:bg-black/35",
                  ),
            )}
          >
            {CHAT_LIST_FILTERS.map((p) => {
              const active = listFilter === p.id;
              return (
                <button
                  key={p.id}
                  ref={(node) => {
                    if (node) tabRefs.current.set(p.id, node);
                    else tabRefs.current.delete(p.id);
                  }}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setListFilter(p.id)}
                  className={cn(
                    "inline-flex shrink-0 snap-start items-center justify-center whitespace-nowrap font-semibold tracking-wide transition-all outline-none",
                    compact
                      ? "rounded-xl px-3 py-2 text-[11px] sm:text-xs"
                      : cn(
                          "h-8 rounded-full px-3.5 text-xs",
                          "sm:h-auto sm:rounded-xl sm:px-3 sm:py-2 sm:text-xs",
                        ),
                    active
                      ? cn(FILTER_ACTIVE, !compact && "max-sm:border max-sm:border-transparent")
                      : cn(
                          FILTER_IDLE,
                          !compact &&
                            "max-sm:border max-sm:border-brand-300/70 max-sm:bg-surface/80 max-sm:hover:border-brand-400/80 dark:max-sm:border-brand-700/55 dark:max-sm:bg-black/30 dark:max-sm:hover:border-brand-600/70",
                        ),
                    "focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-1 dark:focus-visible:ring-brand-600 dark:focus-visible:ring-offset-black",
                  )}
                >
                  {t(p.labelKey)}
                </button>
              );
            })}
          </div>
          {!compact ? (
            <HorizontalScrollRail
              listRef={listRef}
              rtl={rtl}
              ariaLabel={t("chatListFilterScroll")}
              className="mt-1.5 px-4 sm:hidden"
              hideFrom="sm"
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
