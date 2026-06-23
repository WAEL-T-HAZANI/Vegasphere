// @ts-nocheck
"use client";

import { useEffect } from "react";
import { getSocket } from "@/lib/socket";

/** Maps client signal types to backend Socket.io call events. */
const OUT_EVENT_BY_TYPE: Record<string, string> = {
  offer: "call:offer",
  answer: "call:answer",
  ice: "call:ice-candidate",
  "call-hangup": "call:hangup",
  "call-decline": "call:decline",
  "call-busy": "call:busy",
};

const IN_TYPE_BY_EVENT: Record<string, string> = {
  "call:offer": "offer",
  "call:answer": "answer",
  "call:ice-candidate": "ice",
  "call:hangup": "call-hangup",
  "call:decline": "call-decline",
  "call:busy": "call-busy",
};

export function useWebRtcSignaling(onSignal) {
  useEffect(() => {
    const socket = getSocket();
    if (!socket || typeof onSignal !== "function") return;

    const handlers = Object.entries(IN_TYPE_BY_EVENT).map(([event, type]) => {
      const handler = (payload) => {
        onSignal({ ...payload, type });
      };
      socket.on(event, handler);
      return { event, handler };
    });

    return () => {
      for (const { event, handler } of handlers) {
        socket.off(event, handler);
      }
    };
  }, [onSignal]);
}

export function emitWebRtcSignal(payload) {
  const event = OUT_EVENT_BY_TYPE[payload?.type];
  if (!event) return;
  getSocket()?.emit(event, payload);
}
