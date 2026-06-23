"use client";

import type { ReactNode } from "react";
import MarketingAmbient from "@/components/marketing/MarketingAmbient";
import MarketingPageHeader from "@/components/marketing/MarketingPageHeader";
import { cn } from "@/lib/classNames";

type MarketingPageShellProps = {
  children: ReactNode;
  className?: string;
  showTicker?: boolean;
  ambientIntensity?: "soft" | "normal";
  headerBordered?: boolean;
};

export default function MarketingPageShell({
  children,
  className,
  showTicker = true,
  ambientIntensity = "normal",
  headerBordered = true,
}: MarketingPageShellProps) {
  return (
    <div
      className={cn(
        "vega-page relative flex min-h-[100dvh] w-full flex-col overflow-x-hidden",
        className,
      )}
    >
      <MarketingAmbient intensity={ambientIntensity} />
      <MarketingPageHeader bordered={headerBordered} showTicker={showTicker} />
      {children}
    </div>
  );
}
