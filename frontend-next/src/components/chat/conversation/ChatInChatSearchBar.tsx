"use client";

import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { isSearchQueryLongEnough } from "@/lib/searchQuery";

export default function ChatInChatSearchBar({
  rtl = false,
  t,
  search,
  onSearchChange,
  onSearchKeyDown,
  searchInputRef,
  searchBusy = false,
  searchResults = [],
  activeSearchIndex = 0,
  stepSearchResult,
  resetSearch,
}) {
  const typed = String(search || "").trim();
  const hasQuery = Boolean(typed) && isSearchQueryLongEnough(typed);
  const total = searchResults.length;
  const showNav = hasQuery || searchBusy;
  const searchNavBtn =
    "inline-flex h-6 w-6 items-center justify-center rounded-lg text-brand-700 outline-none transition focus-visible:ring-2 focus-visible:ring-brand-400 disabled:pointer-events-none disabled:opacity-35 hover:bg-brand-50/90 hover:text-brand-800 dark:text-brand-200 dark:hover:bg-brand-900/45 dark:hover:text-white";
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
              className={searchNavBtn}
              title={t("searchPrev")}
              aria-label={t("searchPrev")}
            >
              <PrevIcon className="h-3.5 w-3.5" aria-hidden />
            </button>
            <button
              type="button"
              disabled={!total || searchBusy}
              onClick={() => stepSearchResult?.(1, searchResults)}
              className={searchNavBtn}
              title={t("searchNext")}
              aria-label={t("searchNext")}
            >
              <NextIcon className="h-3.5 w-3.5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={resetSearch}
              className={searchNavBtn}
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
