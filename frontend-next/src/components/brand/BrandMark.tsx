"use client";

import { cn } from "@/lib/classNames";

type BrandMarkProps = {
  className?: string;
  /** Marketing palette — gradient frame + serif V */
  variant?: "default" | "vega";
};

export default function BrandMark({
  className = "",
  variant = "default",
}: BrandMarkProps) {
  if (variant === "vega") {
    return (
      <span
        className={cn(
          "relative inline-flex aspect-square shrink-0 items-center justify-center rounded-2xl p-[2px]",
          className,
        )}
        style={{
          background: "rgb(var(--vega-brand))",
        }}
        aria-label="Vegasphere"
        title="Vegasphere"
        suppressHydrationWarning
      >
        <span className="flex h-full w-full items-center justify-center rounded-[calc(1rem-2px)] bg-[rgb(var(--vega-paper))]">
          <span
            className="vega-brand-serif select-none vega-brand-text text-[1.65em] leading-none"
            aria-hidden="true"
          >
            V
          </span>
        </span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-2xl",
        "border border-slate-200 bg-white text-slate-950 shadow-sm dark:border-white/10 dark:bg-[#080808] dark:text-white",
        className,
      )}
      aria-label="Vegasphere"
      title="Vegasphere"
      suppressHydrationWarning
    >
      <span
        className="vega-brand-serif relative vega-brand-text text-[1.4em] leading-none"
        aria-hidden="true"
      >
        V
      </span>
    </span>
  );
}
