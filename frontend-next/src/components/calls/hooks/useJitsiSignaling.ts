// @ts-nocheck
"use client";

import { useEffect } from "react";
import { getSocket } from "@/lib/socket";

const OUT_EVENT_BY_TYPE = {
  "call-user": "call:user",
  "call-accepted": "call:accepted",
  "call-rejected": "call:rejected",
  "call-ended": "call:ended",
  "call-busy": "call:busy",
};

const IN_TYPE_BY_EVENT = {
  "call:user": "call-user",
  "call:accepted": "call-accepted",
  "call:rejected": "call-rejected",
  "call:ended": "call-ended",
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

export function useJitsiSignaling(onSignal) {
  useEffect(() => {
    const socket = getSocket();
    if (!socket || typeof onSignal !== "function") return;

    const handlers = Object.entries(IN_TYPE_BY_EVENT).map(([event, type]) => {
      const handler = (payload) => onSignal({ ...payload, type });
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

export async function emitJitsiSignal(payload) {
  const event = OUT_EVENT_BY_TYPE[payload?.type];
  const to = String(payload?.to || "").trim();
  if (!event || !to) return false;

  const socket = getSocket();
  if (!socket) return false;

  const connected = await waitForSocketConnected(socket);
  if (!connected) {
    console.warn("Call signal dropped: socket not connected", payload?.type);
    return false;
  }

  socket.emit(event, payload);
  return true;
}
