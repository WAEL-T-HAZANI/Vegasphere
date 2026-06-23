"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { logout } from "@/store/slices/authSlice";
import { api } from "@/lib/api";
import BrandMark from "@/components/brand/BrandMark";
import { cn } from "@/lib/classNames";
import {
  setSidebarOpen,
  setTheme,
  toggleSidebar,
} from "@/store/slices/uiSlice";
import FloatingNavigation, {
  FloatingNavLauncher,
} from "@/components/layout/FloatingNavigation";
import { Moon, Sun, LogOut } from "lucide-react";
import {
  shellAccountNav,
  shellMainNav,
  isShellNavActive,
} from "@/lib/shellNav";
import { prefetchShellRoutes } from "@/lib/prefetchShellRoutes";
import { useShellNavBadges } from "@/hooks/useShellNavBadges";
import ShellNavBadge, { formatShellBadgeCount } from "@/components/layout/ShellNavBadge";

const footerBtnBase =
  "group relative flex flex-col items-center justify-center gap-0.5 rounded-xl py-2.5 text-[11px] font-bold tracking-wide outline-none transition-all duration-200 focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:focus-visible:ring-offset-gray-950";

const footerBtnIdle =
  "text-muted hover:-translate-y-0.5 hover:bg-brand-50/80 hover:text-brand-700 hover:shadow-sm dark:hover:bg-brand-900/30 dark:hover:text-brand-200";

export default function AppShell({ children }) {
  const { t, i18n } = useTranslation();
  const pathname = usePathname();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const sidebarOpen = useAppSelector((s) => s.ui.sidebarOpen);
  const floatingNav = useAppSelector((s) => s.ui.floatingNav);
  const theme = useAppSelector((s) => s.ui.theme);
  const user = useAppSelector((s) => s.auth.user);
  const rtl = i18n.dir() === "rtl";
  const [isMobile, setIsMobile] = useState(false);
  const lang = (i18n.language || "en").toLowerCase();
  const isEnglish = !lang.startsWith("ar");
  const navBadges = useShellNavBadges();

  const signOut = async () => {
    try {
      await api.delete("/auth/sessions/current");
    } catch {
      /* ignore logout network/auth failures */
    } finally {
      dispatch(logout());
      router.push("/login");
    }
  };

  const toggleLanguage = () => {
    i18n.changeLanguage(isEnglish ? "ar" : "en");
  };

  const persistTheme = (next) => {
    try {
      localStorage.setItem("vegasphere-next-theme", next);
    } catch {}
    try {
      document.cookie = `vegasphere-next-theme=${encodeURIComponent(next)}; path=/; max-age=31536000; samesite=lax`;
    } catch {}
    dispatch(setTheme(next));
  };

  const toggleTheme = () => {
    persistTheme(theme === "dark" ? "light" : "dark");
  };

  // Auto-hide: after inactivity, tuck sidebar away; reveal on edge hover.
  const [autoHidden, setAutoHidden] = useState(false);
  const hideTimerRef = useRef(null);
  const sidebarHoverRef = useRef(false);

  useEffect(() => {
    prefetchShellRoutes(router);
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setIsMobile(Boolean(mq.matches));
    apply();
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    dispatch(setSidebarOpen(false));
    setAutoHidden(false);
  }, [dispatch, isMobile, pathname]);

  const scheduleAutoHide = useMemo(() => {
    return () => {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = window.setTimeout(() => {
        if (sidebarHoverRef.current) return;
        setAutoHidden(true);
        dispatch(setSidebarOpen(false));
      }, 10_000);
    };
  }, [dispatch]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    if (isMobile || floatingNav) return undefined;
    const onActivity = () => {
      if (autoHidden) setAutoHidden(false);
      scheduleAutoHide();
    };
    window.addEventListener("mousemove", onActivity, { passive: true });
    window.addEventListener("mousedown", onActivity, { passive: true });
    window.addEventListener("keydown", onActivity);
    window.addEventListener("scroll", onActivity, { passive: true });
    scheduleAutoHide();
    return () => {
      if (hideTimerRef.current) window.clearTimeout(hideTimerRef.current);
      window.removeEventListener("mousemove", onActivity);
      window.removeEventListener("mousedown", onActivity);
      window.removeEventListener("keydown", onActivity);
      window.removeEventListener("scroll", onActivity);
    };
  }, [autoHidden, floatingNav, isMobile, scheduleAutoHide]);

  const asideMotionStyle = useMemo(() => {
    const width = isMobile
      ? sidebarOpen
        ? 260
        : 0
      : autoHidden
        ? 0
        : sidebarOpen
          ? 260
          : 76;
    let tx = 0;
    if (isMobile) {
      if (!sidebarOpen) tx = rtl ? 260 : -260;
    } else if (autoHidden) {
      tx = rtl ? 260 : -260;
    }
    return {
      width,
      transform: `translate3d(${tx}px,0,0)`,
      transition:
        "width 0.28s cubic-bezier(0.22, 1, 0.36, 1), transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)",
    };
  }, [isMobile, sidebarOpen, autoHidden, rtl]);

  return (
    <div
      dir={rtl ? "rtl" : "ltr"}
      className="flex min-h-0 overflow-hidden bg-canvas text-ink h-[100svh] max-h-[100svh] md:h-dvh md:max-h-dvh"
    >
      {/* Edge hover target (RTL-aware): reveals sidebar when auto-hidden. */}
      <div
        className={cn(
          "fixed top-0 z-40 h-full w-3",
          rtl ? "right-0" : "left-0",
        )}
        style={{ display: isMobile || floatingNav ? "none" : undefined }}
        onMouseEnter={() => {
          setAutoHidden(false);
          dispatch(setSidebarOpen(true));
        }}
        aria-hidden
      />
      {/* Mobile backdrop for drawer */}
      {isMobile && sidebarOpen && !floatingNav ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40"
          aria-label="Close sidebar"
          onClick={() => dispatch(setSidebarOpen(false))}
        />
      ) : null}
      {!floatingNav ? (
      <aside
        dir={rtl ? "rtl" : "ltr"}
        style={asideMotionStyle}
        className={cn(
          "flex min-h-0 shrink-0 flex-col overflow-hidden border-brand-200/50 shadow-xl shadow-brand-900/5 dark:border-white/10 dark:shadow-black/30",
          rtl ? "border-l" : "border-r",
          "bg-surface/88 backdrop-blur-xl dark:bg-black/80",
          isMobile
            ? cn(
                "fixed top-0 z-50 h-[100svh] md:h-dvh",
                rtl ? "right-0" : "left-0",
              )
            : "relative h-full",
        )}
        onMouseEnter={() => {
          if (isMobile) return;
          sidebarHoverRef.current = true;
          setAutoHidden(false);
          scheduleAutoHide();
        }}
        onMouseLeave={() => {
          if (isMobile) return;
          sidebarHoverRef.current = false;
          scheduleAutoHide();
        }}
      >
        <div className="flex h-14 shrink-0 items-center justify-center border-b border-brand-200/45 px-2 dark:border-white/10">
          <button
            type="button"
            onClick={() => {
              setAutoHidden(false);
              dispatch(toggleSidebar());
              scheduleAutoHide();
            }}
            className="rounded-2xl p-1 transition-transform duration-200 hover:scale-105 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:focus-visible:ring-offset-gray-950"
            aria-label={t("toggleSidebar")}
          >
            <BrandMark
              variant="vega"
              className={cn(
                "h-9 w-9 transition-[width,height] duration-200",
                sidebarOpen ? "h-10 w-10" : "h-9 w-9",
              )}
            />
          </button>
        </div>
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden p-2">
          <nav className="flex flex-col gap-1">
            {shellMainNav.map((item) => {
              const active = isShellNavActive(pathname, item.href);
              const Icon = item.Icon;
              const badgeCount = navBadges[item.href] || 0;
              const badgeLabel = formatShellBadgeCount(badgeCount);
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  title={t(item.key)}
                  aria-label={
                    badgeLabel ? `${t(item.key)} (${badgeLabel})` : t(item.key)
                  }
                  data-tour={`shell-nav${item.href.replace(/\//g, "-")}`}
                  onClick={() => {
                    if (isMobile) dispatch(setSidebarOpen(false));
                  }}
                  className={cn(
                    "relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-semibold transition-all outline-none",
                    sidebarOpen ? "justify-start" : "justify-center",
                    active
                      ? "bg-brand-600 text-white shadow-md shadow-brand-600/20 dark:bg-gradient-to-br dark:from-brand-700 dark:via-brand-800 dark:to-red-900 dark:text-white dark:shadow-red-950/30"
                      : "text-muted hover:bg-brand-50/70 hover:text-brand-700 dark:hover:bg-brand-900/30 dark:hover:text-brand-200",
                    "focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:focus-visible:ring-offset-gray-950",
                  )}
                >
                  <span className="relative shrink-0">
                    <Icon className="h-5 w-5" aria-hidden />
                    {!sidebarOpen ? (
                      <ShellNavBadge
                        count={badgeCount}
                        compact
                        className="absolute -end-2 -top-2"
                      />
                    ) : null}
                  </span>
                  {sidebarOpen ? (
                    <>
                      <span className="min-w-0 flex-1 truncate">{t(item.key)}</span>
                      <ShellNavBadge count={badgeCount} />
                    </>
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="my-2 h-px bg-brand-200/50 dark:bg-white/10" />

          <nav className="flex flex-col gap-1">
            {shellAccountNav.map((item) => {
              const active = isShellNavActive(pathname, item.href);
              const Icon = item.Icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={t(item.key)}
                  data-tour={`shell-nav${item.href.replace(/\//g, "-")}`}
                  onClick={() => {
                    if (isMobile) dispatch(setSidebarOpen(false));
                  }}
                  className={cn(
                    "flex items-center gap-3 rounded-2xl px-3 py-2 text-sm font-semibold transition-all outline-none",
                    sidebarOpen ? "justify-start" : "justify-center",
                    active
                      ? "bg-brand-600 text-white shadow-md shadow-brand-600/20 dark:bg-gradient-to-br dark:from-brand-700 dark:via-brand-800 dark:to-red-900 dark:text-white dark:shadow-red-950/30"
                      : "text-muted hover:bg-brand-50/70 hover:text-brand-700 dark:hover:bg-brand-900/30 dark:hover:text-brand-200",
                    "focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:focus-visible:ring-offset-gray-950",
                  )}
                >
                  <Icon className="h-5 w-5 shrink-0" aria-hidden />
                  {sidebarOpen ? (
                    <span className="min-w-0 truncate">{t(item.key)}</span>
                  ) : null}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="shrink-0 border-t border-brand-200/50 px-2 py-3 dark:border-white/10">
          <div
            dir="ltr"
            className={cn(
              "flex flex-row items-stretch gap-1.5",
              rtl && "flex-row-reverse",
            )}
          >
            <button
              type="button"
              aria-label={t("language")}
              onClick={toggleLanguage}
              className={cn(footerBtnBase, footerBtnIdle, "min-w-0 flex-1")}
            >
              <span className="relative z-[1] transition-transform duration-300 group-hover:scale-110">
                {isEnglish ? "EN" : "AR"}
              </span>
            </button>
            <button
              type="button"
              aria-label={t("themeToggle")}
              onClick={toggleTheme}
              className={cn(footerBtnBase, footerBtnIdle, "min-w-0 flex-1")}
            >
              {theme === "dark" ? (
                <Moon className="relative z-[1] h-4 w-4 transition-transform duration-300 group-hover:rotate-12" />
              ) : (
                <Sun className="relative z-[1] h-4 w-4 transition-transform duration-300 group-hover:rotate-45" />
              )}
            </button>
            {user?._id ? (
              <button
                type="button"
                aria-label={t("navLogout")}
                onClick={signOut}
                className={cn(
                  footerBtnBase,
                  "min-w-0 flex-1 text-red-600 hover:-translate-y-0.5 hover:bg-red-50 hover:text-red-700 hover:shadow-sm dark:text-red-400 dark:hover:bg-red-950/40 dark:hover:text-red-300",
                )}
              >
                <LogOut
                  className="relative z-[1] h-4 w-4 transition-transform duration-300 group-hover:-translate-x-0.5"
                  aria-hidden
                />
              </button>
            ) : (
              <span className="min-w-0 flex-1 rounded-xl" aria-hidden />
            )}
          </div>
        </div>
      </aside>
      ) : null}
      <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile top control row (keeps sidebar trigger near content, not floating above it). */}
        {!floatingNav ? (
        <div className="sticky top-0 z-20 shrink-0 border-b border-brand-200/45 bg-canvas/85 px-3 py-2 backdrop-blur-md dark:border-white/10 md:hidden">
          <div className="flex items-center justify-center">
            <button
              type="button"
              onClick={() => {
                setAutoHidden(false);
                dispatch(setSidebarOpen(true));
              }}
              className="inline-flex items-center rounded-2xl bg-surface/85 p-1.5 shadow-sm ring-1 ring-brand-200/50 transition hover:bg-brand-50/70 dark:bg-white/[0.03] dark:ring-white/10 dark:hover:bg-brand-900/25"
              aria-label={t("openSidebar")}
            >
              <BrandMark variant="vega" className="h-8 w-8" />
            </button>
          </div>
        </div>
        ) : null}
        <div
          className="vs-shell-page flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden"
          onClickCapture={() => {
            if (isMobile && sidebarOpen) dispatch(setSidebarOpen(false));
          }}
        >
          {children}
        </div>
      </main>
      <FloatingNavLauncher />
      <FloatingNavigation />
    </div>
  );
}
