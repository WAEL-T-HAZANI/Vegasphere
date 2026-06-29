// @ts-nocheck

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { api } from "@/lib/api";
import {
  setActiveConversation,
  setMessagesForConversation,
  prependOlderMessages,
  patchConversationInList,
  clearTypingForConversation,
  clearLocalUnread,
} from "@/store/slices/chatSlice";

export function useConversationMessages({
  cid,
  conversationId,
  userId,
  activeConv,
  conversations,
}) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const cachedMessages = useAppSelector(
    (s) => s.chat.messagesByConversation?.[cid] || [],
  );
  const [hasMoreOlder, setHasMoreOlder] = useState(false);
  const oldestSeqRef = useRef(null);
  const oldestIdRef = useRef(null);
  const loadingOlderRef = useRef(false);
  const convHydratedRef = useRef(false);
  const [threadLoading, setThreadLoading] = useState(false);

  const reloadThread = useCallback(async () => {
    if (!userId || !conversationId) return;
    const { data } = await api.get(`/message/${conversationId}/${userId}`, {
      params: { limit: 40 },
    });
    const payload = Array.isArray(data)
      ? { messages: data, hasMore: false }
      : data;
    const list = Array.isArray(payload.messages) ? payload.messages : [];
    dispatch(
      setMessagesForConversation({
        conversationId: cid,
        messages: list,
      }),
    );
    setHasMoreOlder(Boolean(payload.hasMore));
    oldestIdRef.current = list.length > 0 ? String(list[0]._id) : null;
    oldestSeqRef.current =
      list.length > 0 && list[0]?.seq != null ? Number(list[0].seq) : null;
  }, [userId, conversationId, dispatch, cid]);

  const loadOlder = useCallback(async () => {
    if (!userId || !conversationId || !hasMoreOlder) return;
    if (loadingOlderRef.current) return;
    if (!oldestSeqRef.current && !oldestIdRef.current) return;
    loadingOlderRef.current = true;
    try {
      const params = { limit: 40 };
      if (oldestSeqRef.current) params.beforeSeq = oldestSeqRef.current;
      else if (oldestIdRef.current) params.before = oldestIdRef.current;

      const { data } = await api.get(`/message/${conversationId}/${userId}`, {
        params,
      });
      const payload = Array.isArray(data)
        ? { messages: data, hasMore: false }
        : data;
      const older = Array.isArray(payload.messages) ? payload.messages : [];
      if (older.length) {
        dispatch(
          prependOlderMessages({ conversationId: cid, messages: older }),
        );
        oldestIdRef.current = String(older[0]._id);
        oldestSeqRef.current =
          older[0]?.seq != null ? Number(older[0].seq) : null;
        setHasMoreOlder(Boolean(payload.hasMore));
      } else {
        setHasMoreOlder(false);
      }
    } finally {
      loadingOlderRef.current = false;
    }
  }, [userId, conversationId, hasMoreOlder, dispatch, cid]);

  useEffect(() => {
    dispatch(setActiveConversation(cid));
    dispatch(clearLocalUnread(cid));
    return () => {
      dispatch(setActiveConversation(null));
      dispatch(clearTypingForConversation(cid));
    };
  }, [cid, dispatch]);

  useEffect(() => {
    if (!userId || !conversationId) return;
    convHydratedRef.current = false;
    let cancelled = false;
    const hasCached = Array.isArray(cachedMessages) && cachedMessages.length > 0;
    if (!hasCached) setThreadLoading(true);
    (async () => {
      try {
        await reloadThread();
        if (cancelled) return;
      } catch {
        if (!cancelled) router.push("/chats");
      } finally {
        if (!cancelled) setThreadLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [conversationId, userId, router, reloadThread, cachedMessages.length]);

  useEffect(() => {
    if (!userId || !cid) return undefined;
    convHydratedRef.current = false;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await api.get(`/conversation/${cid}`);
        if (cancelled || !data?._id) return;
        convHydratedRef.current = true;
        dispatch(patchConversationInList(data));
      } catch {
        /* thread loader handles invalid conversations */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, cid, dispatch]);

  return {
    hasMoreOlder,
    loadOlder,
    reloadThread,
    oldestIdRef,
    loadingOlderRef,
    threadLoading,
  };
}
