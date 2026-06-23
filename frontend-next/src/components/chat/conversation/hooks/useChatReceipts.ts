"use client";

import { useEffect, useRef } from "react";
import { api } from "@/lib/api";

export function useChatReceipts({
  messages,
  conversationId,
  userId,
  messageRefs,
  visibleMessageIds = [],
}) {
  const readMarkingRef = useRef(new Set());
  const deliveredMarkingRef = useRef(new Set());
  const visibleSetRef = useRef(new Set());

  useEffect(() => {
    visibleSetRef.current = new Set(
      (visibleMessageIds || []).map((id) => String(id)),
    );
  }, [visibleMessageIds]);

  useEffect(() => {
    if (!userId || !conversationId || typeof window === "undefined") return;
    const pending = [];
    for (const m of messages) {
      const messageId = String(m._id || "");
      if (!messageId) continue;
      if (String(m.senderId?._id || m.senderId) === String(userId)) continue;
      if (
        (m.deliveredTo || []).some(
          (row) => String(row.user?._id || row.user) === String(userId),
        )
      ) {
        continue;
      }
      if (deliveredMarkingRef.current.has(messageId)) continue;
      deliveredMarkingRef.current.add(messageId);
      pending.push(messageId);
    }
    if (!pending.length) return;
    api.post("/message/delivered", { messageIds: pending }).catch(() => {
      pending.forEach((id) => deliveredMarkingRef.current.delete(id));
    });
  }, [messages, conversationId, userId]);

  useEffect(() => {
    if (!userId || !conversationId || typeof window === "undefined") return;
    let cancelled = false;
    let timer = null;

    const flushVisibleReads = async () => {
      if (cancelled || document.hidden) return;
      const pending = [];
      const visibleSet = visibleSetRef.current;
      for (const m of messages) {
        const messageId = String(m._id || "");
        if (!messageId) continue;
        if (String(m.senderId?._id || m.senderId) === String(userId)) continue;
        if (
          (m.seenBy || []).some(
            (row) => String(row.user?._id || row.user) === String(userId),
          )
        ) {
          continue;
        }
        if (readMarkingRef.current.has(messageId)) continue;

        let isVisible = visibleSet.has(messageId);
        if (!isVisible) {
          const node = messageRefs.current[messageId];
          if (node) {
            const rect = node.getBoundingClientRect();
            const visibleHeight =
              Math.min(rect.bottom, window.innerHeight) -
              Math.max(rect.top, 0);
            const ratio = rect.height > 0 ? visibleHeight / rect.height : 0;
            isVisible = ratio >= 0.6;
          }
        }

        if (isVisible) {
          readMarkingRef.current.add(messageId);
          pending.push(messageId);
        }
      }
      if (!pending.length) return;
      try {
        await api.post("/message/read", {
          conversationId,
          messageIds: pending,
        });
      } catch {
        pending.forEach((id) => readMarkingRef.current.delete(id));
      }
    };

    const schedule = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        flushVisibleReads();
      }, 120);
    };

    const onVisibility = () => {
      if (!document.hidden) schedule();
    };

    schedule();
    window.addEventListener("scroll", schedule, true);
    window.addEventListener("resize", schedule);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      window.removeEventListener("scroll", schedule, true);
      window.removeEventListener("resize", schedule);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [messages, conversationId, userId, messageRefs, visibleMessageIds]);
}
