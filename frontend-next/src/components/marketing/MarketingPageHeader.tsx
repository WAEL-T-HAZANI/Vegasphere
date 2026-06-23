"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import LocaleThemeControls from "@/components/auth/LocaleThemeControls";
import BrandMark from "@/components/brand/BrandMark";
import NewsTicker from "@/components/marketing/NewsTicker";
import { cn } from "@/lib/classNames";

type MarketingPageHeaderProps = {
  showTicker?: boolean;
  bordered?: boolean;
  className?: string;
};

export default function MarketingPageHeader({
  showTicker = true,
  bordered = false,
  className,
}: MarketingPageHeaderProps) {
  const { i18n } = useTranslation();
  const rtl = i18n.dir() === "rtl";

  return (
    <header
      dir={rtl ? "rtl" : "ltr"}
      className={cn(
        "sticky top-0 z-30 w-full min-w-0 shrink-0 overflow-x-hidden",
        "bg-[rgb(var(--vega-page-wash)/0.88)] backdrop-blur-md supports-[backdrop-filter]:bg-[rgb(var(--vega-page-wash)/0.78)]",
        bordered ? "border-b border-[rgb(var(--vega-brand)/0.35)]" : "",
        className,
      )}
    >
      <div className="flex w-full items-center justify-between gap-3 px-4 pt-3 pb-safe sm:gap-4 sm:px-6 sm:pt-4 md:px-8 lg:px-10">
        <Link
          href="/"
          className="group inline-flex shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--vega-brand)/0.45)] focus-visible:ring-offset-2 focus-visible:ring-offset-[rgb(var(--vega-paper))] rounded-2xl"
          aria-label="Vegasphere home"
        >
          <BrandMark
            variant="vega"
            className="h-10 w-10 transition-transform duration-300 group-hover:scale-105 sm:h-11 sm:w-11"
          />
        </Link>

        <LocaleThemeControls />
      </div>

      {showTicker ? (
        <div dir={rtl ? "rtl" : "ltr"}>
          <NewsTicker fullWidth className="mt-2 sm:mt-3" />
        </div>
      ) : null}
    </header>
  );
}
