"use client";

import { useEffect, useRef } from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { api } from "@/lib/api";
import { setUser } from "@/store/slices/authSlice";
import { setNotificationPrefs } from "@/store/slices/uiSlice";
import { ensureWebPushSubscribed } from "@/lib/pushSubscribe";
import { primeCallRingtone } from "@/lib/callRingtone";
import { primeNotificationSound } from "@/lib/notificationSound";

/**
 * When logged in: request notification permission, subscribe to VAPID push,
 * and enable server-side background notifications (default on for every user).
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

        const sub = await ensureWebPushSubscribed();
        const granted = Notification.permission === "granted";

        dispatch(
          setNotificationPrefs({
            browserPush: granted,
            permissionAsked: Notification.permission !== "default",
            sound: user?.notificationRules?.sound !== false,
          }),
        );

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
  }, [dispatch, status, user?._id, user?.notificationRules?.sound]);

  return null;
}
