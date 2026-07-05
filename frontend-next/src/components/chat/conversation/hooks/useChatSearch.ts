"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useAppDispatch } from "@/store/hooks";
import { api } from "@/lib/api";
import { formatApiError } from "@/lib/apiError";
import { showAppToast } from "@/lib/appToast";
import {
  isSearchQueryLongEnough,
  mergeSearchResults,
  parseMessageSearchResponse,
  searchLoadedMessages,
} from "@/lib/searchQuery";
import { setSearchQuery, setSearchResults } from "@/store/slices/chatSlice";

const SEARCH_DEBOUNCE_MS = 320;

export function useChatSearch({
  conversationId,
  localMessages = [],
  decryptedById = {},
  onResultSelect,
}) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const [searchBusy, setSearchBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [searchUiOpen, setSearchUiOpen] = useState(false);
  const [activeSearchIndex, setActiveSearchIndex] = useState(0);
  const runIdRef = useRef(0);

  const runSearch = useCallback(
    async (overrideQuery) => {
      const q = String(overrideQuery ?? search ?? "").trim();
      if (!q || !conversationId) return;
      if (!isSearchQueryLongEnough(q)) {
        dispatch(setSearchQuery(""));
        dispatch(setSearchResults([]));
        setActiveSearchIndex(0);
        return;
      }

      const runId = ++runIdRef.current;
      setSearchBusy(true);
      try {
        let apiResults = [];
        try {
          const { data } = await api.get("/message/search", {
            params: { q, conversationId },
          });
          apiResults = parseMessageSearchResponse(data);
        } catch {
          apiResults = [];
        }

        if (runId !== runIdRef.current) return;

        const localResults = searchLoadedMessages(
          localMessages,
          q,
          decryptedById,
        );
        const results = mergeSearchResults(apiResults, localResults);

        dispatch(setSearchQuery(q));
        dispatch(setSearchResults(results));
        setActiveSearchIndex(0);
        if (results[0]) {
          requestAnimationFrame(() => onResultSelect?.(results[0]));
        }
      } catch (e) {
        if (runId !== runIdRef.current) return;
        dispatch(setSearchResults([]));
        showAppToast({
          id: `search-fail-${Date.now()}`,
          conversationId: String(conversationId),
          body: formatApiError(e, t, "errorOccurred"),
        });
      } finally {
        if (runId === runIdRef.current) setSearchBusy(false);
      }
    },
    [
      search,
      conversationId,
      localMessages,
      decryptedById,
      dispatch,
      onResultSelect,
      t,
    ],
  );

  useEffect(() => {
    const q = String(search || "").trim();
    if (!q) {
      dispatch(setSearchQuery(""));
      dispatch(setSearchResults([]));
      setActiveSearchIndex(0);
      return undefined;
    }
    if (!isSearchQueryLongEnough(q)) {
      dispatch(setSearchQuery(""));
      dispatch(setSearchResults([]));
      setActiveSearchIndex(0);
      return undefined;
    }

    const timer = setTimeout(() => {
      void runSearch(q);
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [search, conversationId, runSearch, dispatch]);

  const resetSearch = useCallback(() => {
    runIdRef.current += 1;
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
