"use client";

import { useEffect } from "react";
import { useAppSelector } from "@/store/hooks";
import { syncThemeFavicon } from "@/lib/documentHead";

/** Applies Redux theme to `document.documentElement` (dark class). */
export default function ThemeSynchronizer() {
  const theme = useAppSelector((s) => s.ui.theme);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isDark = theme === "dark";
    document.documentElement.classList.toggle("dark", isDark);
    syncThemeFavicon(isDark);
  }, [theme]);

  return null;
}
