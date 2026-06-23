"use client";

import { useEffect, useRef } from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import {
  setAiReplyTone,
  setFloatingNav,
  setNotificationPrefs,
  setSidebarOpen,
  setTheme,
} from "@/store/slices/uiSlice";
import { applyReduceMotionPref } from "@/lib/localPrefs";
import { AI_TONE_STORAGE_KEY, isAiReplyTone } from "@/lib/aiReplyTone";

const THEME_KEY = "vegasphere-next-theme";
const NOTIFY_KEY = "vegasphere-next-notify";
const FLOATING_NAV_KEY = "vegasphere-floating-nav";

/** Restores theme + notification prefs from localStorage on app start. */
export default function PreferencesLoader() {
  const dispatch = useAppDispatch();
  const theme = useAppSelector((s) => s.ui.theme);
  const floatingNav = useAppSelector((s) => s.ui.floatingNav);
  const aiReplyTone = useAppSelector((s) => s.ui.aiReplyTone);
  const prefs = useAppSelector((s) => s.ui.notificationPrefs);
  const hydratedRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem("vegasphere-nav-layout");

      const getCookie = (name) => {
        try {
          const parts = String(document.cookie || "").split("; ");
          for (const p of parts) {
            if (p.startsWith(`${name}=`)) {
              return decodeURIComponent(p.slice(name.length + 1));
            }
          }
          return null;
        } catch {
          return null;
        }
      };

      const t = localStorage.getItem(THEME_KEY) || getCookie(THEME_KEY);
      if (t === "system") {
        localStorage.setItem(THEME_KEY, "dark");
        dispatch(setTheme("dark"));
      } else if (t === "light" || t === "dark") {
        dispatch(setTheme(t));
      }
      const floatingRaw = localStorage.getItem(FLOATING_NAV_KEY);
      if (floatingRaw === "1" || floatingRaw === "true") {
        dispatch(setFloatingNav(true));
        dispatch(setSidebarOpen(false));
      }

      const toneRaw = localStorage.getItem(AI_TONE_STORAGE_KEY);
      if (toneRaw && isAiReplyTone(toneRaw)) {
        dispatch(setAiReplyTone(toneRaw));
      }

      const raw = localStorage.getItem(NOTIFY_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        dispatch(
          setNotificationPrefs({
            browserPush: Boolean(p.browserPush),
            sound: p.sound !== false,
            permissionAsked: Boolean(p.permissionAsked),
            doNotDisturb: Boolean(p.doNotDisturb),
            direct: p.direct !== false,
            groups: p.groups !== false,
            mentions: p.mentions !== false,
            callIncoming: p.callIncoming !== false,
            callReminders: p.callReminders !== false,
          }),
        );
      }
    } catch {}
    applyReduceMotionPref();
    hydratedRef.current = true;
  }, [dispatch]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hydratedRef.current) return;
    localStorage.setItem(THEME_KEY, theme);
    try {
      document.cookie = `${THEME_KEY}=${encodeURIComponent(theme)}; path=/; max-age=31536000; samesite=lax`;
    } catch {}
  }, [theme]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem(NOTIFY_KEY, JSON.stringify(prefs));
    } catch {}
  }, [prefs]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hydratedRef.current) return;
    try {
      localStorage.setItem(FLOATING_NAV_KEY, floatingNav ? "1" : "0");
    } catch {}
  }, [floatingNav]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!hydratedRef.current) return;
    try {
      localStorage.setItem(AI_TONE_STORAGE_KEY, aiReplyTone);
    } catch {}
  }, [aiReplyTone]);

  return null;
}
