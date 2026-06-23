"use client";

import { useEffect, useRef } from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { api } from "@/lib/api";
import { setUser } from "@/store/slices/authSlice";
import { setNotificationPrefs } from "@/store/slices/uiSlice";
import { subscribeToWebPush } from "@/lib/pushSubscribe";
import { primeCallRingtone } from "@/lib/callRingtone";
import { primeNotificationSound } from "@/lib/notificationSound";

/**
 * When logged in: request notification permission, subscribe to VAPID push,
 * and enable server-side push when away (once per session).
 */
export default function PushNotificationBootstrap() {
  const dispatch = useAppDispatch();
  const user = useAppSelector((s) => s.auth.user);
  const status = useAppSelector((s) => s.auth.status);
  const ranRef = useRef(false);

  useEffect(() => {
    if (status !== "authenticated" || !user?._id) return;
    if (ranRef.current) return;
    if (typeof window === "undefined") return;
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return;

    ranRef.current = true;

    (async () => {
      try {
        primeNotificationSound();
        primeCallRingtone();
        if (Notification.permission !== "granted") return;

        const sub = await subscribeToWebPush();
        if (!sub.ok || !sub.subscribed) return;

        await api.put("/user/update", { pushNotificationsEnabled: true });
        const { data } = await api.get("/auth/me");
        dispatch(setUser(data));
        dispatch(
          setNotificationPrefs({
            browserPush: true,
            permissionAsked: true,
            sound: data?.notificationRules?.sound !== false,
          }),
        );
      } catch {
        /* non-fatal */
      }
    })();
  }, [dispatch, status, user?._id]);

  return null;
}
