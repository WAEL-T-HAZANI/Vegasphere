"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { searchClient } from "@/lib/clients";
import { formatApiError } from "@/lib/apiError";
import {
  isSearchQueryLongEnough,
  isSearchQueryTooShort,
} from "@/lib/searchQuery";
import {
  stripBotUsers,
  type GlobalSearchResult,
  type SearchConversationHit,
  type SearchMessageHit,
} from "@/lib/searchHub";
import type { User } from "@/types";
import type { TFunction } from "i18next";

type UseGlobalSearchOptions = {
  t: TFunction;
  debounceMs?: number;
};

export function useGlobalSearch({ t, debounceMs = 280 }: UseGlobalSearchOptions) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const focusUserId = String(searchParams.get("focusUserId") || "").trim();

  const [q, setQ] = useState(() => String(searchParams.get("q") || ""));
  const typingRef = useRef(false);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [conversations, setConversations] = useState<SearchConversationHit[]>([]);
  const [messages, setMessages] = useState<SearchMessageHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const trimmed = q.trim();
  const isSearching = isSearchQueryLongEnough(q);
  const isTooShort = isSearchQueryTooShort(q);

  useEffect(() => {
    const seg = String(searchParams.get("segment") || "").trim();
    const tab = searchParams.get("tab");
    if (!seg && !tab) return;
    const p = new URLSearchParams(searchParams.toString());
    p.delete("segment");
    p.delete("tab");
    const qs = p.toString();
    router.replace(qs ? `/search?${qs}` : "/search", { scroll: false });
  }, [router, searchParams]);

  useEffect(() => {
    if (typingRef.current) return;
    const qp = String(searchParams.get("q") || "");
    if (qp !== q) setQ(qp);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const setQuery = useCallback((value: string) => {
    typingRef.current = true;
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      typingRef.current = false;
    }, debounceMs + 120);
    setQ(value);
  }, [debounceMs]);

  const syncUrl = useCallback(
    (query: string) => {
      const nextQ = String(query || "").trim();
      const currentQ = String(searchParams.get("q") || "").trim();
      if (nextQ === currentQ) return;

      const p = new URLSearchParams(searchParams.toString());
      if (nextQ) p.set("q", nextQ);
      else p.delete("q");
      const qs = p.toString();
      router.replace(qs ? `/search?${qs}` : "/search", { scroll: false });
    },
    [router, searchParams],
  );

  const runSearch = useCallback(
    async (query: string) => {
      const s = String(query || "").trim();
      syncUrl(s);

      if (!isSearchQueryLongEnough(s)) {
        setUsers([]);
        setConversations([]);
        setMessages([]);
        setError("");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");
      try {
        const { data } = await searchClient.globalSearch(s);
        setUsers(stripBotUsers(data?.users));
        setConversations(Array.isArray(data?.conversations) ? data.conversations : []);
        setMessages(Array.isArray(data?.messages) ? data.messages : []);
      } catch (e) {
        setUsers([]);
        setConversations([]);
        setMessages([]);
        setError(formatApiError(e, t, "errorOccurred"));
      } finally {
        setLoading(false);
      }
    },
    [syncUrl, t],
  );

  useEffect(() => {
    const tmr = setTimeout(() => {
      void runSearch(q);
    }, debounceMs);
    return () => clearTimeout(tmr);
  }, [q, debounceMs, runSearch]);

  const clearQuery = useCallback(() => {
    typingRef.current = false;
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    setQ("");
    setError("");
  }, []);

  const removeUser = useCallback((userId: string) => {
    setUsers((prev) => prev.filter((u) => String(u._id) !== String(userId)));
  }, []);

  const result = useMemo<GlobalSearchResult>(
    () => ({ users, conversations, messages }),
    [users, conversations, messages],
  );

  return {
    q,
    setQ: setQuery,
    clearQuery,
    trimmed,
    isSearching,
    isTooShort,
    loading,
    error,
    setError,
    focusUserId,
    result,
    users,
    removeUser,
  };
}
