"use client";

import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch } from "@/store/hooks";
import { api } from "@/lib/api";
import { formatApiError } from "@/lib/apiError";
import { showAppToast } from "@/lib/appToast";
import { setSearchQuery, setSearchResults } from "@/store/slices/chatSlice";

export function useChatSearch({
  conversationId,
  onResultSelect,
}) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [searchBusy, setSearchBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [searchUiOpen, setSearchUiOpen] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);

  const runSearch = useCallback(async () => {
    const q = String(search || "").trim();
    if (!q || !conversationId) return;
    setSearchBusy(true);
    try {
      const { data } = await api.get("/message/search", {
        params: { q, conversationId },
      });
      const results = Array.isArray(data) ? data : [];
      dispatch(setSearchQuery(q));
      dispatch(setSearchResults(results));
      setActiveSearchIndex(0);
      if (results[0]) {
        requestAnimationFrame(() => onResultSelect?.(results[0]));
      }
    } catch (e) {
      dispatch(setSearchResults([]));
      showAppToast({
        id: `search-fail-${Date.now()}`,
        conversationId: String(conversationId),
        body: formatApiError(e, t, "errorOccurred"),
      });
    } finally {
      setSearchBusy(false);
    }
  }, [search, conversationId, dispatch, onResultSelect, t]);

  const resetSearch = useCallback(() => {
    setSearch("");
    dispatch(setSearchQuery(""));
    dispatch(setSearchResults([]));
    setActiveSearchIndex(0);
  }, [dispatch]);

  const stepSearchResult = useCallback(
    (direction, searchResults) => {
      if (!searchResults?.length) return;
      const total = searchResults.length;
      setActiveSearchIndex((prev) => {
        const nextIndex = (prev + direction + total) % total;
        onResultSelect?.(searchResults[nextIndex]);
        return nextIndex;
      });
    },
    [onResultSelect],
  );

  const toggleSearchUi = useCallback(
    (searchInputRef) => {
      setSearchUiOpen((v) => {
        const next = !v;
        if (next) {
          try {
            setTimeout(() => searchInputRef?.current?.focus?.(), 0);
          } catch {}
        } else {
          setSearch("");
          dispatch(setSearchQuery(""));
          dispatch(setSearchResults([]));
          setActiveSearchIndex(0);
        }
        return next;
      });
    },
    [dispatch],
  );

  return {
    search,
    setSearch,
    searchUiOpen,
    searchBusy,
    setSearchUiOpen,
    activeSearchIndex,
    setActiveSearchIndex,
    runSearch,
    resetSearch,
    stepSearchResult,
    toggleSearchUi,
  };
}
