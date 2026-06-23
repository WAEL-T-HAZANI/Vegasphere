"use client";

import { useEffect } from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { authClient, conversationClient } from "@/lib/clients";
import { getSocket } from "@/lib/socket";
import {
  hydrateFromStorage,
  setUser,
  setAuthStatus,
  logout,
} from "@/store/slices/authSlice";
import { setConversations, setSocketReady } from "@/store/slices/chatSlice";
import { prefetchIceServers } from "@/lib/webrtcRtcConfig";
import { syncUserNotificationPrefs } from "@/lib/syncUserNotificationPrefs";

/** Loads token from storage, validates session, hydrates user + inbox. */
export default function SessionBootstrap() {
  const dispatch = useAppDispatch();
  const token = useAppSelector((s) => s.auth.token);

  useEffect(() => {
    dispatch(hydrateFromStorage());
  }, [dispatch]);

  useEffect(() => {
    const effective =
      token ||
      (typeof window !== "undefined" && localStorage.getItem("token"));
    if (!effective) {
      const socket = getSocket();
      if (socket) {
        socket.auth = {};
        if (socket.connected) socket.disconnect();
      }
      dispatch(setSocketReady(false));
      dispatch(setAuthStatus("anonymous"));
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        dispatch(setAuthStatus("loading"));
        const [meRes, convRes] = await Promise.all([
          authClient.getMe(),
          conversationClient.listConversations(),
        ]);
        if (cancelled) return;
        const data = meRes.data;
        dispatch(setUser(data));
        syncUserNotificationPrefs(data, dispatch);
        dispatch(setAuthStatus("authenticated"));
        dispatch(setConversations(convRes.data || []));
        prefetchIceServers().catch(() => {});

        const socket = getSocket();
        if (socket && data?._id) {
          socket.auth = { ...(socket.auth || {}), token: effective };
          if (!socket.connected) socket.connect();
          socket.emit("setup");
          dispatch(setSocketReady(true));
        }
      } catch {
        if (!cancelled) {
          const socket = getSocket();
          if (socket) {
            socket.auth = {};
            if (socket.connected) socket.disconnect();
          }
          dispatch(setSocketReady(false));
          dispatch(logout());
          dispatch(setAuthStatus("anonymous"));
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [dispatch, token]);

  return null;
}
