"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import DashboardShellLoading from "@/components/layout/DashboardShellLoading";

/** Only show a loader if navigation is still in flight after this delay. */
const SHOW_AFTER_MS = 120;

function isInternalAppHref(href: string, pathname: string) {
  if (!href || href.startsWith("#")) return false;
  if (href.startsWith("mailto:") || href.startsWith("tel:")) return false;
  try {
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) return false;
    if (url.pathname === pathname && !url.search) return false;
    return url.pathname.startsWith("/");
  } catch {
    return href.startsWith("/");
  }
}

type ShellRouteTransitionProps = {
  children: ReactNode;
};

/**
 * Optional delayed overlay for slow client navigations only.
 * Fast tab switches show the next page immediately (no forced wait).
 */
export default function ShellRouteTransition({ children }: ShellRouteTransitionProps) {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const showTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathnameRef = useRef(pathname);

  const clearShowTimer = useCallback(() => {
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    pathnameRef.current = pathname;
    clearShowTimer();
    setVisible(false);
  }, [pathname, clearShowTimer]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as Element | null)?.closest?.("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target === "_blank" || anchor.download) return;
      const href = anchor.getAttribute("href");
      if (!href || !isInternalAppHref(href, pathnameRef.current)) return;
      clearShowTimer();
      showTimerRef.current = setTimeout(() => setVisible(true), SHOW_AFTER_MS);
    };

    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      clearShowTimer();
    };
  }, [clearShowTimer]);

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
      {children}
      {visible ? <DashboardShellLoading overlay /> : null}
    </div>
  );
}
