"use client";

import { useEffect } from "react";
import { useStore } from "react-redux";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import type { RootState } from "@/store";

import { api } from "@/lib/api";
import { getSocket } from "@/lib/socket";
import { setConversations, setSocketReady } from "@/store/slices/chatSlice";
import { attachSocketChatListeners } from "@/lib/socketChatListeners";
import { flushMessageOutbox } from "@/lib/chatCompose";
import { pullMessageSync } from "@/lib/messageSync";
import { playVegasphereNotifySound } from "@/lib/notificationSound";

export default function SocketBridge() {
  const dispatch = useAppDispatch();
  const store = useStore<RootState>();
  const status = useAppSelector((s) => s.auth.status);
  const userId = useAppSelector((s) => s.auth.user?._id);
  const token = useAppSelector((s) => s.auth.token);
  const activeConversationId = useAppSelector((s) => s.chat.activeConversationId);

  useEffect(() => {
    if (status !== "authenticated" || !token || !userId) return;

    const socket = getSocket();
    if (!socket) return;

    socket.auth = { ...(socket.auth || {}), token };
    if (!socket.connected) socket.connect();
    socket.emit("setup");
    dispatch(setSocketReady(true));

    return () => {
      dispatch(setSocketReady(false));
    };
  }, [dispatch, status, token, userId]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    return attachSocketChatListeners(socket, {
      dispatch,
      getState: () => store.getState(),
      userId,
    });
  }, [dispatch, store, userId]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || status !== "authenticated") return undefined;

    const onNotificationCreated = () => {
      const state = store.getState();
      const prefs = state.ui.notificationPrefs;
      const dnd = Boolean(prefs.doNotDisturb || state.auth.user?.doNotDisturb);
      if (prefs.sound !== false && !dnd) {
        playVegasphereNotifySound();
      }
    };

    socket.on("notification-created", onNotificationCreated);
    return () => {
      socket.off("notification-created", onNotificationCreated);
    };
  }, [status, store]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket || !token || status !== "authenticated") return;

    const onDisconnect = () => {
      dispatch(setSocketReady(false));
    };
    const onConnectError = () => {
      dispatch(setSocketReady(false));
    };
    const onConnect = () => {
      const uid =
        userId ||
        (typeof window !== "undefined" &&
          (() => {
            try {
              const raw = localStorage.getItem("user");
              const j = raw ? JSON.parse(raw) : null;
              return j?._id || null;
            } catch {
              return null;
            }
          })());
      socket.auth = {
        ...(socket.auth || {}),
        token:
          token ||
          (typeof window !== "undefined" ? localStorage.getItem("token") || "" : ""),
      };
      if (uid) socket.emit("setup");
      const activeCid =
        activeConversationId || store.getState()?.chat?.activeConversationId;
      if (activeCid && uid) {
        socket.emit("join-chat", { roomId: activeCid });
      }
      flushMessageOutbox(api);
      pullMessageSync(dispatch);
      api
        .get("/conversation/")
        .then(({ data }) => {
          dispatch(setConversations(data || []));
        })
        .catch(() => {
          /* ignore reconnect refresh errors */
        });
    };
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("connect", onConnect);
    if (socket.connected) onConnect();
    return () => {
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("connect", onConnect);
    };
  }, [token, userId, activeConversationId, store, dispatch, status]);

  return null;
}
