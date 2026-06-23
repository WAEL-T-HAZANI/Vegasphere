"use client";

import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { cn } from "@/lib/classNames";

export default function ChatInChatSearchBar({
  rtl = false,
  t,
  search,
  onSearchChange,
  onSearchKeyDown,
  searchInputRef,
  searchBusy = false,
  globalSearchQuery,
  searchResults = [],
  activeSearchIndex = 0,
  stepSearchResult,
  resetSearch,
}) {
  const hasQuery = Boolean(String(globalSearchQuery || "").trim());
  const total = searchResults.length;
  const showNav = hasQuery || searchBusy;
  const PrevIcon = rtl ? ChevronRight : ChevronLeft;
  const NextIcon = rtl ? ChevronLeft : ChevronRight;

  return (
    <div
      className="border-b border-brand-200/45 bg-surface/92 px-3 py-1.5 backdrop-blur-sm dark:border-white/10 dark:bg-black/75"
      dir={rtl ? "rtl" : "ltr"}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <Search className="h-3.5 w-3.5 shrink-0 text-muted" aria-hidden />
        <input
          ref={searchInputRef}
          type="text"
          inputMode="search"
          enterKeyHint="search"
          value={search}
          onChange={onSearchChange}
          onKeyDown={onSearchKeyDown}
          placeholder={t("searchInChat")}
          dir={rtl ? "rtl" : "ltr"}
          className="min-w-0 flex-1 bg-transparent py-1 text-xs text-ink outline-none placeholder:text-muted"
        />
        {showNav ? (
          <div className="flex shrink-0 items-center gap-0.5">
            <span className="px-1 text-[10px] font-medium tabular-nums text-muted">
              {searchBusy
                ? "…"
                : total
                  ? t("searchInChatResultsCount", {
                      current: activeSearchIndex + 1,
                      total,
                    })
                  : t("searchInChatNoResults")}
            </span>
            <button
              type="button"
              disabled={!total || searchBusy}
              onClick={() => stepSearchResult?.(-1, searchResults)}
              className={cn(
                "inline-flex h-6 w-6 items-center justify-center rounded-lg text-brand-700 outline-none transition hover:bg-brand-50 focus-visible:ring-2 focus-visible:ring-brand-400 disabled:pointer-events-none disabled:opacity-35 vs-dark-brand-text-muted dark:hover:bg-gradient-to-br dark:hover:from-brand-900/30 dark:hover:to-red-950/20",
              )}
              title={t("searchPrev")}
              aria-label={t("searchPrev")}
            >
              <PrevIcon className="h-3.5 w-3.5" aria-hidden />
            </button>
            <button
              type="button"
              disabled={!total || searchBusy}
              onClick={() => stepSearchResult?.(1, searchResults)}
              className={cn(
                "inline-flex h-6 w-6 items-center justify-center rounded-lg text-brand-700 outline-none transition hover:bg-brand-50 focus-visible:ring-2 focus-visible:ring-brand-400 disabled:pointer-events-none disabled:opacity-35 vs-dark-brand-text-muted dark:hover:bg-gradient-to-br dark:hover:from-brand-900/30 dark:hover:to-red-950/20",
              )}
              title={t("searchNext")}
              aria-label={t("searchNext")}
            >
              <NextIcon className="h-3.5 w-3.5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={resetSearch}
              className="inline-flex h-6 w-6 items-center justify-center rounded-lg text-muted outline-none transition hover:bg-subtle focus-visible:ring-2 focus-visible:ring-brand-400"
              title={t("cancel")}
              aria-label={t("cancel")}
            >
              <X className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
