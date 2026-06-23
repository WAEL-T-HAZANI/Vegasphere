"use client";

/**
 * Standard dashboard page chrome: sticky header (title, description, actions) + main content area.
 */
import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/classNames";

const MAX_WIDTH = {
  "3xl": "max-w-3xl",
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  full: "max-w-none",
};

const HERO_MESH = {
  brand:
    "radial-gradient(720px 320px at 12% 0%, rgb(var(--vega-brand) / 0.22), transparent), radial-gradient(680px 280px at 88% 100%, rgb(var(--vega-accent-deep) / 0.12), transparent)",
};

export type DashboardPageLayoutProps = {
  variant?: "simple" | "hero";
  heroTint?: keyof typeof HERO_MESH;
  pageClassName?: string;
  title?: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  leading?: ReactNode;
  headerAside?: ReactNode;
  /** On narrow viewports, render headerAside above the title row (e.g. chat info back). */
  headerAsideMobileFirst?: boolean;
  headerExtra?: ReactNode;
  children: ReactNode;
  maxWidth?: keyof typeof MAX_WIDTH;
};

export default function DashboardPageLayout({
  variant = "simple",
  heroTint = "brand",
  pageClassName = "vs-settings-page",
  title,
  description,
  icon: Icon,
  leading,
  headerAside,
  headerAsideMobileFirst = false,
  headerExtra,
  children,
  maxWidth = "5xl",
}: DashboardPageLayoutProps) {
  const mw = MAX_WIDTH[maxWidth] || MAX_WIDTH["5xl"];
  const hero = variant === "hero";
  const mesh = HERO_MESH[heroTint] || HERO_MESH.brand;

  return (
    <div className={cn("flex min-h-full min-w-0 flex-1 flex-col bg-canvas text-ink", pageClassName)}>
      <header
        className={cn(
          "sticky top-0 z-30 border-b backdrop-blur-xl shadow-sm",
          hero
            ? "relative overflow-x-hidden border-brand-200/45 bg-surface/90 dark:border-brand-800/30 dark:bg-black/80"
            : "border-brand-200/45 bg-surface/88 dark:border-brand-800/30 dark:bg-black/80",
        )}
      >
        {hero ? (
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.68] dark:opacity-[0.36]"
            aria-hidden
            style={{ background: mesh }}
          />
        ) : null}
        <div
          className={cn(
            "relative z-[1] mx-auto w-full px-4 py-5 md:px-8 md:py-6",
            mw,
          )}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div
              className={cn(
                "flex min-w-0 items-start gap-3 text-start",
                headerAsideMobileFirst && headerAside && "order-2 sm:order-1",
              )}
            >
              {leading ? (
                <div className="shrink-0 pt-0.5">{leading}</div>
              ) : null}
              {Icon ? (
                <div className="vs-icon-tile flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm ring-1 ring-brand-700/5">
                  <Icon className="h-5 w-5" aria-hidden />
                </div>
              ) : null}
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-semibold tracking-tight text-ink dark:text-white">
                  {title}
                </h1>
                {description ? (
                  <p className="mt-2 max-w-2xl text-sm font-semibold leading-relaxed text-muted">
                    {description}
                  </p>
                ) : null}
              </div>
            </div>
            {headerAside ? (
              <div
                className={cn(
                  "flex shrink-0 flex-wrap items-center gap-2 sm:justify-end",
                  headerAsideMobileFirst &&
                    "order-1 w-full sm:order-2 sm:w-auto",
                )}
              >
                {headerAside}
              </div>
            ) : null}
          </div>
          {headerExtra ? (
            <div className="relative mt-5 md:mt-6">{headerExtra}</div>
          ) : null}
        </div>
      </header>
      <main
        className={cn(
          "mx-auto w-full flex-1 px-4 py-6 pb-24 md:px-8 md:py-8",
          mw,
        )}
      >
        {children}
      </main>
    </div>
  );
}

/** Shared class for clickable list rows on dashboard list pages (search, groups, channels). */
export function dashboardListLinkClass() {
  return cn(
    "block rounded-2xl border border-brand-200/45 bg-surface/85 p-4 shadow-sm outline-none transition backdrop-blur",
    "hover:border-brand-400/60 hover:bg-brand-50/45 hover:shadow-md dark:border-brand-800/30 dark:bg-brand-900/10 dark:hover:border-brand-700/60 dark:hover:bg-brand-900/20",
    "focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas dark:focus-visible:ring-offset-gray-950",
  );
}
