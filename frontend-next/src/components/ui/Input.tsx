"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/classNames";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  /** Wrap input in bordered field with optional leading icon. */
  leadingIcon?: ReactNode;
  /** Trailing control inside the bordered field (e.g. password visibility). */
  trailingIcon?: ReactNode;
  inputClassName?: string;
  /** Marketing / auth palette */
  variant?: "default" | "vega";
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    leadingIcon,
    trailingIcon,
    className,
    inputClassName,
    variant = "default",
    ...props
  },
  ref,
) {
  const soloClass = variant === "vega" ? "vega-input" : "vs-input";
  const wrapClass =
    variant === "vega"
      ? "flex min-h-12 items-center gap-2 rounded-2xl border vega-hairline bg-[rgb(var(--vega-paper))] px-3 transition focus-within:border-[rgb(var(--vega-accent)/0.55)] focus-within:shadow-[0_0_0_3px_rgb(var(--vega-accent)/0.12)] sm:gap-3"
      : "flex min-h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 shadow-sm transition focus-within:border-slate-400 focus-within:ring-4 focus-within:ring-slate-200/70 dark:border-white/10 dark:bg-white/[0.04] dark:focus-within:border-white/25 dark:focus-within:ring-white/10 sm:gap-3";

  if (!leadingIcon && !trailingIcon) {
    return (
      <input
        ref={ref}
        className={cn(soloClass, className)}
        {...props}
      />
    );
  }

  return (
    <div
      className={cn(
        wrapClass,
        className,
      )}
    >
      {leadingIcon}
      <input
        ref={ref}
        className={cn(
          "min-w-0 flex-1 bg-transparent py-3 text-sm font-semibold outline-none",
          variant === "vega"
            ? "text-[rgb(var(--vega-ink))] placeholder:text-[rgb(var(--vega-muted)/0.55)]"
            : "text-slate-950 placeholder:text-slate-400 dark:text-white dark:placeholder:text-white/25",
          inputClassName,
        )}
        {...props}
      />
      {trailingIcon}
    </div>
  );
});
