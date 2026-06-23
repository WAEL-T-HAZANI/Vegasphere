"use client";

import { useEffect } from "react";
import { primeCallRingtone, isCallRingtoneUnlocked } from "@/lib/callRingtone";
import {
  playVegasphereNotifySound,
  primeNotificationSound,
} from "@/lib/notificationSound";
import { registerAppServiceWorker } from "@/lib/serviceWorkerRegister";

export default function ServiceWorkerSetup() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const onMessage = (ev: MessageEvent) => {
      if (ev.data?.type === "vega-play-notify-sound") {
        playVegasphereNotifySound();
      }
    };

    registerAppServiceWorker();
    navigator.serviceWorker.addEventListener("message", onMessage);

    const primeOnGesture = () => {
      primeNotificationSound();
      primeCallRingtone();
      if (isCallRingtoneUnlocked()) {
        window.removeEventListener("pointerdown", primeOnGesture);
        window.removeEventListener("keydown", primeOnGesture);
      }
    };
    window.addEventListener("pointerdown", primeOnGesture);
    window.addEventListener("keydown", primeOnGesture);

    return () => {
      navigator.serviceWorker.removeEventListener("message", onMessage);
    };
  }, []);

  return null;
}
