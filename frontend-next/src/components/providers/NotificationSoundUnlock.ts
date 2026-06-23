"use client";

import { useEffect } from "react";
import { primeCallRingtone } from "@/lib/callRingtone";
import {
  isNotificationSoundUnlocked,
  primeNotificationSound,
} from "@/lib/notificationSound";

export default function NotificationSoundUnlock() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const primeAudio = () => {
      primeNotificationSound();
      primeCallRingtone();
      if (isNotificationSoundUnlocked()) {
        window.removeEventListener("pointerdown", primeAudio);
        window.removeEventListener("keydown", primeAudio);
      }
    };

    window.addEventListener("pointerdown", primeAudio);
    window.addEventListener("keydown", primeAudio);

    return () => {
      window.removeEventListener("pointerdown", primeAudio);
      window.removeEventListener("keydown", primeAudio);
    };
  }, []);

  return null;
}
