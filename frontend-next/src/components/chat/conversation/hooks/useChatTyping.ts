"use client";

import { useCallback, useEffect, useRef } from "react";
import { getSocket } from "@/lib/socket";

const TYPING_EMIT_MIN_MS = 750;
const STOP_TYPING_AFTER_MS = 2000;

export function useChatTyping({ conversationId, userId, userName, enabled = true }) {
  const typingEmitAtRef = useRef(0);
  const stopTypingTimerRef = useRef(null);

  const bumpTyping = useCallback(() => {
    if (!enabled) return;
    const socket = getSocket();
    if (!socket || !userId || !conversationId) return;
    const now = Date.now();
    if (now - typingEmitAtRef.current >= TYPING_EMIT_MIN_MS) {
      typingEmitAtRef.current = now;
      socket.emit("typing", {
        conversationId,
        userId,
        userName,
      });
    }
    if (stopTypingTimerRef.current) clearTimeout(stopTypingTimerRef.current);
    stopTypingTimerRef.current = setTimeout(() => {
      stopTypingTimerRef.current = null;
      socket.emit("stop-typing", {
        conversationId,
        userId,
        userName,
      });
    }, STOP_TYPING_AFTER_MS);
  }, [conversationId, userId, userName, enabled]);

  useEffect(
    () => () => {
      if (stopTypingTimerRef.current) clearTimeout(stopTypingTimerRef.current);
    },
    [],
  );

  return { bumpTyping };
}
