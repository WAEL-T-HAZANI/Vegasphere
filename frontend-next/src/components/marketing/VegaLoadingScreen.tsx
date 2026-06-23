"use client";

import BrandMark from "@/components/brand/BrandMark";
import { cn } from "@/lib/classNames";

type VegaLoadingScreenProps = {
  className?: string;
  /** Fill the viewport (route transitions). Default true. */
  fullScreen?: boolean;
};

export default function VegaLoadingScreen({
  className,
  fullScreen = true,
}: VegaLoadingScreenProps) {
  return (
    <div
      className={cn(
        "vega-page flex w-full items-center justify-center px-4",
        fullScreen
          ? "min-h-[100dvh]"
          : "min-h-0 flex-1 self-stretch",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label="Loading"
    >
      <div className="text-center">
        <BrandMark variant="vega" className="mx-auto mb-5 h-14 w-14" />

        <div className="mx-auto h-1 w-32 overflow-hidden rounded-full bg-[rgb(var(--vega-muted)/0.15)]">
          <div className="h-full w-1/2 animate-[vegaLoad_1.4s_ease-in-out_infinite] rounded-full vega-brand-bg" />
        </div>
      </div>
    </div>
  );
}
