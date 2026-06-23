"use client";

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/classNames";

type AuthFormHeaderProps = {
  kicker?: string;
  title: string;
  subtitle?: string;
  icon?: LucideIcon;
  centered?: boolean;
  compact?: boolean;
};

export default function AuthFormHeader({
  kicker,
  title,
  subtitle,
  icon: Icon,
  centered = false,
  compact = false,
}: AuthFormHeaderProps) {
  const iconEl = Icon ? (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border vega-hairline vega-glass">
      <Icon className="h-5 w-5 vega-brand-text" />
    </div>
  ) : null;

  const textEl = (
    <div className={cn("min-w-0 flex-1", centered && "w-full")}>
      {kicker ? (
        <p className="vega-latin-display text-[10px] font-bold vega-muted">
          {kicker}
        </p>
      ) : null}
      <h1
        className={cn(
          "font-light tracking-tight text-[rgb(var(--vega-ink))]",
          kicker ? (compact ? "mt-1.5" : "mt-2 sm:mt-3") : "",
          compact
            ? "text-xl min-[390px]:text-2xl sm:text-3xl"
            : "text-2xl min-[390px]:text-3xl sm:text-4xl",
        )}
      >
        {title}
      </h1>
      {subtitle ? (
        <p
          className={cn(
            "vega-muted vega-ar-copy leading-snug",
            compact ? "mt-1 text-xs" : "mt-2 text-sm leading-relaxed",
          )}
        >
          {subtitle}
        </p>
      ) : null}
    </div>
  );

  if (centered) {
    return (
      <div className="mb-8 flex flex-col items-center gap-4 text-center">
        {iconEl}
        {textEl}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-start justify-between gap-3 sm:gap-4",
        compact ? "mb-4" : "mb-6 sm:mb-8",
      )}
    >
      {textEl}
      {iconEl}
    </div>
  );
}
