"use client";

import BrandMark from "@/components/brand/BrandMark";
import { cn } from "@/lib/classNames";

type DashboardShellLoadingProps = {
  className?: string;
  /** Overlay on top of existing content during tab switches */
  overlay?: boolean;
};

function VegaLoaderMark() {
  return (
    <div className="text-center" role="status" aria-live="polite" aria-label="Loading">
      <BrandMark variant="vega" className="mx-auto mb-5 h-14 w-14" />
      <div className="mx-auto h-1 w-32 overflow-hidden rounded-full bg-[rgb(var(--vega-muted)/0.15)]">
        <div className="h-full w-1/2 animate-[vegaLoad_1.4s_ease-in-out_infinite] rounded-full vega-brand-bg" />
      </div>
    </div>
  );
}

/** Branded loader for logged-in routes (matches landing / auth / legal). */
export default function DashboardShellLoading({
  className,
  overlay = false,
}: DashboardShellLoadingProps) {
  if (overlay) {
    return (
      <div
        className={cn(
          "pointer-events-none absolute inset-0 z-30 flex items-center justify-center",
          className,
        )}
        aria-busy="true"
        aria-live="polite"
      >
        <VegaLoaderMark />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-1 items-center justify-center bg-canvas",
        /* Fill the main pane on first paint so the spinner never jumps from top → middle */
        "min-h-[calc(100svh-3.5rem)] md:min-h-[calc(100dvh)]",
        className,
      )}
      aria-busy="true"
      aria-live="polite"
    >
      <VegaLoaderMark />
    </div>
  );
}
