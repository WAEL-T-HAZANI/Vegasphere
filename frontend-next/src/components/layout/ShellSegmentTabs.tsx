"use client";

import type { LucideIcon } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/classNames";

export type ShellSegmentTab = {
  id: string;
  label: string;
  icon?: LucideIcon;
};

type ShellSegmentTabsProps = {
  tabs: ShellSegmentTab[];
  active: string;
  onChange: (_id: string) => void;
  className?: string;
  /** Stretch tabs evenly on narrow screens (default true). */
  stretch?: boolean;
  /** Optional prefix for `data-tour` hooks on tab buttons. */
  tourPrefix?: string;
};

type Indicator = { left: number; width: number };

export default function ShellSegmentTabs({
  tabs,
  active,
  onChange,
  className,
  stretch = true,
  tourPrefix,
}: ShellSegmentTabsProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const [indicator, setIndicator] = useState<Indicator>({ left: 0, width: 0 });

  const measure = useCallback(() => {
    const list = listRef.current;
    const btn = tabRefs.current.get(active);
    if (!list || !btn) return;
    const listRect = list.getBoundingClientRect();
    const btnRect = btn.getBoundingClientRect();
    setIndicator({
      left: btnRect.left - listRect.left + list.scrollLeft,
      width: btnRect.width,
    });
  }, [active]);

  useLayoutEffect(() => {
    measure();
  }, [measure, tabs]);

  useEffect(() => {
    measure();
    const list = listRef.current;
    if (!list) return undefined;
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    ro?.observe(list);
    window.addEventListener("resize", measure);
    list.addEventListener("scroll", measure, { passive: true });
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", measure);
      list.removeEventListener("scroll", measure);
    };
  }, [measure]);

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-orientation="horizontal"
      className={cn(
        "relative flex w-full min-h-[3rem] gap-1 overflow-x-auto rounded-2xl border border-brand-200/45 bg-surface p-1 shadow-sm ring-1 ring-brand-700/[0.03]",
        "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
        "dark:border-brand-800/30 dark:bg-brand-900/10 dark:shadow-sm dark:shadow-black/20 dark:ring-brand-900/20",
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-1 bottom-1 rounded-xl bg-brand-600 shadow-sm shadow-brand-600/20 transition-[left,width] duration-300 ease-out",
          "dark:bg-brand-800 dark:shadow-brand-950/30",
          indicator.width > 0 ? "opacity-100" : "opacity-0",
        )}
        style={{ left: indicator.left, width: indicator.width }}
      />
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = active === tab.id;
        return (
          <button
            key={tab.id}
            ref={(node) => {
              if (node) tabRefs.current.set(tab.id, node);
              else tabRefs.current.delete(tab.id);
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            data-tour={tourPrefix ? `${tourPrefix}-${tab.id}` : undefined}
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative z-[1] inline-flex h-11 min-h-[2.75rem] items-center justify-center gap-1.5 rounded-xl px-3 text-sm font-semibold leading-none transition-colors outline-none sm:px-4",
              stretch ? "min-w-0 flex-1 sm:flex-none" : "shrink-0",
              "focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-1 dark:focus-visible:ring-brand-700 dark:focus-visible:ring-offset-gray-950",
              isActive
                ? "text-white"
                : "text-muted hover:text-brand-700 dark:hover:text-[rgb(var(--vega-ink))]/80",
            )}
          >
            {Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden /> : null}
            <span className="truncate">{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}
