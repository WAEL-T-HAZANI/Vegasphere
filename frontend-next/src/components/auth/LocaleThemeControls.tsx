"use client";

import { Languages, Moon, Sun } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { setTheme } from "@/store/slices/uiSlice";
import { syncThemeFavicon } from "@/lib/documentHead";
import {
  DropdownPortal,
  DropdownRoot,
  DropdownTrigger,
  VegaDropdownContent,
  VegaDropdownItem,
} from "@/components/ui/VegaDropdownMenu";

/** Language + theme toggles on landing and auth layouts. */
export default function LocaleThemeControls() {
  const { t, i18n } = useTranslation();
  const dispatch = useAppDispatch();
  const theme = useAppSelector((s) => s.ui.theme);

  const rtl = i18n.dir() === "rtl";
  const menuAlign = rtl ? "start" : "end";

  const setAppTheme = (nextTheme: string) => {
    try {
      localStorage.setItem("vegasphere-next-theme", nextTheme);
    } catch {}

    try {
      document.cookie = `vegasphere-next-theme=${encodeURIComponent(
        nextTheme,
      )}; path=/; max-age=31536000; samesite=lax`;
    } catch {}

    document.documentElement.classList.toggle("dark", nextTheme === "dark");
    syncThemeFavicon(nextTheme === "dark");
    dispatch(setTheme(nextTheme));
  };

  const buttonClass =
    "vega-locale-btn inline-flex h-10 items-center gap-1.5 rounded-full border vega-hairline bg-[rgb(var(--vega-paper)/0.85)] px-3 text-[11px] font-semibold text-[rgb(var(--vega-ink))] outline-none transition hover:border-[rgb(var(--vega-brand)/0.45)] focus-visible:ring-2 focus-visible:ring-[rgb(var(--vega-brand)/0.4)] sm:h-11 sm:gap-2 sm:px-4 sm:text-xs";

  return (
    <div className="flex shrink-0 items-center gap-2">
      <DropdownRoot dir={rtl ? "rtl" : "ltr"}>
        <DropdownTrigger asChild>
          <button
            type="button"
            className={buttonClass}
            aria-label={t("themeToggle")}
          >
            {theme === "dark" ? (
              <Moon className="h-4 w-4 shrink-0" aria-hidden />
            ) : (
              <Sun className="h-4 w-4 shrink-0" aria-hidden />
            )}

            <span className="hidden sm:inline">
              {theme === "dark" ? t("themeDark") : t("themeLight")}
            </span>
          </button>
        </DropdownTrigger>

        <DropdownPortal>
          <VegaDropdownContent
            sideOffset={10}
            align={menuAlign}
            className="z-[100] min-w-36"
          >
            <VegaDropdownItem
              variant={theme === "light" ? "selected" : "default"}
              onSelect={() => setAppTheme("light")}
            >
              <Sun aria-hidden />
              {t("themeLight")}
            </VegaDropdownItem>

            <VegaDropdownItem
              variant={theme === "dark" ? "selected" : "default"}
              onSelect={() => setAppTheme("dark")}
            >
              <Moon aria-hidden />
              {t("themeDark")}
            </VegaDropdownItem>
          </VegaDropdownContent>
        </DropdownPortal>
      </DropdownRoot>

      <DropdownRoot dir={rtl ? "rtl" : "ltr"}>
        <DropdownTrigger asChild>
          <button
            type="button"
            className={buttonClass}
            aria-label={t("language")}
          >
            <Languages className="h-4 w-4 shrink-0" aria-hidden />
            <span className="hidden sm:inline">
              {(i18n.language || "en").toUpperCase()}
            </span>
          </button>
        </DropdownTrigger>

        <DropdownPortal>
          <VegaDropdownContent
            sideOffset={10}
            align={menuAlign}
            className="z-[100] min-w-36"
          >
            <VegaDropdownItem
              variant={i18n.language?.startsWith("en") ? "selected" : "default"}
              onSelect={() => i18n.changeLanguage("en")}
            >
              English
            </VegaDropdownItem>

            <VegaDropdownItem
              variant={i18n.language?.startsWith("ar") ? "selected" : "default"}
              onSelect={() => i18n.changeLanguage("ar")}
            >
              العربية
            </VegaDropdownItem>
          </VegaDropdownContent>
        </DropdownPortal>
      </DropdownRoot>
    </div>
  );
}
