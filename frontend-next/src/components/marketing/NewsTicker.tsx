"use client";

import { useTranslation } from "react-i18next";
import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/classNames";

const TICKER_KEYS = [
  "navChats",
  "navCalls",
  "navStatus",
  "navAi",
] as const;

type NewsTickerProps = {
  className?: string;
  /** Edge-to-edge strip (landing header) */
  fullWidth?: boolean;
};

export default function NewsTicker({ className, fullWidth = false }: NewsTickerProps) {
  const { t, i18n } = useTranslation();
  const reduceMotion = useReducedMotion();
  const rtl = i18n.dir() === "rtl";

  const line = [...TICKER_KEYS, ...TICKER_KEYS]
    .map((key) => t(key))
    .join("   ◆   ");

  return (
    <div
      className={cn(
        "relative overflow-hidden border border-[rgb(var(--vega-brand)/0.3)] bg-[rgb(var(--vega-paper)/0.65)] backdrop-blur-sm",
        fullWidth
          ? "w-full rounded-none border-x-0"
          : "rounded-xl",
        className,
      )}
      aria-hidden
    >
      <div
        className={cn(
          "flex w-max whitespace-nowrap py-2 text-[9px] font-semibold text-[rgb(var(--vega-muted))] min-[390px]:py-2.5 min-[390px]:text-[10px] sm:text-[11px]",
          !rtl && "vega-latin-display",
          !reduceMotion && "animate-[vega-marquee_38s_linear_infinite]",
        )}
      >
        <span className="px-6 sm:px-8">{line}</span>
        <span className="px-6 sm:px-8">{line}</span>
      </div>
      {!fullWidth ? (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-[rgb(var(--vega-paper))] to-transparent sm:w-14" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-[rgb(var(--vega-paper))] to-transparent sm:w-14" />
        </>
      ) : (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[rgb(var(--vega-paper))] to-transparent sm:w-24" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[rgb(var(--vega-paper))] to-transparent sm:w-24" />
        </>
      )}
    </div>
  );
}
