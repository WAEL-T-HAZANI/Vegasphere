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

function waitForSocketConnected(socket, timeoutMs = 8000) {
  if (!socket) return Promise.resolve(false);
  if (socket.connected) return Promise.resolve(true);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (ok) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.off("connect", onConnect);
      resolve(ok);
    };

    const onConnect = () => finish(true);
    const timer = setTimeout(() => finish(false), timeoutMs);

    socket.once("connect", onConnect);
    try {
      socket.connect();
    } catch {
      finish(false);
    }
  });
}

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

/** Emit signaling only after socket is connected (prevents lost offers). */
export async function emitWebRtcSignal(payload) {
  const event = OUT_EVENT_BY_TYPE[payload?.type];
  if (!event) return false;

  const socket = getSocket();
  if (!socket) return false;

  const connected = await waitForSocketConnected(socket);
  if (!connected) {
    console.warn("WebRTC signal dropped: socket not connected", payload?.type);
    return false;
  }

  socket.emit(event, payload);
  return true;
}
